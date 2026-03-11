import type { SeamFluxClient } from "../api-client.js";
import { printJson, printTable, printKv, printSuccess, printError, truncate } from "../formatter.js";

export async function cmdWorkflowList(
  client: SeamFluxClient,
  opts: { json: boolean }
): Promise<void> {
  const result = await client.listWorkflows({ scope: "my" });
  const items = (result.data || []) as Record<string, unknown>[];

  if (opts.json) {
    printJson(items);
    return;
  }

  if (items.length === 0) {
    process.stdout.write("(no workflows)\n");
    return;
  }

  printTable(
    items.map((w) => ({
      id: truncate(String(w["id"] || ""), 20),
      title: truncate(String(w["title"] || ""), 30),
      status: w["status"] || "-",
      created: w["createdAt"]
        ? new Date(String(w["createdAt"])).toLocaleDateString()
        : "-",
    }))
  );
}

export async function cmdWorkflowGet(
  client: SeamFluxClient,
  opts: { id: string; json: boolean }
): Promise<void> {
  const result = await client.getWorkflow(opts.id);
  const data = result.data as Record<string, unknown> | undefined;

  if (!data) {
    printError("Workflow not found");
    return;
  }

  if (opts.json) {
    printJson(data);
    return;
  }

  printKv({
    ID: data["id"],
    Title: data["title"],
    Status: data["status"],
    Description: data["description"] || "-",
    "Created At": data["createdAt"]
      ? new Date(String(data["createdAt"])).toLocaleString()
      : "-",
    "Updated At": data["updatedAt"]
      ? new Date(String(data["updatedAt"])).toLocaleString()
      : "-",
  });
}

export async function cmdWorkflowSearch(
  client: SeamFluxClient,
  opts: { q: string; scope?: string; json: boolean }
): Promise<void> {
  const result = await client.listWorkflows({
    scope: opts.scope || "templates",
    q: opts.q,
  });
  const items = (result.data || []) as Record<string, unknown>[];

  if (opts.json) {
    printJson(items);
    return;
  }

  if (items.length === 0) {
    process.stdout.write(`(no workflows found for "${opts.q}")\n`);
    return;
  }

  printTable(
    items.map((w) => ({
      id: truncate(String(w["id"] || ""), 20),
      title: truncate(String(w["title"] || ""), 30),
      author: w["username"] || "-",
    }))
  );
}

export async function cmdWorkflowDelete(
  client: SeamFluxClient,
  opts: { id: string; json: boolean }
): Promise<void> {
  await client.deleteWorkflow(opts.id);

  if (opts.json) {
    printJson({ code: 0, message: "Workflow deleted", data: { id: opts.id } });
    return;
  }

  printSuccess(`Workflow "${opts.id}" deleted`);
}

export async function cmdWorkflowExecute(
  client: SeamFluxClient,
  opts: { id: string; config?: string; json: boolean }
): Promise<void> {
  let config: Record<string, unknown> | undefined;
  if (opts.config) {
    try {
      config = JSON.parse(opts.config);
    } catch {
      printError("Invalid JSON in config");
      return;
    }
  }

  const result = await client.executeWorkflow(opts.id, config);
  const executionId = (result.data as { executionId?: string })?.executionId;

  if (opts.json) {
    printJson({
      code: result.code,
      message: result.message,
      data: { executionId, workflowId: opts.id },
    });
    return;
  }

  if (executionId) {
    printSuccess(`Execution started: ${executionId}`);
    process.stdout.write(`View logs: seamflux execution logs --id ${executionId}\n`);
  } else {
    printSuccess("Execution started");
  }
}

export async function cmdWorkflowGenerate(
  client: SeamFluxClient,
  opts: { requirement: string; json: boolean }
): Promise<void> {
  const result = await client.generateWorkflow(opts.requirement);

  if (opts.json) {
    printJson(result.data);
    return;
  }

  const data = result.data as Record<string, unknown> | undefined;

  if (!data?.success) {
    const reason = (data?.reason as string) || "Unknown error";
    printError(`Generation failed: ${reason}`);
    return;
  }

  const workflowId = data.workflowId as string;
  const title = data.title as string;
  const summary = data.summary as string;

  printSuccess("Workflow generated successfully");
  process.stdout.write(`\n`);
  process.stdout.write(`  Workflow ID:  ${workflowId}\n`);
  process.stdout.write(`  Title:        ${title}\n`);
  if (summary) {
    process.stdout.write(`  Summary:      ${summary}\n`);
  }
  process.stdout.write(`\n`);
  process.stdout.write(`Execute it with: seamflux workflow execute --id ${workflowId}\n`);
}
