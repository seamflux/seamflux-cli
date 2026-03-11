import { parseArgs } from "node:util";

export interface CliValues {
  // Global options
  profile?: string;
  apiKey?: string;
  baseUrl?: string;
  json?: boolean;
  help?: boolean;
  version?: boolean;

  // Workflow options
  id?: string;
  scope?: string;
  q?: string;
  username?: string;
  slug?: string;
  locale?: string;
  tags?: string;
  sort?: string;
  relatedTo?: string;

  // Execution options
  limit?: string;
  afterSeq?: string;
  since?: string;
  until?: string;
  level?: string;
  serviceName?: string;
  nodemethod?: string;

  // Service options
  param?: string[];
  body?: string;
  file?: string;
  stdin?: boolean;
  interactive?: boolean;
  service?: string;

  // Config options
  force?: boolean;
  lang?: string;

  // Workflow generate options
  requirement?: string;

  // Misc
  [key: string]: unknown;
}

export const CLI_OPTIONS = {
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
  requirement: { type: "string" },
} as const;

export function parseCli(argv: string[]): { values: CliValues; positionals: string[] } {
  // Pre-process --no-<flag> for boolean options
  const negated = new Set<string>();
  const filtered = argv.filter((arg) => {
    if (arg.startsWith("--no-")) {
      const key = arg.slice(5);
      if (key in CLI_OPTIONS && (CLI_OPTIONS as Record<string, { type: string }>)[key].type === "boolean") {
        negated.add(key);
        return false;
      }
    }
    return true;
  });

  const { values, positionals } = parseArgs({
    args: filtered,
    options: CLI_OPTIONS,
    allowPositionals: true,
  });

  for (const key of negated) {
    (values as Record<string, unknown>)[key] = false;
  }

  // Map kebab-case to camelCase
  const mappedValues: CliValues = { ...values as CliValues };
  if (values["api-key"]) {
    mappedValues.apiKey = values["api-key"] as string;
    delete (mappedValues as Record<string, unknown>)["api-key"];
  }
  if (values["base-url"]) {
    mappedValues.baseUrl = values["base-url"] as string;
    delete (mappedValues as Record<string, unknown>)["base-url"];
  }
  if (values["after-seq"]) {
    mappedValues.afterSeq = values["after-seq"] as string;
    delete (mappedValues as Record<string, unknown>)["after-seq"];
  }
  if (values["related-to"]) {
    mappedValues.relatedTo = values["related-to"] as string;
    delete (mappedValues as Record<string, unknown>)["related-to"];
  }
  if (values["service-name"]) {
    mappedValues.serviceName = values["service-name"] as string;
    delete (mappedValues as Record<string, unknown>)["service-name"];
  }

  return { values: mappedValues, positionals };
}
