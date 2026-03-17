import { readConfig, type SeamFluxTomlConfig, type SeamFluxProfile, getConfigPath } from "./toml.js";

export const DEFAULT_BASE_URL = "https://app.seamflux.ai";

export interface SeamFluxConfig {
  apiKey: string;
  baseURL: string;
}

export interface LoadConfigOptions {
  profile?: string;
  apiKey?: string;
  baseUrl?: string;
}

export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConfigError";
  }
}

export async function loadConfig(options: LoadConfigOptions = {}): Promise<SeamFluxConfig> {
  // 1. Command line arguments (highest priority)
  if (options.apiKey) {
    return {
      apiKey: options.apiKey,
      baseURL: options.baseUrl || process.env.SEAMFLUX_BASE_URL || DEFAULT_BASE_URL,
    };
  }

  // 2. Environment variables
  if (process.env.SEAMFLUX_API_KEY) {
    return {
      apiKey: process.env.SEAMFLUX_API_KEY,
      baseURL: process.env.SEAMFLUX_BASE_URL || DEFAULT_BASE_URL,
    };
  }

  // 3. Config file
  const tomlConfig = await readConfig();
  const profileName = options.profile || tomlConfig.default_profile || "default";
  const profile = tomlConfig.profiles[profileName];

  if (!profile?.api_key) {
    throw new ConfigError(
      "API Key not found. Please provide it via:\n" +
        "  1. --api-key flag\n" +
        "  2. SEAMFLUX_API_KEY environment variable\n" +
        "  3. seamflux config init"
    );
  }

  return {
    apiKey: profile.api_key,
    baseURL: options.baseUrl || profile.base_url || DEFAULT_BASE_URL,
  };
}

export async function listProfiles(): Promise<{ name: string; profile: SeamFluxProfile; isDefault: boolean }[]> {
  const config = await readConfig();
  return Object.entries(config.profiles).map(([name, profile]) => ({
    name,
    profile,
    isDefault: name === config.default_profile,
  }));
}

export async function setDefaultProfile(name: string): Promise<void> {
  const config = await readConfig();
  if (!config.profiles[name]) {
    throw new ConfigError(`Profile "${name}" does not exist`);
  }
  config.default_profile = name;
  const { writeConfig } = await import("./toml.js");
  await writeConfig(config);
}

// Signer config management
export async function saveSignerConfig(name: string, signerConfig: import("./toml.js").SignerConfig): Promise<void> {
  const { readConfig, writeConfig } = await import("./toml.js");
  const config = await readConfig();
  if (!config.signers) {
    config.signers = {};
  }
  config.signers[name] = signerConfig;
  await writeConfig(config);
}

export async function getSignerConfig(name: string): Promise<import("./toml.js").SignerConfig | undefined> {
  const { readConfig } = await import("./toml.js");
  const config = await readConfig();
  return config.signers?.[name];
}

export async function listSignerConfigs(): Promise<import("./toml.js").SignerConfig[]> {
  const { readConfig } = await import("./toml.js");
  const config = await readConfig();
  return config.signers ? Object.values(config.signers) : [];
}

// Wallet mapping management
export async function saveWalletMapping(address: string, walletId: string): Promise<void> {
  const { readConfig, writeConfig } = await import("./toml.js");
  const config = await readConfig();
  if (!config.wallets) {
    config.wallets = {};
  }
  config.wallets[address] = walletId;
  await writeConfig(config);
}

export async function getWalletId(address: string): Promise<string | undefined> {
  const { readConfig } = await import("./toml.js");
  const config = await readConfig();
  return config.wallets?.[address];
}

export { getConfigPath, type SeamFluxTomlConfig, type SeamFluxProfile };
