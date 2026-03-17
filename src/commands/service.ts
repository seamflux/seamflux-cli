import { mkdir, writeFile, readFile } from "node:fs/promises";
import { join } from "node:path";
import { stdin } from "node:process";
import type { SeamFluxClient } from "../api-client.js";
import { getServiceInvokeLogDir } from "../config/toml.js";
import { printJson, printTable, printKv, printSuccess, printError } from "../formatter.js";

interface InvokeOptions {
  params?: string[];
  body?: string;
  file?: string;
  stdin?: boolean;
  json: boolean;
  useLog?: { service: string; method: string };
  map?: string[];
}

export async function cmdServiceList(
  client: SeamFluxClient,
  opts: { json: boolean }
): Promise<void> {
  const result = await client.listServices();
  const items = (result.data || []) as Record<string, unknown>[];

  if (opts.json) {
    printJson(items);
    return;
  }

  if (items.length === 0) {
    process.stdout.write("(no services)\n");
    return;
  }

  printTable(
    items.map((s) => ({
      name: s["name"] || "-",
      title: s["title"] || "-",
      description: (s["description"] as string)?.slice(0, 50) + "..." || "-",
    }))
  );
}

export async function cmdServiceQuery(
  client: SeamFluxClient,
  opts: { query: string; k?: string; service?: string; json: boolean }
): Promise<void> {
  let where: Record<string, unknown> | undefined;
  if (opts.service) {
    where = { service: opts.service };
  }
  const result = await client.queryServices(
    opts.query,
    opts.k ? parseInt(opts.k, 10) : undefined,
    where
  );

  if (opts.json) {
    printJson(result.data);
    return;
  }

  const data = result.data as Record<string, unknown> | undefined;
  const items = (data?.["results"] || data || []) as Record<string, unknown>[];

  if (items.length === 0) {
    process.stdout.write(`(no services found for "${opts.query}")\n`);
    return;
  }

  printTable(
    items.map((s) => ({
      name: s["name"] || s["node"] || "-",
      score: s["score"] ? String(s["score"]).slice(0, 4) : "-",
      description: (s["description"] as string)?.slice(0, 40) + "..." || "-",
    }))
  );
}

export async function cmdServiceInvoke(
  client: SeamFluxClient,
  service: string,
  method: string,
  opts: InvokeOptions
): Promise<void> {
  const payload = await resolvePayload(opts);
  const result = await client.invokeService(service, method, payload);

  // Output raw JSON for piping (compact format, no indentation)
  const data = result.data ?? null;
  process.stdout.write(JSON.stringify(data) + "\n");

  // Log to file
  await logServiceInvoke(service, method, result);
}

/**
 * Log service invoke result to file
 */
async function logServiceInvoke(
  service: string,
  method: string,
  result: { code?: number; message?: string; data?: unknown }
): Promise<void> {
  const logDir = getServiceInvokeLogDir();
  
  // Ensure log directory exists
  try {
    await mkdir(logDir, { recursive: true });
  } catch {
    // ignore
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const logFile = join(logDir, `${service}-${method}.log`);

  const logEntry = {
    createdAt: new Date().toISOString(),
    service,
    method,
    result,
  };

  // Append to log file with newline separator
  const logLine = JSON.stringify(logEntry) + "\n";
  try {
    await writeFile(logFile, logLine, { flag: "a" });
  } catch {
    // Silently ignore log write errors to not disrupt user workflow
  }
}

/**
 * Resolve payload from various input sources
 * Priority: stdin > file > body > useLog+map > params
 */
async function resolvePayload(opts: InvokeOptions): Promise<Record<string, unknown>> {
  // 1. Stdin mode (highest priority)
  if (opts.stdin) {
    const input = await readStdin();
    if (!input.trim()) {
      throw new Error("STDIN is empty. Provide JSON data via pipe or use -p/-b/-f options.");
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
      const content = await readFile(opts.file, "utf-8");
      return JSON.parse(content);
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") {
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
      // Map specific fields from log to payload
      const payload: Record<string, unknown> = {};
      for (const mapping of opts.map) {
        const eqIdx = mapping.indexOf("=");
        if (eqIdx === -1) {
          throw new Error(`Invalid map format: ${mapping}. Expected: source_field=target_param`);
        }
        const sourceField = mapping.slice(0, eqIdx);
        const targetParam = mapping.slice(eqIdx + 1);
        const value = getNestedValue(logData, sourceField);
        if (value === undefined) {
          const availableFields = listAvailableFields(logData);
          throw new Error(
            `Field "${sourceField}" not found in log. Available fields: ${availableFields.join(", ")}`
          );
        }
        payload[targetParam] = value;
      }
      return payload;
    }
    
    // If no map specified, use the entire log data.result.data as payload
    const resultData = (logData.result as Record<string, unknown> | undefined)?.data;
    return (resultData as Record<string, unknown>) || {};
  }

  // 5. Params mode (key=value pairs, lowest priority)
  if (opts.params && opts.params.length > 0) {
    const payload: Record<string, unknown> = {};
    for (const p of opts.params) {
      const eqIdx = p.indexOf("=");
      if (eqIdx === -1) {
        throw new Error(`Invalid param format: ${p}. Expected: key=value`);
      }
      const key = p.slice(0, eqIdx);
      const value = p.slice(eqIdx + 1);
      payload[key] = parseTypedValue(value);
    }
    return payload;
  }

  // Empty payload
  return {};
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
    const content = await readFile(logFile, "utf-8");
    const lines = content.trim().split("\n").filter(Boolean);
    
    if (lines.length === 0) {
      throw new Error(`No log entries found for ${service}.${method}`);
    }

    // Get the last (latest) entry
    const latestLine = lines[lines.length - 1];
    return JSON.parse(latestLine);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      throw new Error(
        `Log file not found for ${service}.${method}. Run "seamflux service invoke ${service} ${method}" first.`
      );
    }
    if (err instanceof Error && err.message.startsWith("No log entries")) {
      throw err;
    }
    throw new Error(`Failed to read log for ${service}.${method}: ${(err as Error).message}`);
  }
}

/**
 * Get nested value from object using dot notation (e.g., "result.data.price")
 */
function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  const keys = path.split(".");
  let current: unknown = obj;

  for (const key of keys) {
    if (current === null || current === undefined) {
      return undefined;
    }
    if (typeof current !== "object") {
      return undefined;
    }
    current = (current as Record<string, unknown>)[key];
  }

  return current;
}

/**
 * List available fields from log data for error messages
 */
function listAvailableFields(obj: Record<string, unknown>, prefix = ""): string[] {
  const fields: string[] = [];

  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (value !== null && typeof value === "object" && !Array.isArray(value)) {
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
          "No data piped to STDIN. Use pipe (e.g., echo '{}' | seamflux ... --stdin) or use -p/-b/-f options."
        )
      );
      return;
    }

    let data = "";
    stdin.setEncoding("utf-8");
    stdin.on("data", (chunk) => {
      data += chunk;
    });
    stdin.on("end", () => resolve(data));
    stdin.on("error", reject);
  });
}

/**
 * Parse string value to appropriate type
 */
function parseTypedValue(v: string): unknown {
  // Boolean
  if (v === "true") return true;
  if (v === "false") return false;

  // Null
  if (v === "null") return null;

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

  // String (default)
  return v;
}
