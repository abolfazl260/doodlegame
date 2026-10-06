import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

export const REVIEW_REQUIRED_PERMISSIONS = new Set([
  "com.google.android.gms.permission.AD_ID",
  "android.permission.ACCESS_FINE_LOCATION",
  "android.permission.ACCESS_COARSE_LOCATION",
  "android.permission.ACCESS_BACKGROUND_LOCATION",
  "android.permission.READ_CONTACTS",
  "android.permission.WRITE_CONTACTS",
  "android.permission.CAMERA",
  "android.permission.RECORD_AUDIO",
  "android.permission.READ_PHONE_STATE",
  "android.permission.READ_MEDIA_IMAGES",
  "android.permission.READ_MEDIA_VIDEO",
  "android.permission.READ_MEDIA_AUDIO",
  "android.permission.READ_EXTERNAL_STORAGE",
  "android.permission.WRITE_EXTERNAL_STORAGE",
  "android.permission.POST_NOTIFICATIONS"
]);

export function parsePermissions(xml) {
  const result = new Set();
  const pattern = /<uses-permission(?:-sdk-\d+)?\b[^>]*android:name=["']([^"']+)["'][^>]*>/g;
  for (const match of xml.matchAll(pattern)) result.add(match[1]);
  return [...result].sort();
}

function walk(root, files = []) {
  if (!existsSync(root)) return files;
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    const path = join(root, entry.name);
    if (entry.isDirectory()) walk(path, files);
    else files.push(path);
  }
  return files;
}

export function releaseManifestCandidates(root = "android/app/build/intermediates") {
  return walk(root)
    .filter((path) => /AndroidManifest\.xml$/.test(path) && /[/\\]release[/\\]/.test(path))
    .sort();
}

export function reviewRequiredPermissions(permissions, allowlist = []) {
  const allowed = new Set(allowlist);
  return permissions.filter((permission) => REVIEW_REQUIRED_PERMISSIONS.has(permission) && !allowed.has(permission));
}

function sortedObject(value) {
  return Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)));
}

export function compareRuntimeDependencies(actual, expected) {
  return JSON.stringify(sortedObject(actual)) === JSON.stringify(sortedObject(expected));
}

function check(name, ok, detail) {
  return { name, ok: Boolean(ok), detail };
}

function writeReports(reportDir, report) {
  mkdirSync(reportDir, { recursive: true });
  writeFileSync(join(reportDir, "privacy-audit.json"), JSON.stringify(report, null, 2) + "\n");
  const lines = [
    "# Google Play privacy audit",
    "",
    `Overall: **${report.ok ? "PASS" : "FAIL"}**`,
    "",
    "## Checks",
    "",
    ...report.checks.map((item) => `- [${item.ok ? "x" : " "}] ${item.name}: ${item.detail}`),
    "",
    "## Merged release permissions",
    "",
    ...report.permissions.map((permission) => `- \`${permission}\``),
    "",
    "## Runtime dependencies",
    "",
    ...Object.entries(report.runtimeDependencies).map(([name, version]) => `- \`${name}\` — \`${version}\``),
    "",
    "## Release manifest evidence",
    "",
    ...report.manifests.map((manifest) => `- \`${manifest}\``),
    ""
  ];
  writeFileSync(join(reportDir, "privacy-audit.md"), lines.join("\n"));
}

export function main() {
  const baselinePath = "docs/play/privacy-baseline.json";
  const dataSafetyPath = "docs/play/data-safety.md";
  const policyPath = "public/privacy.html";
  for (const path of [baselinePath, dataSafetyPath, policyPath, "package.json"]) {
    if (!existsSync(path)) throw new Error(`Privacy audit input is missing: ${path}`);
  }

  const manifests = releaseManifestCandidates();
  if (manifests.length === 0) {
    throw new Error("No merged release AndroidManifest.xml found. Build the Android release before running npm run android:audit:privacy.");
  }

  const packageJson = JSON.parse(readFileSync("package.json", "utf8"));
  const baseline = JSON.parse(readFileSync(baselinePath, "utf8"));
  const dataSafety = readFileSync(dataSafetyPath, "utf8");
  const policy = readFileSync(policyPath, "utf8");

  const permissionSet = new Set();
  for (const manifest of manifests) {
    for (const permission of parsePermissions(readFileSync(manifest, "utf8"))) permissionSet.add(permission);
  }
  const permissions = [...permissionSet].sort();
  const expectedPermissions = [...baseline.releasePermissions].sort();
  const runtimeDependencies = sortedObject(packageJson.dependencies ?? {});
  const sensitive = reviewRequiredPermissions(permissions, baseline.allowedReviewRequiredPermissions ?? []);

  const checks = [
    check(
      "Runtime dependency baseline",
      compareRuntimeDependencies(runtimeDependencies, baseline.runtimeDependencies),
      compareRuntimeDependencies(runtimeDependencies, baseline.runtimeDependencies)
        ? "package.json runtime dependencies match the reviewed Data Safety baseline."
        : "Runtime dependencies changed; review data behavior and update docs/play/privacy-baseline.json + data-safety.md."
    ),
    check(
      "Merged release permission baseline",
      JSON.stringify(permissions) === JSON.stringify(expectedPermissions),
      `actual=[${permissions.join(", ")}] expected=[${expectedPermissions.join(", ")}]`
    ),
    check(
      "No unreviewed sensitive permissions",
      sensitive.length === 0,
      sensitive.length === 0 ? "No sensitive/review-required permissions detected." : sensitive.join(", ")
    ),
    check(
      "Public policy URL",
      policy.includes(baseline.policyUrl) || policy.includes('rel="canonical" href="' + baseline.policyUrl + '"'),
      baseline.policyUrl
    ),
    check(
      "Privacy Policy identifies DoodleGame",
      /DoodleGame Privacy Policy/i.test(policy) && /does not collect or share personal or sensitive user data/i.test(policy),
      "Policy contains app identity and current no-collection disclosure."
    ),
    check(
      "Data Safety document links public policy",
      dataSafety.includes(baseline.policyUrl),
      baseline.policyUrl
    )
  ];

  for (const permission of expectedPermissions) {
    checks.push(check(`Document permission ${permission}`, dataSafety.includes(permission), "Permission must be explained in docs/play/data-safety.md."));
  }
  for (const dependency of Object.keys(runtimeDependencies)) {
    checks.push(check(`Document runtime dependency ${dependency}`, dataSafety.includes(dependency), "Runtime dependency must appear in docs/play/data-safety.md."));
  }

  const report = {
    ok: checks.every((item) => item.ok),
    baseline: baselinePath,
    policyUrl: baseline.policyUrl,
    permissions,
    runtimeDependencies,
    sensitivePermissions: sensitive,
    manifests,
    checks
  };
  const reportDir = resolve("artifacts/privacy-audit");
  writeReports(reportDir, report);

  for (const item of checks) console.log(`${item.ok ? "PASS" : "FAIL"}: ${item.name} — ${item.detail}`);
  console.log(`Privacy audit report: ${join(reportDir, "privacy-audit.md")}`);
  if (!report.ok) process.exitCode = 1;
  return report;
}

const isCli = process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;
if (isCli) main();
