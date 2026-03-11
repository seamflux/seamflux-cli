import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import * as TOML from "smol-toml";

export interface SeamFluxProfile {
  api_key: string;
  base_url?: string;
}

export interface SeamFluxTomlConfig {
  default_profile?: string;
  profiles: Record<string, SeamFluxProfile>;
}

const DEFAULT_CONFIG: SeamFluxTomlConfig = {
  default_profile: "default",
  profiles: {},
};

export function getConfigDir(): string {
  const home = process.env.HOME || process.env.USERPROFILE;
  if (!home) {
    throw new Error("Unable to determine home directory");
  }
  return `${home}/.seamflux`;
}

export function getConfigPath(): string {
  return `${getConfigDir()}/config.toml`;
}

export async function readConfig(): Promise<SeamFluxTomlConfig> {
  try {
    const content = await readFile(getConfigPath(), "utf-8");
    const parsed = TOML.parse(content) as unknown as SeamFluxTomlConfig;
    return {
      default_profile: parsed.default_profile || "default",
      profiles: parsed.profiles || {},
    };
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      return { ...DEFAULT_CONFIG };
    }
    throw err;
  }
}

export async function writeConfig(config: SeamFluxTomlConfig): Promise<void> {
  const configPath = getConfigPath();
  const configDir = dirname(configPath);

  try {
    await mkdir(configDir, { recursive: true });
  } catch {
    // ignore
  }

  const toml = TOML.stringify(config as unknown as Record<string, unknown>);
  await writeFile(configPath, toml, "utf-8");
}

export function maskSecret(value: string): string {
  if (!value || value.length < 8) return "****";
  return value.slice(0, 4) + "****" + value.slice(-4);
}
