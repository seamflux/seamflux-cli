import { createInterface } from "node:readline";
import { writeConfig, readConfig, maskSecret, getConfigPath, type SeamFluxProfile } from "../config/toml.js";
import { printJson, printKv, printError, printSuccess } from "../formatter.js";

export type Lang = "en" | "zh";

const messages = {
  en: {
    title: "SeamFlux CLI — Configuration Wizard",
    profilePrompt: (name: string) => `Profile name (default: ${name}): `,
    profileExists: (name: string) => `Profile "${name}" already exists. Overwrite? (y/N) `,
    cancelled: "Cancelled.",
    emptyApiKey: "Error: API Key cannot be empty",
    saved: (p: string) => `\nConfig saved to ${p}\n`,
    defaultProfile: (name: string) => `Default profile set to: ${name}\n`,
    usage: "Usage: seamflux workflow list\n",
    noProfiles: "No profiles found. Run: seamflux config init\n",
    enterApiKey: "API Key: ",
    enterBaseUrl: (url: string) => `Base URL (default: ${url}): `,
  },
  zh: {
    title: "SeamFlux CLI — 配置向导",
    profilePrompt: (name: string) => `Profile 名称 (默认: ${name}): `,
    profileExists: (name: string) => `Profile "${name}" 已存在，是否覆盖？(y/N) `,
    cancelled: "已取消。",
    emptyApiKey: "错误: API Key 不能为空",
    saved: (p: string) => `\n配置已保存到 ${p}\n`,
    defaultProfile: (name: string) => `已设为默认 profile: ${name}\n`,
    usage: "使用方式: seamflux workflow list\n",
    noProfiles: "未找到配置文件。请运行: seamflux config init\n",
    enterApiKey: "API Key: ",
    enterBaseUrl: (url: string) => `Base URL (默认: ${url}): `,
  },
};

function prompt(rl: ReturnType<typeof createInterface>, question: string): Promise<string> {
  return new Promise((resolve) => rl.question(question, resolve));
}

export async function cmdConfigShow(json: boolean): Promise<void> {
  const config = await readConfig();
  const configPath = getConfigPath();

  if (json) {
    printJson(config);
    return;
  }

  process.stdout.write(`Config: ${configPath}\n\n`);
  process.stdout.write(`default_profile: ${config.default_profile ?? "(not set)"}\n\n`);

  const entries = Object.entries(config.profiles);
  if (entries.length === 0) {
    process.stdout.write("(no profiles)\n");
    return;
  }

  for (const [name, profile] of entries) {
    process.stdout.write(`[${name}]\n`);
    printKv({
      api_key: maskSecret(profile.api_key),
      base_url: profile.base_url ?? "(default)",
    }, 2);
    process.stdout.write("\n");
  }
}

export async function cmdConfigInit(lang: Lang = "en"): Promise<void> {
  const t = messages[lang];
  process.stdout.write(`${t.title}\n\n`);

  const rl = createInterface({ input: process.stdin, output: process.stdout });

  try {
    const config = await readConfig();
    const defaultName = "default";
    const profileNameRaw = await prompt(rl, t.profilePrompt(defaultName));
    const profileName = profileNameRaw.trim() || defaultName;

    if (config.profiles[profileName]) {
      const overwrite = (await prompt(rl, t.profileExists(profileName))).trim().toLowerCase();
      if (overwrite !== "y") {
        process.stdout.write(`${t.cancelled}\n`);
        return;
      }
    }

    const apiKey = (await prompt(rl, t.enterApiKey)).trim();
    if (!apiKey) {
      printError(t.emptyApiKey);
      return;
    }

    const { DEFAULT_BASE_URL } = await import("../config/loader.js");
    const baseUrlRaw = (await prompt(rl, t.enterBaseUrl(DEFAULT_BASE_URL))).trim();
    const baseUrl = baseUrlRaw || DEFAULT_BASE_URL;

    config.profiles[profileName] = {
      api_key: apiKey,
      base_url: baseUrl !== DEFAULT_BASE_URL ? baseUrl : undefined,
    };

    if (!config.default_profile) {
      config.default_profile = profileName;
    }

    await writeConfig(config);

    process.stdout.write(t.saved(getConfigPath()));
    process.stdout.write(t.defaultProfile(config.default_profile));
    process.stdout.write(t.usage);
  } catch (err) {
    printError((err as Error).message);
  } finally {
    rl.close();
  }
}

export async function cmdConfigSet(key: string, value: string): Promise<void> {
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

export async function cmdConfigUse(profileName: string): Promise<void> {
  if (!profileName) {
    printError("Profile name is required. Usage: seamflux config use <profile-name>");
    return;
  }

  const config = await readConfig();

  if (!config.profiles[profileName]) {
    const available = Object.keys(config.profiles);
    printError(
      `Profile "${profileName}" does not exist.` +
        (available.length > 0 ? ` Available: ${available.join(", ")}` : " Run: seamflux config init")
    );
    return;
  }

  config.default_profile = profileName;
  await writeConfig(config);
  printSuccess(`Default profile set to: "${profileName}"`);
}
