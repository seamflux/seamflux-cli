import { mkdir, readdir, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { spawn } from "node:child_process";
import extract from "extract-zip";
import { getConfigDir } from "../config/toml.js";
import { printError, printJson, printSuccess, printTable } from "../formatter.js";

const DEFAULT_DOWNLOAD_BASE = "https://app.seamflux.ai";
const SCRIPT_ENTRY = "source.js";

export function getScriptsDir(): string {
  return `${getConfigDir()}/scripts`;
}

export async function cmdScriptDownload(opts: {
  slug: string;
  output?: string;
  baseUrl?: string;
  json: boolean;
}): Promise<void> {
  const baseUrl = (opts.baseUrl || DEFAULT_DOWNLOAD_BASE).replace(/\/$/, "");
  const url = `${baseUrl}/download/workflow/${opts.slug}`;

  const targetDir = opts.output || getScriptsDir();
  const slugDir = join(targetDir, opts.slug);
  const zipPath = join(targetDir, `${opts.slug}.zip`);

  let res: Response;
  try {
    res = await fetch(url);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    printError(`Download failed: ${msg}`);
    return;
  }

  if (!res.ok) {
    printError(`Download failed: HTTP ${res.status} (${url})`);
    return;
  }

  const buf = await res.arrayBuffer();
  await mkdir(targetDir, { recursive: true });
  await writeFile(zipPath, new Uint8Array(buf));

  await mkdir(slugDir, { recursive: true });
  try {
    await extract(zipPath, { dir: slugDir });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    printError(`Extract failed: ${msg}`);
    return;
  }

  const sourcePath = join(slugDir, SCRIPT_ENTRY);
  try {
    await stat(sourcePath);
  } catch {
    printError(`Extracted package missing ${SCRIPT_ENTRY} in ${slugDir}`);
    return;
  }

  if (opts.json) {
    printJson({
      slug: opts.slug,
      path: slugDir,
      entry: SCRIPT_ENTRY,
    });
    return;
  }

  printSuccess(`Downloaded workflow script "${opts.slug}" to ${slugDir}`);
  process.stdout.write(`Run locally: seamflux script run ${opts.slug}\n`);
}

export async function cmdScriptList(opts: {
  dir?: string;
  json: boolean;
}): Promise<void> {
  const scriptsDir = opts.dir || getScriptsDir();

  let entries: string[];
  try {
    entries = await readdir(scriptsDir);
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === "ENOENT") {
      if (opts.json) {
        printJson([]);
      } else {
        process.stdout.write("(no scripts downloaded)\n");
      }
      return;
    }
    printError((err as Error).message);
    return;
  }

  const scripts: { slug: string; path: string }[] = [];
  for (const name of entries) {
    const full = join(scriptsDir, name);
    try {
      const st = await stat(full);
      if (!st.isDirectory()) continue;
      const sourcePath = join(full, SCRIPT_ENTRY);
      await stat(sourcePath);
      scripts.push({ slug: name, path: full });
    } catch {
      // skip non-directories or dirs without source.js
    }
  }

  if (opts.json) {
    printJson(scripts);
    return;
  }

  if (scripts.length === 0) {
    process.stdout.write("(no scripts downloaded)\n");
    return;
  }

  printTable(
    scripts.map((s) => ({ slug: s.slug, path: s.path }))
  );
}

export async function cmdScriptRun(opts: {
  slugOrPath: string;
  config?: string;
  nodeArgs: string[];
  json: boolean;
}): Promise<void> {
  const isPath =
    opts.slugOrPath.includes("/") ||
    opts.slugOrPath.includes("\\") ||
    opts.slugOrPath.startsWith(".");
  const scriptDir = isPath
    ? opts.slugOrPath
    : join(getScriptsDir(), opts.slugOrPath);

  let sourcePath: string;
  try {
    const st = await stat(scriptDir);
    if (!st.isDirectory()) {
      printError(`Not a directory: ${scriptDir}`);
      return;
    }
    sourcePath = join(scriptDir, SCRIPT_ENTRY);
    await stat(sourcePath);
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === "ENOENT") {
      printError(
        `Script not found. Run: seamflux script download --slug ${opts.slugOrPath}`
      );
    } else {
      printError((err as Error).message);
    }
    return;
  }

  const args: string[] = [sourcePath];
  if (opts.config) {
    args.push(`--config=${opts.config}`);
  }
  for (const a of opts.nodeArgs) {
    if (a !== "--") args.push(a);
  }

  const child = spawn(process.execPath, args, {
    cwd: scriptDir,
    stdio: "inherit",
    env: process.env,
  });

  child.on("error", (err) => {
    printError(err.message);
    process.exitCode = 1;
  });

  child.on("exit", (code, signal) => {
    if (code != null) process.exitCode = code;
    if (signal) process.exitCode = 1;
  });
}
