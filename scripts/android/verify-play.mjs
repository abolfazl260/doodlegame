import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

export const REQUIRED_APP_ID = "com.abolfazl.doodlegame";
export const REQUIRED_TARGET_SDK = 36;
export const MIN_16K_AGP = [8, 5, 1];

const ABI_32_TO_64 = new Map([
  ["armeabi-v7a", "arm64-v8a"],
  ["x86", "x86_64"]
]);
const ABI_64 = new Set(["arm64-v8a", "x86_64", "riscv64"]);

export function deriveVersionCode(version) {
  const match = /^(\d+)\.(\d+)\.(\d+)/.exec(version);
  if (!match) throw new Error(`Version must start with x.y.z; got ${version}`);
  const [, major, minor, patch] = match.map(Number);
  return Math.max(1, major * 1_000_000 + minor * 1_000 + patch);
}

function parseIntMatch(text, pattern, label) {
  const match = pattern.exec(text);
  if (!match) throw new Error(`Could not read ${label}`);
  return Number(match[1]);
}

function parseStringMatch(text, pattern, label) {
  const match = pattern.exec(text);
  if (!match) throw new Error(`Could not read ${label}`);
  return match[1];
}

export function parseAndroidConfig({ variables, appGradle, rootGradle }) {
  return {
    minSdk: parseIntMatch(variables, /minSdkVersion\s*=\s*(\d+)/, "minSdkVersion"),
    compileSdk: parseIntMatch(variables, /compileSdkVersion\s*=\s*(\d+)/, "compileSdkVersion"),
    targetSdk: parseIntMatch(variables, /targetSdkVersion\s*=\s*(\d+)/, "targetSdkVersion"),
    applicationId: parseStringMatch(appGradle, /applicationId\s*(?:=\s*)?["']([^"']+)["']/, "applicationId"),
    versionCode: parseIntMatch(appGradle, /versionCode\s*=?\s*(\d+)/, "versionCode"),
    versionName: parseStringMatch(appGradle, /versionName\s*=?\s*["']([^"']+)["']/, "versionName"),
    agpVersion: parseStringMatch(rootGradle, /com\.android\.tools\.build:gradle:([0-9.]+)/, "Android Gradle Plugin version")
  };
}

export function compareVersions(left, right) {
  const a = String(left).split(".").map(Number);
  const b = Array.isArray(right) ? right : String(right).split(".").map(Number);
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const delta = (a[i] ?? 0) - (b[i] ?? 0);
    if (delta !== 0) return Math.sign(delta);
  }
  return 0;
}

export function nativeLibrariesFromEntries(entries) {
  return entries.flatMap((entry) => {
    const normalized = entry.replace(/\\/g, "/");
    const match = /(?:^|\/)lib\/([^/]+)\/([^/]+\.so)$/.exec(normalized);
    return match ? [{ entry: normalized, abi: match[1], name: match[2] }] : [];
  });
}

export function validateAbiPairs(libraries) {
  const problems = [];
  const keys = new Set(libraries.map((lib) => `${lib.abi}/${lib.name}`));
  for (const lib of libraries) {
    const required64 = ABI_32_TO_64.get(lib.abi);
    if (required64 && !keys.has(`${required64}/${lib.name}`)) {
      problems.push(`${lib.entry} requires 64-bit counterpart ${required64}/${lib.name}`);
    }
  }
  if (libraries.length > 0 && !libraries.some((lib) => ABI_64.has(lib.abi))) {
    problems.push("Native libraries are present but no 64-bit ABI was found.");
  }
  return problems;
}

export function parseReadelfLoadAlignments(output) {
  const values = [];
  for (const line of output.split(/\r?\n/)) {
    if (!/^\s*LOAD\s/.test(line)) continue;
    const match = /(0x[0-9a-fA-F]+)\s*$/.exec(line);
    if (match) values.push(Number.parseInt(match[1], 16));
  }
  return values;
}

function listZipEntries(file) {
  return execFileSync("unzip", ["-Z1", file], { encoding: "utf8" })
    .split(/\r?\n/)
    .filter(Boolean);
}

function which(command) {
  const result = spawnSync("which", [command], { encoding: "utf8" });
  return result.status === 0 ? result.stdout.trim() : null;
}

function numericVersionParts(value) {
  return value.split(/[.-]/).map((part) => Number.parseInt(part, 10) || 0);
}

function findZipalign() {
  const direct = which("zipalign");
  if (direct) return direct;

  const sdk = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT;
  if (!sdk) throw new Error("zipalign not found and ANDROID_HOME/ANDROID_SDK_ROOT is not set.");

  const root = join(sdk, "build-tools");
  const versions = readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort((a, b) => {
      const av = numericVersionParts(a);
      const bv = numericVersionParts(b);
      for (let i = 0; i < Math.max(av.length, bv.length); i++) {
        const delta = (bv[i] ?? 0) - (av[i] ?? 0);
        if (delta !== 0) return delta;
      }
      return 0;
    });

  for (const version of versions) {
    const candidate = join(root, version, process.platform === "win32" ? "zipalign.exe" : "zipalign");
    if (existsSync(candidate)) return candidate;
  }
  throw new Error("No zipalign executable found in Android SDK build-tools.");
}

function findReadelf() {
  for (const command of ["llvm-readelf", "readelf"]) {
    const found = which(command);
    if (found) return found;
  }
  throw new Error("No readelf/llvm-readelf tool found for ELF alignment verification.");
}

function checkElfAlignment(apk, libraries) {
  const checks = [];
  const relevant = libraries.filter((lib) => ABI_64.has(lib.abi));
  if (relevant.length === 0) return checks;

  const readelf = findReadelf();
  const temp = mkdtempSync(join(tmpdir(), "doodlegame-play-"));
  try {
    for (const lib of relevant) {
      const target = join(temp, `${lib.abi}-${basename(lib.name)}`);
      const bytes = execFileSync("unzip", ["-p", apk, lib.entry], { encoding: null });
      writeFileSync(target, bytes);
      const output = execFileSync(readelf, ["-lW", target], { encoding: "utf8" });
      const alignments = parseReadelfLoadAlignments(output);
      if (alignments.length === 0) {
        checks.push({ library: lib.entry, ok: false, detail: "No ELF LOAD segments found." });
        continue;
      }
      const minimum = Math.min(...alignments);
      checks.push({
        library: lib.entry,
        ok: minimum >= 16 * 1024,
        detail: `minimum LOAD alignment = 0x${minimum.toString(16)}`
      });
    }
  } finally {
    rmSync(temp, { recursive: true, force: true });
  }
  return checks;
}

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    const value = argv[i];
    if (value === "--apk") args.apk = argv[++i];
    else if (value === "--aab") args.aab = argv[++i];
    else if (value === "--report-dir") args.reportDir = argv[++i];
    else throw new Error(`Unknown argument: ${value}`);
  }
  return args;
}

function check(name, ok, detail) {
  return { name, ok: Boolean(ok), detail };
}

function writeReports(reportDir, report) {
  mkdirSync(reportDir, { recursive: true });
  writeFileSync(join(reportDir, "play-compliance.json"), JSON.stringify(report, null, 2) + "\n");

  const lines = [
    "# Google Play technical compliance report",
    "",
    `Overall: **${report.ok ? "PASS" : "FAIL"}**`,
    "",
    "## Android configuration",
    "",
    `- applicationId: \`${report.android.applicationId}\``,
    `- minSdk: ${report.android.minSdk}`,
    `- compileSdk: ${report.android.compileSdk}`,
    `- targetSdk: ${report.android.targetSdk}`,
    `- versionName: \`${report.android.versionName}\``,
    `- versionCode: ${report.android.versionCode}`,
    `- AGP: \`${report.android.agpVersion}\``,
    "",
    "## Checks",
    "",
    ...report.checks.map((item) => `- [${item.ok ? "x" : " "}] ${item.name}: ${item.detail}`),
    "",
    "## Native library inventory",
    "",
    report.native.aab.length === 0
      ? "- AAB: no native shared libraries detected (architecture-neutral Java/Kotlin/JS package)."
      : ...[],
  ];

  if (report.native.aab.length > 0) {
    for (const lib of report.native.aab) lines.push(`- AAB: \`${lib.entry}\``);
  }
  if (report.native.apk.length === 0) {
    lines.push("- APK: no native shared libraries detected.");
  } else {
    for (const lib of report.native.apk) lines.push(`- APK: \`${lib.entry}\``);
  }

  if (report.elf.length > 0) {
    lines.push("", "## ELF 16 KB alignment", "");
    for (const item of report.elf) {
      lines.push(`- [${item.ok ? "x" : " "}] \`${item.library}\`: ${item.detail}`);
    }
  }

  lines.push(
    "",
    "## Interpretation",
    "",
    report.native.aab.length === 0
      ? "No native code is packaged. Android documents Java/Kotlin-only apps as already supporting 64-bit and 16 KB devices; zip alignment is still verified for the release APK."
      : "Native code is packaged. 32-bit ABI counterparts, 64-bit ELF LOAD alignment, AGP baseline, and APK 16 KB zip alignment are enforced.",
    ""
  );

  writeFileSync(join(reportDir, "play-compliance.md"), lines.join("\n"));
}

export function main(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  const packageJson = JSON.parse(readFileSync("package.json", "utf8"));
  const reportDir = resolve(args.reportDir || "artifacts/play-compliance");
  const signedApk = "android/app/build/outputs/apk/release/app-release.apk";
  const unsignedApk = "android/app/build/outputs/apk/release/app-release-unsigned.apk";
  const apk = resolve(args.apk || (existsSync(signedApk) ? signedApk : unsignedApk));
  const aab = resolve(args.aab || "android/app/build/outputs/bundle/release/app-release.aab");

  for (const file of [apk, aab, "android/variables.gradle", "android/app/build.gradle", "android/build.gradle"]) {
    if (!existsSync(file)) throw new Error(`Required Play verification input is missing: ${file}`);
  }

  const android = parseAndroidConfig({
    variables: readFileSync("android/variables.gradle", "utf8"),
    appGradle: readFileSync("android/app/build.gradle", "utf8"),
    rootGradle: readFileSync("android/build.gradle", "utf8")
  });

  const expectedVersionCode = Number(process.env.ANDROID_VERSION_CODE || deriveVersionCode(packageJson.version));
  const aabLibraries = nativeLibrariesFromEntries(listZipEntries(aab));
  const apkLibraries = nativeLibrariesFromEntries(listZipEntries(apk));
  const abiProblems = validateAbiPairs(aabLibraries);
  const checks = [
    check("Target SDK", android.targetSdk >= REQUIRED_TARGET_SDK, `${android.targetSdk} >= ${REQUIRED_TARGET_SDK}`),
    check("Compile SDK", android.compileSdk >= REQUIRED_TARGET_SDK, `${android.compileSdk} >= ${REQUIRED_TARGET_SDK}`),
    check("Application ID", android.applicationId === REQUIRED_APP_ID, android.applicationId),
    check("Version name", android.versionName === packageJson.version, `${android.versionName} matches package.json ${packageJson.version}`),
    check("Version code", android.versionCode === expectedVersionCode, `${android.versionCode} matches expected ${expectedVersionCode}`),
    check("Release artifact is AAB", aab.endsWith(".aab"), aab),
    check("AGP 16 KB baseline", compareVersions(android.agpVersion, MIN_16K_AGP) >= 0, `AGP ${android.agpVersion} >= 8.5.1`),
    check(
      "64-bit ABI counterparts",
      abiProblems.length === 0,
      abiProblems.length === 0
        ? (aabLibraries.length === 0 ? "No native libraries; architecture-neutral package." : "All 32-bit native libraries have 64-bit counterparts.")
        : abiProblems.join("; ")
    )
  ];

  let zipalignOk = false;
  let zipalignDetail = "";
  try {
    const zipalign = findZipalign();
    const output = execFileSync(zipalign, ["-c", "-P", "16", "-v", "4", apk], { encoding: "utf8" });
    zipalignOk = /Verification successful/i.test(output);
    zipalignDetail = `${zipalign}: ${zipalignOk ? "Verification successful" : "verification output did not report success"}`;
  } catch (error) {
    zipalignDetail = error instanceof Error ? error.message : String(error);
  }
  checks.push(check("16 KB APK zip alignment", zipalignOk, zipalignDetail));

  let elf = [];
  try {
    elf = checkElfAlignment(apk, apkLibraries);
    const bad = elf.filter((item) => !item.ok);
    checks.push(check(
      "16 KB ELF LOAD alignment",
      bad.length === 0,
      apkLibraries.length === 0
        ? "No native ELF files to validate."
        : bad.length === 0 ? "All 64-bit ELF LOAD segments are aligned to at least 16 KB." : bad.map((item) => item.library).join(", ")
    ));
  } catch (error) {
    checks.push(check("16 KB ELF LOAD alignment", false, error instanceof Error ? error.message : String(error)));
  }

  const report = {
    ok: checks.every((item) => item.ok),
    artifact: { apk, aab },
    android,
    native: { aab: aabLibraries, apk: apkLibraries },
    elf,
    checks
  };
  writeReports(reportDir, report);

  for (const item of checks) {
    console.log(`${item.ok ? "PASS" : "FAIL"}: ${item.name} — ${item.detail}`);
  }
  console.log(`Play compliance report: ${join(reportDir, "play-compliance.md")}`);

  if (!report.ok) process.exitCode = 1;
  return report;
}

const isCli = process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;
if (isCli) main();
