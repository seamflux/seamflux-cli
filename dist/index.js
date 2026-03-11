#!/usr/bin/env node
import {
  loadConfig
} from "./chunk-IIC22JKA.js";
import {
  getConfigPath,
  maskSecret,
  readConfig,
  writeConfig
} from "./chunk-XLR6OQNJ.js";

// src/index.ts
import { createRequire } from "module";

// src/parser.ts
import { parseArgs } from "util";
var CLI_OPTIONS = {
  // Global options
  profile: { type: "string" },
  "api-key": { type: "string" },
  "base-url": { type: "string" },
  json: { type: "boolean", default: false },
  help: { type: "boolean", short: "h", default: false },
  version: { type: "boolean", short: "v", default: false },
  // Workflow options
  id: { type: "string" },
  scope: { type: "string" },
  q: { type: "string" },
  username: { type: "string" },
  slug: { type: "string" },
  locale: { type: "string" },
  tags: { type: "string" },
  sort: { type: "string" },
  "related-to": { type: "string" },
  // Execution options
  limit: { type: "string" },
  "after-seq": { type: "string" },
  since: { type: "string" },
  until: { type: "string" },
  level: { type: "string" },
  "service-name": { type: "string" },
  nodemethod: { type: "string" },
  // Service options
  param: { type: "string", multiple: true },
  body: { type: "string" },
  file: { type: "string" },
  stdin: { type: "boolean", default: false },
  interactive: { type: "boolean", short: "i", default: false },
  service: { type: "string" },
  // Config options
  force: { type: "boolean", default: false },
  lang: { type: "string" },
  // Workflow generate options
  requirement: { type: "string" }
};
function parseCli(argv) {
  const negated = /* @__PURE__ */ new Set();
  const filtered = argv.filter((arg) => {
    if (arg.startsWith("--no-")) {
      const key = arg.slice(5);
      if (key in CLI_OPTIONS && CLI_OPTIONS[key].type === "boolean") {
        negated.add(key);
        return false;
      }
    }
    return true;
  });
  const { values, positionals } = parseArgs({
    args: filtered,
    options: CLI_OPTIONS,
    allowPositionals: true
  });
  for (const key of negated) {
    values[key] = false;
  }
  const mappedValues = { ...values };
  if (values["api-key"]) {
    mappedValues.apiKey = values["api-key"];
    delete mappedValues["api-key"];
  }
  if (values["base-url"]) {
    mappedValues.baseUrl = values["base-url"];
    delete mappedValues["base-url"];
  }
  if (values["after-seq"]) {
    mappedValues.afterSeq = values["after-seq"];
    delete mappedValues["after-seq"];
  }
  if (values["related-to"]) {
    mappedValues.relatedTo = values["related-to"];
    delete mappedValues["related-to"];
  }
  if (values["service-name"]) {
    mappedValues.serviceName = values["service-name"];
    delete mappedValues["service-name"];
  }
  return { values: mappedValues, positionals };
}

// src/help.ts
var HELP_TREE = {
  workflow: {
    description: "Manage workflows (list, get, search, delete, execute, generate)",
    commands: {
      list: {
        usage: "seamflux workflow list",
        description: "List your workflows"
      },
      get: {
        usage: "seamflux workflow get --id <workflow-id>",
        description: "Get details of a specific workflow"
      },
      search: {
        usage: "seamflux workflow search --q <query> [--scope templates|market]",
        description: "Search workflows by query"
      },
      delete: {
        usage: "seamflux workflow delete --id <workflow-id>",
        description: "Delete a workflow"
      },
      execute: {
        usage: "seamflux workflow execute --id <workflow-id> [--config '<json>']",
        description: "Execute a workflow and create a new execution"
      },
      generate: {
        usage: "seamflux workflow generate --requirement '<description>'",
        description: "Generate a new workflow using AI"
      }
    }
  },
  execution: {
    description: "Manage executions (list, run, logs, delete)",
    commands: {
      list: {
        usage: "seamflux execution list",
        description: "List your executions"
      },
      run: {
        usage: "seamflux execution run --id <execution-id> --config '<json>'",
        description: "Run an existing execution with config"
      },
      logs: {
        usage: "seamflux execution logs [--id <execution-id>] [--limit <n>]",
        description: "Get execution logs"
      },
      delete: {
        usage: "seamflux execution delete --id <execution-id>",
        description: "Delete an execution"
      }
    }
  },
  service: {
    description: "Discover and invoke services",
    commands: {
      list: {
        usage: "seamflux service list",
        description: "List all available services"
      },
      query: {
        usage: "seamflux service query --q <query> [--service <name>] [--k <n>]",
        description: "Search services by description, optionally filter by service name"
      },
      invoke: {
        usage: "seamflux service invoke <node> <method> [options]\n    Options:\n      -p, --param <k=v>    Simple parameters (AI-friendly)\n      -b, --body '<json>'  JSON request body\n      -f, --file <path>    Read params from JSON file\n      --stdin              Read params from STDIN (pipe)",
        description: "Invoke a service method"
      }
    }
  },
  config: {
    description: "Manage CLI configuration",
    commands: {
      init: {
        usage: "seamflux config init [--lang zh]",
        description: "Initialize configuration interactively"
      },
      show: {
        usage: "seamflux config show",
        description: "Show current configuration"
      },
      set: {
        usage: "seamflux config set <key> <value>",
        description: "Set a configuration value"
      },
      use: {
        usage: "seamflux config use <profile-name>",
        description: "Switch to a profile"
      }
    }
  },
  connection: {
    description: "Manage connections (credentials)",
    commands: {
      list: {
        usage: "seamflux connection list [credential-type]",
        description: "List all connections, or show details for a specific credential type"
      }
    }
  }
};
function printGlobalHelp() {
  const lines = [
    "",
    "Usage: seamflux [options] <module> <command> [args...]",
    "",
    "Global Options:",
    "  --api-key <key>      API Key (or set SEAMFLUX_API_KEY env)",
    "  --base-url <url>     API base URL (default: https://app.seamflux.ai)",
    "  --profile <name>     Use specific profile from config",
    "  --json               Output raw JSON",
    "  -h, --help           Show help",
    "  -v, --version        Show version",
    "",
    "Modules:"
  ];
  const colWidth = 12;
  for (const [name, group] of Object.entries(HELP_TREE)) {
    lines.push(`  ${name.padEnd(colWidth)}${group.description}`);
  }
  lines.push(
    "",
    "Examples:",
    "  seamflux workflow list",
    "  seamflux workflow execute --id wf_xxx",
    "  seamflux service invoke binance getTicker -p symbol=BTC/USDT",
    "  seamflux execution logs --id exec_xxx",
    "",
    `Config: ${getConfigPath()}`,
    ""
  );
  process.stdout.write(lines.join("\n"));
}
function printModuleHelp(moduleName) {
  const group = HELP_TREE[moduleName];
  if (!group) {
    process.stderr.write(`Unknown module: ${moduleName}
`);
    process.exitCode = 1;
    return;
  }
  const lines = [
    "",
    `Usage: seamflux ${moduleName} <command> [args...]`,
    "",
    `${group.description}.`,
    "",
    "Commands:"
  ];
  if (group.commands) {
    const names = Object.keys(group.commands);
    const colWidth = Math.max(...names.map((n) => n.length)) + 4;
    for (const [name, cmd] of Object.entries(group.commands)) {
      lines.push(`  ${name.padEnd(colWidth)}${cmd.description}`);
      const usageLines = cmd.usage.split("\n");
      lines.push(`  ${" ".repeat(colWidth)}Usage: ${usageLines[0]}`);
      for (const extra of usageLines.slice(1)) {
        lines.push(`  ${" ".repeat(colWidth)}       ${extra.trimStart()}`);
      }
      lines.push("");
    }
  }
  process.stdout.write(lines.join("\n"));
}
function printHelp(...path) {
  const [moduleName] = path;
  if (!moduleName) {
    printGlobalHelp();
  } else {
    printModuleHelp(moduleName);
  }
}

// src/api-client.ts
var ApiError = class extends Error {
  status;
  code;
  traceId;
  constructor(message, status, code, traceId) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.traceId = traceId;
  }
};
var SeamFluxClient = class {
  baseURL;
  apiKey;
  constructor(config) {
    this.baseURL = config.baseURL.replace(/\/$/, "");
    this.apiKey = config.apiKey;
  }
  async request(method, path, body, query) {
    const url = new URL(path, this.baseURL);
    if (query) {
      for (const [key, value] of Object.entries(query)) {
        if (value !== void 0 && value !== null) {
          url.searchParams.set(key, value);
        }
      }
    }
    const headers = {
      "Content-Type": "application/json",
      "X-API-Key": this.apiKey
    };
    const response = await fetch(url.toString(), {
      method,
      headers,
      body: body ? JSON.stringify(body) : void 0
    });
    const data = await response.json().catch(() => null);
    if (!response.ok) {
      throw new ApiError(
        data?.message || `HTTP ${response.status}`,
        response.status,
        data?.code || -1,
        response.headers.get("x-trace-id") || void 0
      );
    }
    if (data?.code !== 0) {
      throw new ApiError(
        data?.message || "API error",
        response.status,
        data?.code || -1,
        response.headers.get("x-trace-id") || void 0
      );
    }
    return data;
  }
  // Workflow APIs
  async listWorkflows(params) {
    return this.request("GET", "/api/workflow", void 0, {
      scope: params?.scope || "my",
      id: params?.id,
      sort: params?.sort,
      q: params?.q
    });
  }
  async getWorkflow(id) {
    return this.request("GET", "/api/workflow", void 0, {
      scope: "by_id",
      id
    });
  }
  async deleteWorkflow(id) {
    return this.request("DELETE", "/api/workflow", void 0, { id });
  }
  async executeWorkflow(id, config) {
    return this.request("POST", `/api/workflow/${id}/execute`, { config });
  }
  async generateWorkflow(requirement) {
    return this.request("POST", "/api/workflow/generate", { requirement });
  }
  // Execution APIs
  async listExecutions() {
    return this.request("GET", "/api/execution");
  }
  async runExecution(id, config) {
    return this.request("POST", `/api/execution/${id}/execute`, { config });
  }
  async getExecutionLogs(params) {
    return this.request("GET", "/api/execution/logs", void 0, {
      executionId: params.executionId,
      limit: params.limit,
      afterSeq: params.afterSeq,
      since: params.since,
      until: params.until,
      level: params.level,
      nodename: params.serviceName,
      nodemethod: params.nodemethod
    });
  }
  async deleteExecution(id) {
    return this.request("DELETE", "/api/execution", { id });
  }
  // Service APIs
  async listServices() {
    return this.request("GET", "/api/service/list");
  }
  async queryServices(query, k, where) {
    const body = { query, k };
    if (where !== void 0) {
      body.where = where;
    }
    return this.request("POST", "/api/service/query", body);
  }
  async invokeService(serviceName, methodName, params) {
    return this.request("POST", "/api/service/invoke", {
      serviceName,
      methodName,
      ...params
    });
  }
  // Connection APIs
  async listConnections(credentialType) {
    return this.request("GET", "/api/connections", void 0, {
      credentialType
    });
  }
};

// src/formatter.ts
function printJson(data) {
  process.stdout.write(JSON.stringify(data, null, 2) + "\n");
}
function printTable(rows) {
  if (rows.length === 0) {
    process.stdout.write("(no data)\n");
    return;
  }
  const keys = Object.keys(rows[0]);
  const widths = keys.map(
    (k) => Math.max(k.length, ...rows.map((r) => String(r[k] ?? "").length))
  );
  const header = keys.map((k, i) => k.padEnd(widths[i])).join("  ");
  const divider = widths.map((w) => "-".repeat(w)).join("  ");
  process.stdout.write(header + "\n" + divider + "\n");
  for (const row of rows) {
    process.stdout.write(
      keys.map((k, i) => String(row[k] ?? "").padEnd(widths[i])).join("  ") + "\n"
    );
  }
}
function printKv(obj, indent = 0) {
  const pad = " ".repeat(indent);
  for (const [k, v] of Object.entries(obj)) {
    if (v !== null && typeof v === "object" && !Array.isArray(v)) {
      process.stdout.write(`${pad}${k}:
`);
      printKv(v, indent + 2);
    } else {
      process.stdout.write(`${pad}${k.padEnd(20 - indent)}  ${v}
`);
    }
  }
}
function printSuccess(message) {
  process.stdout.write(`\u2713 ${message}
`);
}
function printError(message, exitCode = 1) {
  process.stderr.write(`\u2717 Error: ${message}
`);
  if (exitCode > 0) {
    process.exitCode = exitCode;
  }
}
function truncate(str, maxLength) {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - 3) + "...";
}

// src/commands/config.ts
import { createInterface } from "readline";
var messages = {
  en: {
    title: "SeamFlux CLI \u2014 Configuration Wizard",
    profilePrompt: (name) => `Profile name (default: ${name}): `,
    profileExists: (name) => `Profile "${name}" already exists. Overwrite? (y/N) `,
    cancelled: "Cancelled.",
    emptyApiKey: "Error: API Key cannot be empty",
    saved: (p) => `
Config saved to ${p}
`,
    defaultProfile: (name) => `Default profile set to: ${name}
`,
    usage: "Usage: seamflux workflow list\n",
    noProfiles: "No profiles found. Run: seamflux config init\n",
    enterApiKey: "API Key: ",
    enterBaseUrl: (url) => `Base URL (default: ${url}): `
  },
  zh: {
    title: "SeamFlux CLI \u2014 \u914D\u7F6E\u5411\u5BFC",
    profilePrompt: (name) => `Profile \u540D\u79F0 (\u9ED8\u8BA4: ${name}): `,
    profileExists: (name) => `Profile "${name}" \u5DF2\u5B58\u5728\uFF0C\u662F\u5426\u8986\u76D6\uFF1F(y/N) `,
    cancelled: "\u5DF2\u53D6\u6D88\u3002",
    emptyApiKey: "\u9519\u8BEF: API Key \u4E0D\u80FD\u4E3A\u7A7A",
    saved: (p) => `
\u914D\u7F6E\u5DF2\u4FDD\u5B58\u5230 ${p}
`,
    defaultProfile: (name) => `\u5DF2\u8BBE\u4E3A\u9ED8\u8BA4 profile: ${name}
`,
    usage: "\u4F7F\u7528\u65B9\u5F0F: seamflux workflow list\n",
    noProfiles: "\u672A\u627E\u5230\u914D\u7F6E\u6587\u4EF6\u3002\u8BF7\u8FD0\u884C: seamflux config init\n",
    enterApiKey: "API Key: ",
    enterBaseUrl: (url) => `Base URL (\u9ED8\u8BA4: ${url}): `
  }
};
function prompt(rl, question) {
  return new Promise((resolve) => rl.question(question, resolve));
}
async function cmdConfigShow(json) {
  const config = await readConfig();
  const configPath = getConfigPath();
  if (json) {
    printJson(config);
    return;
  }
  process.stdout.write(`Config: ${configPath}

`);
  process.stdout.write(`default_profile: ${config.default_profile ?? "(not set)"}

`);
  const entries = Object.entries(config.profiles);
  if (entries.length === 0) {
    process.stdout.write("(no profiles)\n");
    return;
  }
  for (const [name, profile] of entries) {
    process.stdout.write(`[${name}]
`);
    printKv({
      api_key: maskSecret(profile.api_key),
      base_url: profile.base_url ?? "(default)"
    }, 2);
    process.stdout.write("\n");
  }
}
async function cmdConfigInit(lang = "en") {
  const t = messages[lang];
  process.stdout.write(`${t.title}

`);
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    const config = await readConfig();
    const defaultName = "default";
    const profileNameRaw = await prompt(rl, t.profilePrompt(defaultName));
    const profileName = profileNameRaw.trim() || defaultName;
    if (config.profiles[profileName]) {
      const overwrite = (await prompt(rl, t.profileExists(profileName))).trim().toLowerCase();
      if (overwrite !== "y") {
        process.stdout.write(`${t.cancelled}
`);
        return;
      }
    }
    const apiKey = (await prompt(rl, t.enterApiKey)).trim();
    if (!apiKey) {
      printError(t.emptyApiKey);
      return;
    }
    const { DEFAULT_BASE_URL } = await import("./loader-EOF4J2IX.js");
    const baseUrlRaw = (await prompt(rl, t.enterBaseUrl(DEFAULT_BASE_URL))).trim();
    const baseUrl = baseUrlRaw || DEFAULT_BASE_URL;
    config.profiles[profileName] = {
      api_key: apiKey,
      base_url: baseUrl !== DEFAULT_BASE_URL ? baseUrl : void 0
    };
    if (!config.default_profile) {
      config.default_profile = profileName;
    }
    await writeConfig(config);
    process.stdout.write(t.saved(getConfigPath()));
    process.stdout.write(t.defaultProfile(config.default_profile));
    process.stdout.write(t.usage);
  } catch (err) {
    printError(err.message);
  } finally {
    rl.close();
  }
}
async function cmdConfigSet(key, value) {
  const config = await readConfig();
  if (key === "default_profile") {
    if (!config.profiles[value]) {
      printError(`Profile "${value}" does not exist`);
      return;
    }
    config.default_profile = value;
    await writeConfig(config);
    printSuccess(`default_profile set to "${value}"`);
  } else {
    printError(`Unknown config key: ${key}. Supported: default_profile`);
  }
}
async function cmdConfigUse(profileName) {
  if (!profileName) {
    printError("Profile name is required. Usage: seamflux config use <profile-name>");
    return;
  }
  const config = await readConfig();
  if (!config.profiles[profileName]) {
    const available = Object.keys(config.profiles);
    printError(
      `Profile "${profileName}" does not exist.` + (available.length > 0 ? ` Available: ${available.join(", ")}` : " Run: seamflux config init")
    );
    return;
  }
  config.default_profile = profileName;
  await writeConfig(config);
  printSuccess(`Default profile set to: "${profileName}"`);
}

// src/commands/workflow.ts
async function cmdWorkflowList(client, opts) {
  const result = await client.listWorkflows({ scope: "my" });
  const items = result.data || [];
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
      created: w["createdAt"] ? new Date(String(w["createdAt"])).toLocaleDateString() : "-"
    }))
  );
}
async function cmdWorkflowGet(client, opts) {
  const result = await client.getWorkflow(opts.id);
  const data = result.data;
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
    "Created At": data["createdAt"] ? new Date(String(data["createdAt"])).toLocaleString() : "-",
    "Updated At": data["updatedAt"] ? new Date(String(data["updatedAt"])).toLocaleString() : "-"
  });
}
async function cmdWorkflowSearch(client, opts) {
  const result = await client.listWorkflows({
    scope: opts.scope || "templates",
    q: opts.q
  });
  const items = result.data || [];
  if (opts.json) {
    printJson(items);
    return;
  }
  if (items.length === 0) {
    process.stdout.write(`(no workflows found for "${opts.q}")
`);
    return;
  }
  printTable(
    items.map((w) => ({
      id: truncate(String(w["id"] || ""), 20),
      title: truncate(String(w["title"] || ""), 30),
      author: w["username"] || "-"
    }))
  );
}
async function cmdWorkflowDelete(client, opts) {
  await client.deleteWorkflow(opts.id);
  if (opts.json) {
    printJson({ code: 0, message: "Workflow deleted", data: { id: opts.id } });
    return;
  }
  printSuccess(`Workflow "${opts.id}" deleted`);
}
async function cmdWorkflowExecute(client, opts) {
  let config;
  if (opts.config) {
    try {
      config = JSON.parse(opts.config);
    } catch {
      printError("Invalid JSON in config");
      return;
    }
  }
  const result = await client.executeWorkflow(opts.id, config);
  const executionId = result.data?.executionId;
  if (opts.json) {
    printJson({
      code: result.code,
      message: result.message,
      data: { executionId, workflowId: opts.id }
    });
    return;
  }
  if (executionId) {
    printSuccess(`Execution started: ${executionId}`);
    process.stdout.write(`View logs: seamflux execution logs --id ${executionId}
`);
  } else {
    printSuccess("Execution started");
  }
}
async function cmdWorkflowGenerate(client, opts) {
  const result = await client.generateWorkflow(opts.requirement);
  if (opts.json) {
    printJson(result.data);
    return;
  }
  const data = result.data;
  if (!data?.success) {
    const reason = data?.reason || "Unknown error";
    printError(`Generation failed: ${reason}`);
    return;
  }
  const workflowId = data.workflowId;
  const title = data.title;
  const summary = data.summary;
  printSuccess("Workflow generated successfully");
  process.stdout.write(`
`);
  process.stdout.write(`  Workflow ID:  ${workflowId}
`);
  process.stdout.write(`  Title:        ${title}
`);
  if (summary) {
    process.stdout.write(`  Summary:      ${summary}
`);
  }
  process.stdout.write(`
`);
  process.stdout.write(`Execute it with: seamflux workflow execute --id ${workflowId}
`);
}

// src/commands/execution.ts
async function cmdExecutionList(client, opts) {
  const result = await client.listExecutions();
  const items = result.data || [];
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
      created: e["createdAt"] ? new Date(String(e["createdAt"])).toLocaleDateString() : "-"
    }))
  );
}
async function cmdExecutionRun(client, opts) {
  let config;
  try {
    config = JSON.parse(opts.config);
  } catch {
    printError(`Invalid JSON in config. Expected: '{"key":"value"}'`);
    return;
  }
  const result = await client.runExecution(opts.id, config);
  if (opts.json) {
    printJson({
      code: result.code,
      message: result.message,
      data: { executionId: opts.id }
    });
    return;
  }
  printSuccess(`Execution "${opts.id}" started`);
  process.stdout.write(`View logs: seamflux execution logs --id ${opts.id}
`);
}
async function cmdExecutionLogs(client, opts) {
  const result = await client.getExecutionLogs({
    executionId: opts.executionId,
    limit: opts.limit,
    afterSeq: opts.afterSeq,
    since: opts.since,
    until: opts.until,
    level: opts.level,
    serviceName: opts.serviceName,
    nodemethod: opts.nodemethod
  });
  const data = result.data;
  const logs = data?.["results"] || [];
  if (opts.json) {
    printJson(data || result);
    return;
  }
  if (logs.length === 0) {
    process.stdout.write("(no logs)\n");
    return;
  }
  for (const log of logs) {
    const ts = log["ts"] || log["timestamp"];
    const level = log["level"] || "INFO";
    const message = log["message"] || log["msg"] || "";
    const node = log["node"] || log["serviceName"] || log["nodename"] || "";
    const timeStr = ts ? new Date(Number(ts) || String(ts)).toLocaleTimeString() : "-";
    process.stdout.write(`[${timeStr}] ${level.padEnd(5)} ${node ? `(${node}) ` : ""}${message}
`);
  }
  if (opts.executionId) {
    process.stdout.write(`
View execution: https://app.seamflux.ai/execution/${opts.executionId}
`);
  }
}
async function cmdExecutionDelete(client, opts) {
  await client.deleteExecution(opts.id);
  if (opts.json) {
    printJson({ code: 0, message: "Execution deleted", data: { id: opts.id } });
    return;
  }
  printSuccess(`Execution "${opts.id}" deleted`);
}

// src/commands/service.ts
import { readFile } from "fs/promises";
import { stdin } from "process";
async function cmdServiceList(client, opts) {
  const result = await client.listServices();
  const items = result.data || [];
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
      description: s["description"]?.slice(0, 50) + "..." || "-"
    }))
  );
}
async function cmdServiceQuery(client, opts) {
  let where;
  if (opts.service) {
    where = { service: opts.service };
  }
  const result = await client.queryServices(
    opts.q,
    opts.k ? parseInt(opts.k, 10) : void 0,
    where
  );
  if (opts.json) {
    printJson(result.data);
    return;
  }
  const data = result.data;
  const items = data?.["results"] || data || [];
  if (items.length === 0) {
    process.stdout.write(`(no services found for "${opts.q}")
`);
    return;
  }
  printTable(
    items.map((s) => ({
      name: s["name"] || s["node"] || "-",
      score: s["score"] ? String(s["score"]).slice(0, 4) : "-",
      description: s["description"]?.slice(0, 40) + "..." || "-"
    }))
  );
}
async function cmdServiceInvoke(client, service, method, opts) {
  const payload = await resolvePayload(opts);
  const result = await client.invokeService(service, method, payload);
  if (opts.json) {
    printJson(result.data);
    return;
  }
  if (result.data && typeof result.data === "object") {
    printKv(result.data);
  } else {
    process.stdout.write(String(result.data ?? "(no data)") + "\n");
  }
}
async function resolvePayload(opts) {
  if (opts.stdin) {
    const input = await readStdin();
    if (!input.trim()) {
      throw new Error("STDIN is empty. Provide JSON data via pipe or use -p/-b/-f options.");
    }
    try {
      return JSON.parse(input);
    } catch (err) {
      throw new Error(`Invalid JSON from STDIN: ${err.message}`);
    }
  }
  if (opts.file) {
    try {
      const content = await readFile(opts.file, "utf-8");
      return JSON.parse(content);
    } catch (err) {
      if (err.code === "ENOENT") {
        throw new Error(`File not found: ${opts.file}`);
      }
      throw new Error(`Failed to parse JSON file: ${err.message}`);
    }
  }
  if (opts.body) {
    try {
      return JSON.parse(opts.body);
    } catch (err) {
      throw new Error(`Invalid JSON in --body: ${err.message}`);
    }
  }
  if (opts.params && opts.params.length > 0) {
    const payload = {};
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
  return {};
}
function readStdin() {
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
function parseTypedValue(v) {
  if (v === "true") return true;
  if (v === "false") return false;
  if (v === "null") return null;
  if (/^-?\d+$/.test(v)) {
    const n = parseInt(v, 10);
    if (!isNaN(n)) return n;
  }
  if (/^-?\d+\.\d+$/.test(v)) {
    const n = parseFloat(v);
    if (!isNaN(n)) return n;
  }
  return v;
}

// src/commands/connection.ts
async function cmdConnectionList(client, opts) {
  const result = await client.listConnections(opts.credentialType);
  const items = result.data || [];
  if (opts.json) {
    printJson(items);
    return;
  }
  if (opts.credentialType) {
    if (items.length === 0) {
      process.stdout.write(`No connection found for credential type "${opts.credentialType}".
`);
      return;
    }
    const conn = items[0];
    process.stdout.write(`
Connection Details:
`);
    process.stdout.write(`  Name:            ${conn["name"] || "-"}
`);
    process.stdout.write(`  Remark:          ${conn["remark"] || "-"}
`);
    process.stdout.write(`  Credential Type: ${conn["type"] || opts.credentialType}
`);
    process.stdout.write(`
`);
    return;
  }
  if (items.length === 0) {
    process.stdout.write("No connections found.\n");
    return;
  }
  process.stdout.write(`
Found ${items.length} connection(s):

`);
  for (const conn of items) {
    const name = conn["name"] || "-";
    const type = conn["type"] || "-";
    const remark = conn["remark"] || "-";
    process.stdout.write(`  Name:            ${name}
`);
    process.stdout.write(`  Credential Type: ${type}
`);
    process.stdout.write(`  Remark:          ${remark}
`);
    process.stdout.write(`
`);
  }
}

// src/index.ts
var _require = createRequire(import.meta.url);
var CLI_VERSION = _require("../package.json").version;
var GIT_HASH = true ? "dev" : "dev";
async function main() {
  const { values, positionals } = parseCli(process.argv.slice(2));
  if (values.version) {
    process.stdout.write(`${CLI_VERSION} (${GIT_HASH})
`);
    return;
  }
  if (values.help || positionals.length === 0) {
    const [module2] = positionals;
    printHelp(module2);
    return;
  }
  const [module, action, ...rest] = positionals;
  const v = values;
  const json = v.json ?? false;
  if (module === "config") {
    switch (action) {
      case "init":
        return await cmdConfigInit(v.lang === "zh" ? "zh" : "en");
      case "show":
        return await cmdConfigShow(json);
      case "set":
        return await cmdConfigSet(rest[0], rest[1]);
      case "use":
        return await cmdConfigUse(rest[0]);
      default:
        printError(`Unknown config command: ${action}`);
        return;
    }
  }
  const loadOptions = {
    profile: v.profile,
    apiKey: v.apiKey,
    baseUrl: v.baseUrl
  };
  let client;
  try {
    const config = await loadConfig(loadOptions);
    client = new SeamFluxClient(config);
  } catch (err) {
    if (err instanceof Error) {
      printError(err.message);
    } else {
      printError("Failed to load configuration");
    }
    return;
  }
  try {
    switch (module) {
      case "workflow":
        return await handleWorkflowCommand(client, action, v, json);
      case "execution":
        return await handleExecutionCommand(client, action, v, json);
      case "service":
        return await handleServiceCommand(client, action, rest, v, json);
      case "connection":
        return await handleConnectionCommand(client, action, rest, v, json);
      default:
        printError(`Unknown module: ${module}`);
        process.exitCode = 1;
    }
  } catch (err) {
    if (err instanceof ApiError) {
      printError(`${err.message} (code: ${err.code})`);
      if (err.traceId) {
        process.stderr.write(`  Trace ID: ${err.traceId}
`);
      }
    } else if (err instanceof Error) {
      printError(err.message);
    } else {
      printError("An unknown error occurred");
    }
    process.exitCode = 1;
  }
}
async function handleWorkflowCommand(client, action, v, json) {
  switch (action) {
    case "list":
      return await cmdWorkflowList(client, { json });
    case "get":
      if (!v.id) throw new Error("--id is required");
      return await cmdWorkflowGet(client, { id: v.id, json });
    case "search":
      if (!v.q) throw new Error("--q (query) is required");
      return await cmdWorkflowSearch(client, {
        q: v.q,
        scope: v.scope,
        json
      });
    case "delete":
      if (!v.id) throw new Error("--id is required");
      return await cmdWorkflowDelete(client, { id: v.id, json });
    case "execute":
      if (!v.id) throw new Error("--id is required");
      return await cmdWorkflowExecute(client, {
        id: v.id,
        config: v.config,
        json
      });
    case "generate":
      if (!v.requirement) throw new Error("--requirement is required");
      return await cmdWorkflowGenerate(client, {
        requirement: v.requirement,
        json
      });
    default:
      throw new Error(`Unknown workflow command: ${action || "(none)"}`);
  }
}
async function handleExecutionCommand(client, action, v, json) {
  switch (action) {
    case "list":
      return await cmdExecutionList(client, { json });
    case "run":
      if (!v.id) throw new Error("--id is required");
      if (!v.config) throw new Error("--config is required");
      return await cmdExecutionRun(client, {
        id: v.id,
        config: v.config,
        json
      });
    case "logs":
      return await cmdExecutionLogs(client, {
        executionId: v.id,
        limit: v.limit,
        afterSeq: v.afterSeq,
        since: v.since,
        until: v.until,
        level: v.level,
        serviceName: v.serviceName,
        nodemethod: v.nodemethod,
        json
      });
    case "delete":
      if (!v.id) throw new Error("--id is required");
      return await cmdExecutionDelete(client, { id: v.id, json });
    default:
      throw new Error(`Unknown execution command: ${action || "(none)"}`);
  }
}
async function handleServiceCommand(client, action, rest, v, json) {
  switch (action) {
    case "list":
      return await cmdServiceList(client, { json });
    case "query":
      if (!v.q) throw new Error("--q (query) is required");
      return await cmdServiceQuery(client, {
        q: v.q,
        k: v.k,
        service: v.service,
        json
      });
    case "invoke": {
      const [node, method] = rest;
      if (!node || !method) {
        throw new Error("Node and method are required. Usage: seamflux service invoke <node> <method>");
      }
      return await cmdServiceInvoke(client, node, method, {
        params: v.param,
        body: v.body,
        file: v.file,
        stdin: v.stdin,
        json
      });
    }
    default:
      throw new Error(`Unknown service command: ${action || "(none)"}`);
  }
}
async function handleConnectionCommand(client, action, rest, _v, json) {
  if (action === "list") {
    const credentialType = rest[0];
    return await cmdConnectionList(client, { credentialType, json });
  }
  throw new Error(`Unknown connection command: ${action || "(none)"}. Usage: seamflux connection list [credential-type]`);
}
main().catch((err) => {
  printError(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
export {
  printHelp
};
//# sourceMappingURL=index.js.map