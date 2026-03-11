import { readFile } from "node:fs/promises";
import { stdin } from "node:process";
import type { SeamFluxClient } from "../api-client.js";
import { printJson, printTable, printKv, printSuccess, printError } from "../formatter.js";

interface InvokeOptions {
  params?: string[];
  body?: string;
  file?: string;
  stdin?: boolean;
  json: boolean;
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

  if (opts.json) {
    printJson(result.data);
    return;
  }

  if (result.data && typeof result.data === "object") {
    printKv(result.data as Record<string, unknown>);
  } else {
    process.stdout.write(String(result.data ?? "(no data)") + "\n");
  }
}

/**
 * Resolve payload from various input sources
 * Priority: stdin > file > body > params
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

  // 4. Params mode (key=value pairs, lowest priority)
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
