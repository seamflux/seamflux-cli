import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { stdin } from 'node:process';
import type { SeamFluxClient } from '../api-client.js';
import { generateKeyPair } from '../utils/p256.js';
import { EnvManager } from '../utils/env.js';
import { getServiceInvokeLogDir } from '../config/toml.js';
import { PrivyClient } from '@privy-io/node';
import { printJson, printTable, printError } from '../formatter.js';

const PRIVY_APP_ID = 'client-WY6PoydSux91SM54VDWL6YNTe135xXGGQa185erD5JgbW';

interface CreateOptions {
  name?: string;
}

interface ListOptions {
  json: boolean;
}

interface SignOptions {
  name?: string;
  params?: string[];
  body?: string;
  file?: string;
  stdin?: boolean;
  useLog?: { service: string; method: string };
  map?: string[];
}

export async function cmdSignerCreate(
  client: SeamFluxClient,
  opts: CreateOptions
): Promise<void> {
  const name = opts.name || 'openclaw';
  const envVarName = `SEAMFLUX_SIGNER_${name.toUpperCase()}`;

  // 1. 检查是否已存在（OpenClaw 规则：不覆盖已有值）
  const envManager = new EnvManager();
  const exists = await envManager.exists(envVarName);
  if (exists) {
    throw new Error(
      `Signer ${name} already exists. ` +
      `Use 'seamflux signer list' to view existing signers, ` +
      `or remove the existing key from environment before creating a new one.`
    );
  }

  // 2. 生成密钥对
  const keyPair = generateKeyPair();

  // 3. 注册公钥
  const result = await client.registerSigner({
    name,
    publicKey: keyPair.publicKey,
  });

  const signerId = result.data?.signerId;
  if (!signerId) {
    throw new Error('Failed to register signer: no signerId returned');
  }

  // 4. 保存私钥到 OpenClaw 的 ~/.openclaw/.env
  await envManager.set(envVarName, keyPair.privateKey);

  // 5. 保存 signer 配置到 seamflux 配置
  await client.saveSignerConfig(name, { signerId, name });

  // 6. 输出结果
  console.log(`Signer created: ${name}`);
  console.log(`Signer ID: ${signerId}`);
  console.log(`Private key saved to: ${EnvManager.getOpenClawEnvPath()}`);
}

interface SignerConfig {
  signerId: string;
  name: string;
}

export async function cmdSignerList(
  client: SeamFluxClient,
  opts: ListOptions
): Promise<void> {
  // 1. 从配置读取所有 signers
  const signers = await client.listSigners();

  // 2. JSON 输出
  if (opts.json) {
    printJson(signers);
    return;
  }

  // 3. 表格输出
  if (signers.length === 0) {
    console.log('(no signers)');
    return;
  }

  printTable(
    signers.map((s) => ({
      name: s.name,
      signerId: s.signerId,
    }))
  );
}

/**
 * Resolve transaction payload from various input sources
 * Priority: stdin > file > body > useLog+map > transaction arg > params
 */
async function resolveTransaction(
  transactionArg: string | undefined,
  opts: SignOptions
): Promise<Record<string, unknown>> {
  // 1. Stdin mode (highest priority)
  if (opts.stdin) {
    const input = await readStdin();
    if (!input.trim()) {
      throw new Error('STDIN is empty. Provide JSON data via pipe or use -p/-b/-f options.');
    }
    try {
      return JSON.parse(input);
    } catch (err) {
      throw new Error(`Invalid JSON from STDIN: ${(err as Error).message}`);
    }
  }

  // 2. File mode
  if (opts.file) {
    try {
      const content = await readFile(opts.file, 'utf-8');
      return JSON.parse(content);
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
        throw new Error(`File not found: ${opts.file}`);
      }
      throw new Error(`Failed to parse JSON file: ${(err as Error).message}`);
    }
  }

  // 3. Body mode (JSON string)
  if (opts.body) {
    try {
      return JSON.parse(opts.body);
    } catch (err) {
      throw new Error(`Invalid JSON in --body: ${(err as Error).message}`);
    }
  }

  // 4. UseLog + Map mode: Read from previous service invoke log
  if (opts.useLog) {
    const logData = await readLatestLog(opts.useLog.service, opts.useLog.method);
    
    if (opts.map && opts.map.length > 0) {
      // Map specific fields from log to transaction payload
      const payload: Record<string, unknown> = {};
      for (const mapping of opts.map) {
        const eqIdx = mapping.indexOf('=');
        if (eqIdx === -1) {
          throw new Error(`Invalid map format: ${mapping}. Expected: source_field=target_field`);
        }
        const sourceField = mapping.slice(0, eqIdx);
        const targetField = mapping.slice(eqIdx + 1);
        const value = getNestedValue(logData, sourceField);
        if (value === undefined) {
          const availableFields = listAvailableFields(logData);
          throw new Error(
            `Field "${sourceField}" not found in log. Available fields: ${availableFields.join(', ')}`
          );
        }
        payload[targetField] = value;
      }
      return payload;
    }
    
    // If no map specified, use the entire log data.result.data as transaction payload
    const resultData = (logData.result as Record<string, unknown> | undefined)?.data;
    return (resultData as Record<string, unknown>) || {};
  }

  // 5. Transaction argument
  if (transactionArg) {
    try {
      return JSON.parse(transactionArg);
    } catch (err) {
      throw new Error(`Invalid transaction JSON: ${(err as Error).message}`);
    }
  }

  // 6. Params mode (key=value pairs)
  if (opts.params && opts.params.length > 0) {
    const payload: Record<string, unknown> = {};
    for (const p of opts.params) {
      const eqIdx = p.indexOf('=');
      if (eqIdx === -1) {
        throw new Error(`Invalid param format: ${p}. Expected: key=value`);
      }
      const key = p.slice(0, eqIdx);
      const value = p.slice(eqIdx + 1);
      payload[key] = parseTypedValue(value);
    }
    return payload;
  }

  throw new Error('Transaction data is required. Use positional arg, -b, -f, --stdin, --use-log, or -p options.');
}

/**
 * Read the latest log entry from service invoke log file
 */
async function readLatestLog(
  service: string,
  method: string
): Promise<Record<string, unknown>> {
  const logDir = getServiceInvokeLogDir();
  const logFile = join(logDir, `${service}-${method}.log`);

  try {
    const content = await readFile(logFile, 'utf-8');
    const lines = content.trim().split('\n').filter(Boolean);
    
    if (lines.length === 0) {
      throw new Error(`No log entries found for ${service}.${method}`);
    }

    // Get the last (latest) entry
    const latestLine = lines[lines.length - 1];
    return JSON.parse(latestLine);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new Error(
        `Log file not found for ${service}.${method}. Run "seamflux service invoke ${service} ${method}" first.`
      );
    }
    if (err instanceof Error && err.message.startsWith('No log entries')) {
      throw err;
    }
    throw new Error(`Failed to read log for ${service}.${method}: ${(err as Error).message}`);
  }
}

/**
 * Get nested value from object using dot notation (e.g., "result.data.price")
 */
function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  const keys = path.split('.');
  let current: unknown = obj;

  for (const key of keys) {
    if (current === null || current === undefined) {
      return undefined;
    }
    if (typeof current !== 'object') {
      return undefined;
    }
    current = (current as Record<string, unknown>)[key];
  }

  return current;
}

/**
 * List available fields from log data for error messages
 */
function listAvailableFields(obj: Record<string, unknown>, prefix = ''): string[] {
  const fields: string[] = [];

  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      fields.push(...listAvailableFields(value as Record<string, unknown>, fullKey));
    } else {
      fields.push(fullKey);
    }
  }

  return fields.slice(0, 10); // Limit to first 10 fields
}

/**
 * Read data from STDIN
 */
function readStdin(): Promise<string> {
  return new Promise((resolve, reject) => {
    if (stdin.isTTY) {
      reject(
        new Error(
          "No data piped to STDIN. Use pipe (e.g., echo '{}' | seamflux signer sign 0x... --stdin) or use -p/-b/-f options."
        )
      );
      return;
    }

    let data = '';
    stdin.setEncoding('utf-8');
    stdin.on('data', (chunk) => {
      data += chunk;
    });
    stdin.on('end', () => resolve(data));
    stdin.on('error', reject);
  });
}

/**
 * Parse string value to appropriate type
 */
function parseTypedValue(v: string): unknown {
  // Boolean
  if (v === 'true') return true;
  if (v === 'false') return false;

  // Null
  if (v === 'null') return null;

  // Integer
  if (/^-?\d+$/.test(v)) {
    const n = parseInt(v, 10);
    if (!isNaN(n)) return n;
  }

  // Float
  if (/^-?\d+\.\d+$/.test(v)) {
    const n = parseFloat(v);
    if (!isNaN(n)) return n;
  }

  // Hex string (0x...)
  if (/^0x[0-9a-fA-F]+$/.test(v)) {
    return v;
  }

  // String (default)
  return v;
}

export async function cmdSignerSign(
  client: SeamFluxClient,
  walletAddress: string,
  transactionArg: string | undefined,
  opts: SignOptions
): Promise<void> {
  const name = opts.name || 'openclaw';
  const envVarName = `SEAMFLUX_SIGNER_${name.toUpperCase()}`;

  // 1. 读取私钥
  const envManager = new EnvManager();
  const privateKey = await envManager.get(envVarName);
  if (!privateKey) {
    throw new Error(`Private key not found for signer: ${name}. Run 'seamflux signer create ${name}' first.`);
  }

  // 2. 解析交易（支持多种输入方式）
  const txPayload = await resolveTransaction(transactionArg, opts);

  // 3. 获取 walletId（优先从本地缓存获取，address 和 walletId 一一对应且不变）
  let walletId = await client.getWalletId(walletAddress);
  
  if (!walletId) {
    // 本地缓存未命中，调用 API 获取
    try {
      const result = await client.requestWalletId(walletAddress);
      walletId = result.data?.walletId;
      
      if (!walletId) {
        throw new Error(`API returned success but walletId is missing for address: ${walletAddress}`);
      }
      
      // 保存到本地缓存（address 和 walletId 一一对应且不变，可永久缓存）
      await client.saveWalletMapping(walletAddress, walletId);
    } catch (error) {
      if (error instanceof Error && error.message.includes('walletId')) {
        throw error;
      }
      throw new Error(`Failed to get walletId for address ${walletAddress}: ${(error as Error).message}`);
    }
  }

  // 4. 使用 Privy 签名
  const privy = new PrivyClient({
    appId: PRIVY_APP_ID,
    appSecret: ''
  });

  const result = await privy
    .wallets()
    .ethereum()
    .signTransaction(walletId, {
      // @ts-expect-error - Privy types may not match exactly
      transaction: txPayload,
      authorizationPrivateKeys: [privateKey],
    });

  // 5. 输出签名结果
  console.log(JSON.stringify(result));
}
