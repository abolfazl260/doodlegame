import assert from "node:assert/strict";
import { test } from "node:test";

import { resolveReleaseVersionCode } from "../scripts/android/release-version-code.mjs";

test("each GitHub release run gets a larger versionCode", () => {
  assert.equal(resolveReleaseVersionCode({ runNumber: "1", runAttempt: "1" }), 1_000_101);
  assert.equal(resolveReleaseVersionCode({ runNumber: "2", runAttempt: "1" }), 1_000_201);
  assert.equal(resolveReleaseVersionCode({ runNumber: "2", runAttempt: "2" }), 1_000_202);
  assert.ok(
    resolveReleaseVersionCode({ runNumber: "42", runAttempt: "1" })
      > resolveReleaseVersionCode({ runNumber: "41", runAttempt: "99" })
  );
});

test("a manually supplied Google Play code takes precedence", () => {
  assert.equal(resolveReleaseVersionCode({ manualCode: "2000000" }), 2_000_000);
  assert.equal(resolveReleaseVersionCode({ runNumber: "7", manualCode: "" }), 1_000_701);
});

test("invalid version codes are rejected instead of producing an upload", () => {
  assert.throws(() => resolveReleaseVersionCode({}), /GITHUB_RUN_NUMBER/);
  assert.throws(() => resolveReleaseVersionCode({ runNumber: "0" }), /GITHUB_RUN_NUMBER/);
  assert.throws(() => resolveReleaseVersionCode({ runNumber: "1", runAttempt: "100" }), /GITHUB_RUN_ATTEMPT/);
  assert.throws(() => resolveReleaseVersionCode({ manualCode: "1.3" }), /Requested versionCode/);
  assert.throws(() => resolveReleaseVersionCode({ manualCode: "2100000001" }), /Requested versionCode/);
  assert.throws(() => resolveReleaseVersionCode({ runNumber: "21000000" }), /Google Play limit/);
});
