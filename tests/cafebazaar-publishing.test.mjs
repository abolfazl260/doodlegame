import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";

test("Bazaar API, signing and workflow guards pass offline Python regression tests", () => {
  const result = spawnSync("python3", [
    "-m", "unittest", "discover", "-s", "tool/tests",
    "-p", "test_cafebazaar*.py", "-v"
  ], { encoding: "utf8", timeout: 30_000 });
  assert.equal(result.status, 0, (result.stdout ?? "") + "\n" + (result.stderr ?? ""));
});

test("Cafe Bazaar workflow is manual-only, isolated and gated before build", () => {
  const yaml = readFileSync(".github/workflows/cafebazaar-publish.yml", "utf8");
  assert.match(yaml, /^on:\n  workflow_dispatch:/m);
  for (const forbidden of ["push:", "pull_request:", "workflow_call:", "schedule:", "bundleRelease", "assembleDebug"]) {
    assert.ok(!yaml.includes("\n  " + forbidden), "Forbidden trigger " + forbidden);
  }
  const confirmation = yaml.indexOf("Gate operator confirmation before building");
  const build = yaml.indexOf("Assemble signed release APK only");
  assert.ok(confirmation > 0 && build > confirmation);
  assert.match(yaml, /ref: main/);
  assert.match(yaml, /cancel-in-progress: false/);
  assert.match(yaml, /confirm_publish:/);
  assert.match(yaml, /resume_existing_draft:/);
  assert.match(yaml, /expected_draft_id:/);
  assert.match(yaml, /retention-days: 14/);
  assert.match(yaml, /secrets\.CAFEBAZAAR_PISHKHAN_API_SECRET/);
  assert.match(yaml, /secrets\.ANDROID_KEYSTORE_BASE64/);
  assert.match(yaml, /CAFEBAZAAR_EXPECTED_CERT_SHA256/);
  assert.ok(!yaml.includes("PIXELHUB_UPLOAD_"));
  assert.ok(!yaml.includes("workflow_run:"));
  const opens = (yaml.match(/\$\{\{/g) ?? []).length;
  const closes = (yaml.match(/\}\}/g) ?? []).length;
  assert.equal(opens, closes, "GitHub Actions expressions must be balanced");
});

test("Cafe Bazaar publication starts fail-closed without known source version history", () => {
  const ledger = JSON.parse(readFileSync("config/cafebazaar-release.json", "utf8"));
  const pkg = JSON.parse(readFileSync("package.json", "utf8"));
  assert.equal(ledger.versionName, pkg.version);
  assert.equal(ledger.versionCode, null, "The initial code must not be guessed");
  assert.equal(ledger.highestPreviouslySubmittedVersionCode, null,
    "Store history must be explicitly confirmed before the first publication");
});
