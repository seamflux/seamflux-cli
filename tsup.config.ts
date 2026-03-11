import { defineConfig } from "tsup";
import { execSync } from "node:child_process";

let gitHash = "dev";
try {
  gitHash = execSync("git rev-parse --short HEAD", { encoding: "utf-8" }).trim();
} catch {
  // ignore
}

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  platform: "node",
  target: "node18",
  sourcemap: true,
  clean: true,
  dts: false,
  noExternal: ["smol-toml"],
  // banner is not needed as src/index.ts already has shebang
  define: { __GIT_HASH__: JSON.stringify(gitHash) },
});
