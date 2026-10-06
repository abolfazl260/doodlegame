import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join } from "node:path";

const tasks = process.argv.slice(2);
if (tasks.length === 0) {
  console.error("Pass at least one Gradle task, for example assembleDebug.");
  process.exit(1);
}

const androidDir = "android";
const wrapper = process.platform === "win32" ? "gradlew.bat" : "./gradlew";
const wrapperPath = join(androidDir, process.platform === "win32" ? "gradlew.bat" : "gradlew");

if (!existsSync(wrapperPath)) {
  console.error("Android project is missing. Run npm run android:sync first.");
  process.exit(1);
}

const result = spawnSync(wrapper, tasks, {
  cwd: androidDir,
  stdio: "inherit",
  shell: false
});

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}
