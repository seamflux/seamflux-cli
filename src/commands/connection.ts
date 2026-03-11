import type { SeamFluxClient } from "../api-client.js";
import { printJson } from "../formatter.js";

export async function cmdConnectionList(
  client: SeamFluxClient,
  opts: { credentialType?: string; json: boolean }
): Promise<void> {
  const result = await client.listConnections(opts.credentialType);
  const items = (result.data || []) as Record<string, unknown>[];

  if (opts.json) {
    printJson(items);
    return;
  }

  // If looking for a specific credential type
  if (opts.credentialType) {
    if (items.length === 0) {
      process.stdout.write(`No connection found for credential type "${opts.credentialType}".\n`);
      return;
    }

    const conn = items[0];
    process.stdout.write(`\nConnection Details:\n`);
    process.stdout.write(`  Name:            ${conn["name"] || "-"}\n`);
    process.stdout.write(`  Remark:          ${conn["remark"] || "-"}\n`);
    process.stdout.write(`  Credential Type: ${conn["type"] || opts.credentialType}\n`);
    process.stdout.write(`\n`);
    return;
  }

  // List all connections
  if (items.length === 0) {
    process.stdout.write("No connections found.\n");
    return;
  }

  process.stdout.write(`\nFound ${items.length} connection(s):\n\n`);
  
  for (const conn of items) {
    const name = conn["name"] || "-";
    const type = conn["type"] || "-";
    const remark = conn["remark"] || "-";
    
    process.stdout.write(`  Name:            ${name}\n`);
    process.stdout.write(`  Credential Type: ${type}\n`);
    process.stdout.write(`  Remark:          ${remark}\n`);
    process.stdout.write(`\n`);
  }
}
