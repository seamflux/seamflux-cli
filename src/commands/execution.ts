import type { SeamFluxClient } from "../api-client.js";
import { printJson, printTable, printKv, printSuccess, printError, truncate } from "../formatter.js";

export async function cmdExecutionList(
  client: SeamFluxClient,
  opts: { json: boolean }
): Promise<void> {
  const result = await client.listExecutions();
  const items = (result.data || []) as Record<string, unknown>[];

  if (opts.json) {
    printJson(items);
    return;
  }

  if (items.length === 0) {
    process.stdout.write("(no executions)\n");
    return;
  }

  printTable(
    items.map((e) => ({
      id: truncate(String(e["id"] || ""), 20),
      title: truncate(String(e["title"] || ""), 25),
      status: e["status"] || "-",
      runEnv: e["runEnv"] || "-",
      created: e["createdAt"]
        ? new Date(String(e["createdAt"])).toLocaleDateString()
        : "-",
    }))
  );
}

export async function cmdExecutionRun(
  client: SeamFluxClient,
  opts: { id: string; config: string; json: boolean }
): Promise<void> {
  let config: Record<string, unknown>;
  try {
    config = JSON.parse(opts.config);
  } catch {
    printError("Invalid JSON in config. Expected: '{\"key\":\"value\"}'");
    return;
  }

  const result = await client.runExecution(opts.id, config);

  if (opts.json) {
    printJson({
      code: result.code,
      message: result.message,
      data: { executionId: opts.id },
    });
    return;
  }

  printSuccess(`Execution "${opts.id}" started`);
  process.stdout.write(`View logs: seamflux execution logs --id ${opts.id}\n`);
}

export async function cmdExecutionLogs(
  client: SeamFluxClient,
  opts: {
    executionId?: string;
    limit?: string;
    afterSeq?: string;
    since?: string;
    until?: string;
    level?: string;
    serviceName?: string;
    nodemethod?: string;
    json: boolean;
  }
): Promise<void> {
  const result = await client.getExecutionLogs({
    executionId: opts.executionId,
    limit: opts.limit,
    afterSeq: opts.afterSeq,
    since: opts.since,
    until: opts.until,
    level: opts.level,
    serviceName: opts.serviceName,
    nodemethod: opts.nodemethod,
  });

  const data = result.data as Record<string, unknown> | undefined;
  const logs = (data?.["results"] || []) as Record<string, unknown>[];

  if (opts.json) {
    printJson(data || result);
    return;
  }

  if (logs.length === 0) {
    process.stdout.write("(no logs)\n");
    return;
  }

  // Print logs in a readable format
  for (const log of logs) {
    const ts = log["ts"] || log["timestamp"];
    const level = log["level"] || "INFO";
    const message = log["message"] || log["msg"] || "";
    const node = log["node"] || log["serviceName"] || log["nodename"] || "";

    const timeStr = ts
      ? new Date(Number(ts) || String(ts)).toLocaleTimeString()
      : "-";

    process.stdout.write(`[${timeStr}] ${level.padEnd(5)} ${node ? `(${node}) ` : ""}${message}\n`);
  }

  if (opts.executionId) {
    process.stdout.write(`\nView execution: https://app.seamflux.ai/execution/${opts.executionId}\n`);
  }
}

export async function cmdExecutionDelete(
  client: SeamFluxClient,
  opts: { id: string; json: boolean }
): Promise<void> {
  await client.deleteExecution(opts.id);

  if (opts.json) {
    printJson({ code: 0, message: "Execution deleted", data: { id: opts.id } });
    return;
  }

  printSuccess(`Execution "${opts.id}" deleted`);
}
