import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { homedir } from 'node:os';

export class EnvManager {
  private envPath: string;

  /**
   * 获取 OpenClaw 全局 .env 文件路径
   * 优先使用 OPENCLAW_STATE_DIR，其次是 ~/.openclaw
   */
  static getOpenClawEnvPath(): string {
    const stateDir = process.env.OPENCLAW_STATE_DIR || join(homedir(), '.openclaw');
    return join(stateDir, '.env');
  }

  constructor() {
    // 默认使用 OpenClaw 的全局 .env 文件
    this.envPath = EnvManager.getOpenClawEnvPath();
  }

  /**
   * 读取环境变量值
   * 按照 OpenClaw 的优先级：进程环境 > 当前目录 .env > ~/.openclaw/.env
   */
  async get(key: string): Promise<string | undefined> {
    // 1. 首先检查进程环境变量（最高优先级）
    const processValue = process.env[key];
    if (processValue !== undefined) {
      return processValue;
    }

    // 2. 检查当前目录的 .env
    const cwdEnv = resolve(process.cwd(), '.env');
    const cwdValue = await this.readFromFile(cwdEnv, key);
    if (cwdValue !== undefined) {
      return cwdValue;
    }

    // 3. 检查 OpenClaw 全局 .env
    return this.readFromFile(this.envPath, key);
  }

  private async readFromFile(filePath: string, key: string): Promise<string | undefined> {
    if (!existsSync(filePath)) return undefined;
    try {
      const content = await readFile(filePath, 'utf-8');
      const match = content.match(new RegExp(`^${key}=(.+)$`, 'm'));
      return match ? match[1].trim() : undefined;
    } catch {
      return undefined;
    }
  }

  /**
   * 写入环境变量到 OpenClaw 全局 .env 文件
   * 注意：如果变量已存在于更高优先级位置，OpenClaw 会使用那个值
   */
  async set(key: string, value: string): Promise<void> {
    // 确保目录存在
    const dir = dirname(this.envPath);
    if (!existsSync(dir)) {
      await mkdir(dir, { recursive: true });
    }

    let content = '';
    if (existsSync(this.envPath)) {
      content = await readFile(this.envPath, 'utf-8');
      // 检查是否已存在
      const regex = new RegExp(`^${key}=.+$`, 'm');
      if (regex.test(content)) {
        content = content.replace(regex, `${key}=${value}`);
      } else {
        content += `\n${key}=${value}`;
      }
    } else {
      content = `${key}=${value}`;
    }
    await writeFile(this.envPath, content.trim() + '\n');
  }

  /**
   * 检查变量是否已存在于任何位置（用于防止覆盖）
   */
  async exists(key: string): Promise<boolean> {
    const value = await this.get(key);
    return value !== undefined;
  }
}
