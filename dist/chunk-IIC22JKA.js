import {
  readConfig
} from "./chunk-XLR6OQNJ.js";

// src/config/loader.ts
var DEFAULT_BASE_URL = "https://app.seamflux.ai";
var ConfigError = class extends Error {
  constructor(message) {
    super(message);
    this.name = "ConfigError";
  }
};
async function loadConfig(options = {}) {
  if (options.apiKey) {
    return {
      apiKey: options.apiKey,
      baseURL: options.baseUrl || process.env.SEAMFLUX_BASE_URL || DEFAULT_BASE_URL
    };
  }
  if (process.env.SEAMFLUX_API_KEY) {
    return {
      apiKey: process.env.SEAMFLUX_API_KEY,
      baseURL: process.env.SEAMFLUX_BASE_URL || DEFAULT_BASE_URL
    };
  }
  const tomlConfig = await readConfig();
  const profileName = options.profile || tomlConfig.default_profile || "default";
  const profile = tomlConfig.profiles[profileName];
  if (!profile?.api_key) {
    throw new ConfigError(
      "API Key not found. Please provide it via:\n  1. --api-key flag\n  2. SEAMFLUX_API_KEY environment variable\n  3. seamflux config init"
    );
  }
  return {
    apiKey: profile.api_key,
    baseURL: options.baseUrl || profile.base_url || DEFAULT_BASE_URL
  };
}
async function listProfiles() {
  const config = await readConfig();
  return Object.entries(config.profiles).map(([name, profile]) => ({
    name,
    profile,
    isDefault: name === config.default_profile
  }));
}
async function setDefaultProfile(name) {
  const config = await readConfig();
  if (!config.profiles[name]) {
    throw new ConfigError(`Profile "${name}" does not exist`);
  }
  config.default_profile = name;
  const { writeConfig } = await import("./toml-2JHFMBV3.js");
  await writeConfig(config);
}

export {
  DEFAULT_BASE_URL,
  ConfigError,
  loadConfig,
  listProfiles,
  setDefaultProfile
};
//# sourceMappingURL=chunk-IIC22JKA.js.map