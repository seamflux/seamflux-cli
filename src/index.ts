#!/usr/bin/env node
// Global definition for build-time constant
declare const __GIT_HASH__: string;

import { createRequire } from "node:module";
import { parseCli } from "./parser.js";
import { printHelp } from "./help.js";
import { loadConfig, type LoadConfigOptions } from "./config/loader.js";
import { SeamFluxClient, ApiError } from "./api-client.js";
import { printError } from "./formatter.js";

import {
  cmdConfigInit,
  cmdConfigShow,
  cmdConfigSet,
  cmdConfigUse,
} from "./commands/config.js";
import {
  cmdWorkflowList,
  cmdWorkflowGet,
  cmdWorkflowSearch,
  cmdWorkflowDelete,
  cmdWorkflowExecute,
  cmdWorkflowGenerate,
} from "./commands/workflow.js";
import {
  cmdExecutionList,
  cmdExecutionRun,
  cmdExecutionLogs,
  cmdExecutionDelete,
} from "./commands/execution.js";
import {
  cmdServiceList,
  cmdServiceQuery,
  cmdServiceInvoke,
} from "./commands/service.js";
import {
  cmdConnectionList,
} from "./commands/connection.js";
import {
  cmdScriptDownload,
  cmdScriptList,
  cmdScriptRun,
} from "./commands/script.js";
import {
  cmdSignerCreate,
  cmdSignerList,
  cmdSignerSign,
} from "./commands/signer.js";

const _require = createRequire(import.meta.url);
const CLI_VERSION = (_require("../package.json") as { version: string }).version;
const GIT_HASH: string = typeof __GIT_HASH__ !== "undefined" ? __GIT_HASH__ : "dev";

export { printHelp };

// Known top-level modules (for routing service shortcuts)
const KNOWN_MODULES = new Set(["config", "script", "workflow", "execution", "service", "connection", "signer"]);

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const { values, positionals } = parseCli(process.argv.slice(2));

  // Version
  if (values.version) {
    process.stdout.write(`${CLI_VERSION} (${GIT_HASH})\n`);
    return;
  }

  // Help
  if (values.help || positionals.length === 0) {
    const [module] = positionals;
    printHelp(module);
    return;
  }

  const [module, action, ...rest] = positionals;
  const v = values;
  const json = v.json ?? false;

  // Validate module
  if (!KNOWN_MODULES.has(module)) {
    printError(`Unknown module: ${module}. Available: ${Array.from(KNOWN_MODULES).join(", ")}`);
    process.exitCode = 1;
    return;
  }

  // Config commands (don't need API client)
  if (module === "config") {
    switch (action) {
      case "init":
        return await cmdConfigInit((v.lang === "zh" ? "zh" : "en") as "en" | "zh");
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

  // Script commands (no API key: download is public URL, list/run are local)
  if (module === "script") {
    try {
      return await handleScriptCommand(action, rest, v, json);
    } catch (err) {
      if (err instanceof Error) {
        printError(err.message);
      } else {
        printError("An unknown error occurred");
      }
      process.exitCode = 1;
      return;
    }
  }

  // Initialize API client
  const loadOptions: LoadConfigOptions = {
    profile: v.profile,
    apiKey: v.apiKey,
    baseUrl: v.baseUrl,
  };

  let client: SeamFluxClient;
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

  // Route commands
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
      case "signer":
        return await handleSignerCommand(client, action, rest, v, json);
      default:
        printError(`Unknown module: ${module}`);
        process.exitCode = 1;
    }
  } catch (err) {
    if (err instanceof ApiError) {
      printError(`${err.message} (code: ${err.code})`);
      if (err.traceId) {
        process.stderr.write(`  Trace ID: ${err.traceId}\n`);
      }
    } else if (err instanceof Error) {
      printError(err.message);
    } else {
      printError("An unknown error occurred");
    }
    process.exitCode = 1;
  }
}

// ---------------------------------------------------------------------------
// Command handlers
// ---------------------------------------------------------------------------

async function handleWorkflowCommand(
  client: SeamFluxClient,
  action: string | undefined,
  v: Record<string, unknown>,
  json: boolean
): Promise<void> {
  switch (action) {
    case "list":
      return await cmdWorkflowList(client, { json });
    case "get":
      if (!v.id) throw new Error("--id is required");
      return await cmdWorkflowGet(client, { id: v.id as string, json });
    case "search":
      if (!v.q) throw new Error("--q (query) is required");
      return await cmdWorkflowSearch(client, {
        q: v.q as string,
        scope: v.scope as string,
        json,
      });
    case "delete":
      if (!v.id) throw new Error("--id is required");
      return await cmdWorkflowDelete(client, { id: v.id as string, json });
    case "execute":
      if (!v.id) throw new Error("--id is required");
      return await cmdWorkflowExecute(client, {
        id: v.id as string,
        config: v.config as string | undefined,
        json,
      });
    case "generate":
      if (!v.requirement) throw new Error("--requirement is required");
      return await cmdWorkflowGenerate(client, {
        requirement: v.requirement as string,
        json,
      });
    default:
      throw new Error(`Unknown workflow command: ${action || "(none)"}`);
  }
}

async function handleExecutionCommand(
  client: SeamFluxClient,
  action: string | undefined,
  v: Record<string, unknown>,
  json: boolean
): Promise<void> {
  switch (action) {
    case "list":
      return await cmdExecutionList(client, { json });
    case "run":
      if (!v.id) throw new Error("--id is required");
      if (!v.config) throw new Error("--config is required");
      return await cmdExecutionRun(client, {
        id: v.id as string,
        config: v.config as string,
        json,
      });
    case "logs":
      return await cmdExecutionLogs(client, {
        id: v.id as string | undefined,
        limit: v.limit as string | undefined,
        afterSeq: v.afterSeq as string | undefined,
        since: v.since as string | undefined,
        until: v.until as string | undefined,
        level: v.level as string | undefined,
        nodename: v.service as string | undefined,
        nodemethod: v.method as string | undefined,
        json,
      });
    case "delete":
      if (!v.id) throw new Error("--id is required");
      return await cmdExecutionDelete(client, { id: v.id as string, json });
    default:
      throw new Error(`Unknown execution command: ${action || "(none)"}`);
  }
}

async function handleServiceCommand(
  client: SeamFluxClient,
  action: string | undefined,
  rest: string[],
  v: Record<string, unknown>,
  json: boolean
): Promise<void> {
  switch (action) {
    case "list":
      return await cmdServiceList(client, { json });
    case "query":
      if (!v.query) throw new Error("--query is required");
      return await cmdServiceQuery(client, {
        query: v.query as string,
        k: v.k as string | undefined,
        service: v.service as string | undefined,
        json,
      });
    case "invoke": {
      const [service, method] = rest;
      if (!service || !method) {
        throw new Error("Service and method are required. Usage: seamflux service invoke <service> <method>");
      }
      
      // Parse --use-log argument (format: --use-log service method)
      let useLog: { service: string; method: string } | undefined;
      if (v.useLog) {
        const useLogParts = (v.useLog as string).split(" ");
        if (useLogParts.length !== 2) {
          throw new Error("Invalid --use-log format. Expected: --use-log <service> <method>");
        }
        useLog = { service: useLogParts[0], method: useLogParts[1] };
      }
      
      return await cmdServiceInvoke(client, service, method, {
        params: v.param as string[] | undefined,
        body: v.body as string | undefined,
        file: v.file as string | undefined,
        stdin: v.stdin as boolean,
        useLog,
        map: v.map as string[] | undefined,
        json,
      });
    }
    default:
      throw new Error(`Unknown service command: ${action || "(none)"}`);
  }
}

async function handleScriptCommand(
  action: string | undefined,
  rest: string[],
  v: Record<string, unknown>,
  json: boolean
): Promise<void> {
  switch (action) {
    case "download":
      if (!v.slug) throw new Error("--slug is required");
      return await cmdScriptDownload({
        slug: v.slug as string,
        output: v.output as string | undefined,
        baseUrl: v.baseUrl as string | undefined,
        json,
      });
    case "list":
      return await cmdScriptList({
        dir: v.dir as string | undefined,
        json,
      });
    case "run": {
      const slugOrPath = rest[0];
      if (!slugOrPath) throw new Error("Usage: seamflux script run <slug|path> [--config <path>] [--key=value ...]");
      return await cmdScriptRun({
        slugOrPath,
        config: v.config as string | undefined,
        nodeArgs: rest.slice(1),
        json,
      });
    }
    default:
      throw new Error(`Unknown script command: ${action || "(none)"}. Use: script download, script list, script run`);
  }
}

async function handleConnectionCommand(
  client: SeamFluxClient,
  action: string | undefined,
  rest: string[],
  _v: Record<string, unknown>,
  json: boolean
): Promise<void> {
  // connection list [credentialType]
  if (action === "list") {
    const credentialType = rest[0];
    return await cmdConnectionList(client, { credentialType, json });
  }

  throw new Error(`Unknown connection command: ${action || "(none)"}. Usage: seamflux connection list [credential-type]`);
}

async function handleSignerCommand(
  client: SeamFluxClient,
  action: string | undefined,
  rest: string[],
  v: Record<string, unknown>,
  json: boolean
): Promise<void> {
  switch (action) {
    case "create": {
      const name = (v.name as string | undefined) || rest[0];
      return await cmdSignerCreate(client, { name });
    }
    case "list":
      return await cmdSignerList(client, { json });
    case "sign": {
      const walletAddress = rest[0];
      const transaction = rest[1];
      if (!walletAddress) {
        throw new Error("Usage: seamflux signer sign <walletAddress> [transaction] [options]");
      }
      
      // Parse --use-log argument (format: --use-log service method)
      let useLog: { service: string; method: string } | undefined;
      if (v.useLog) {
        const useLogParts = (v.useLog as string).split(" ");
        if (useLogParts.length !== 2) {
          throw new Error("Invalid --use-log format. Expected: --use-log <service> <method>");
        }
        useLog = { service: useLogParts[0], method: useLogParts[1] };
      }
      
      return await cmdSignerSign(client, walletAddress, transaction, {
        name: v.name as string | undefined,
        params: v.param as string[] | undefined,
        body: v.body as string | undefined,
        file: v.file as string | undefined,
        stdin: v.stdin as boolean,
        useLog,
        map: v.map as string[] | undefined,
      });
    }
    default:
      throw new Error(`Unknown signer command: ${action || "(none)"}. Usage: seamflux signer <create|list|sign>`);
  }
}

// Run main
main().catch((err: unknown) => {
  printError(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
