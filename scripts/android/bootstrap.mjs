import { existsSync, rmSync } from "node:fs";
import { spawnSync } from "node:child_process";

const androidDir = "android";
const force = process.argv.includes("--force");

if (force && existsSync(androidDir)) {
  rmSync(androidDir, { recursive: true, force: true });
}

if (existsSync(androidDir)) {
  console.log("Android project already exists.");
  process.exit(0);
}

const npx = process.platform === "win32" ? "npx.cmd" : "npx";
const result = spawnSync(npx, ["cap", "add", "android"], {
  stdio: "inherit",
  shell: false
});

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}
