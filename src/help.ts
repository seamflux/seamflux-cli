import { getConfigPath } from "./config/toml.js";

interface CommandInfo {
  usage: string;
  description: string;
}

interface GroupInfo {
  description: string;
  usage?: string;
  commands?: Record<string, CommandInfo>;
  subgroups?: Record<string, GroupInfo>;
}

type HelpTree = Record<string, GroupInfo>;

const HELP_TREE: HelpTree = {
  workflow: {
    description: "Manage workflows (list, get, search, delete, execute, generate)",
    commands: {
      list: {
        usage: "seamflux workflow list",
        description: "List your workflows",
      },
      get: {
        usage: "seamflux workflow get --id <workflow-id>",
        description: "Get details of a specific workflow",
      },
      search: {
        usage: "seamflux workflow search --q <query> [--scope templates|market]",
        description: "Search workflows by query",
      },
      delete: {
        usage: "seamflux workflow delete --id <workflow-id>",
        description: "Delete a workflow",
      },
      execute: {
        usage: "seamflux workflow execute --id <workflow-id> [--config '<json>']",
        description: "Execute a workflow and create a new execution",
      },
      generate: {
        usage: "seamflux workflow generate --requirement '<description>'",
        description: "Generate a new workflow using AI",
      },
    },
  },

  execution: {
    description: "Manage executions (list, run, logs, delete)",
    commands: {
      list: {
        usage: "seamflux execution list",
        description: "List your executions",
      },
      run: {
        usage: "seamflux execution run --id <execution-id> --config '<json>'",
        description: "Run an existing execution with config",
      },
      logs: {
        usage: "seamflux execution logs [--id <execution-id>] [--limit <n>]",
        description: "Get execution logs",
      },
      delete: {
        usage: "seamflux execution delete --id <execution-id>",
        description: "Delete an execution",
      },
    },
  },

  service: {
    description: "Discover and invoke services",
    commands: {
      list: {
        usage: "seamflux service list",
        description: "List all available services",
      },
      query: {
        usage: "seamflux service query --q <query> [--service <name>] [--k <n>]",
        description: "Search services by description, optionally filter by service name",
      },
      invoke: {
        usage:
          "seamflux service invoke <node> <method> [options]\n" +
          "    Options:\n" +
          "      -p, --param <k=v>    Simple parameters (AI-friendly)\n" +
          "      -b, --body '<json>'  JSON request body\n" +
          "      -f, --file <path>    Read params from JSON file\n" +
          "      --stdin              Read params from STDIN (pipe)",
        description: "Invoke a service method",
      },
    },
  },

  config: {
    description: "Manage CLI configuration",
    commands: {
      init: {
        usage: "seamflux config init [--lang zh]",
        description: "Initialize configuration interactively",
      },
      show: {
        usage: "seamflux config show",
        description: "Show current configuration",
      },
      set: {
        usage: "seamflux config set <key> <value>",
        description: "Set a configuration value",
      },
      use: {
        usage: "seamflux config use <profile-name>",
        description: "Switch to a profile",
      },
    },
  },

  connection: {
    description: "Manage connections (credentials)",
    commands: {
      list: {
        usage: "seamflux connection list [credential-type]",
        description: "List all connections, or show details for a specific credential type",
      },
    },
  },
};

function printGlobalHelp(): void {
  const lines: string[] = [
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
    "Modules:",
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

function printModuleHelp(moduleName: string): void {
  const group = HELP_TREE[moduleName];
  if (!group) {
    process.stderr.write(`Unknown module: ${moduleName}\n`);
    process.exitCode = 1;
    return;
  }

  const lines: string[] = [
    "",
    `Usage: seamflux ${moduleName} <command> [args...]`,
    "",
    `${group.description}.`,
    "",
    "Commands:",
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

export function printHelp(...path: string[]): void {
  const [moduleName] = path;
  if (!moduleName) {
    printGlobalHelp();
  } else {
    printModuleHelp(moduleName);
  }
}
