import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const android=readFileSync(".github/workflows/android.yml","utf8");
const ci=readFileSync(".github/workflows/ci.yml","utf8");
const release=readFileSync(".github/workflows/android-release.yml","utf8");

function step(workflow,name){
 const header="      - name: "+name+"\n";
 const start=workflow.indexOf(header);
 assert.ok(start>=0,"missing workflow step: "+name);
 const nextStep=workflow.indexOf("\n      - ",start+header.length);
 const nextJob=workflow.indexOf("\n  emulator-smoke:",start+header.length);
 const boundaries=[nextStep,nextJob].filter(index=>index>=0);
 return workflow.slice(start,boundaries.length?Math.min(...boundaries):workflow.length);
}

test("routine pull requests retain fast source CI without starting Android builds",()=>{
 assert.match(ci,/pull_request:\s*\n\s*branches: \[main\]/);
 assert.match(ci,/cancel-in-progress: \$\{\{ github\.event_name == 'pull_request' \}\}/);
 assert.doesNotMatch(android,/^  (push|pull_request|schedule):/m,
  "Android workflow must not run on commits, merges, PRs or timers");
 assert.match(android,/^  workflow_dispatch:\s*$/m);
 assert.match(android,/cancel-in-progress: false/);
});

test("a manually requested Android build includes debug APK, release checks and emulator tests",()=>{
 assert.match(step(android,"Run game regression tests for manual runs"),/npm test/);
 assert.match(step(android,"Build Android debug APK"),/npm run android:build:debug/);
 assert.match(step(android,"Verify debug APK size"),/app-debug\.apk/);
 assert.match(step(android,"Upload debug APK"),/doodlegame-debug-apk/);
 assert.match(step(android,"Validate unsigned release APK and AAB"),/assembleRelease bundleRelease/);
 assert.match(step(android,"Verify Google Play technical compliance"),/npm run android:verify:play/);
 assert.match(step(android,"Audit Google Play privacy surface"),/npm run android:audit:privacy/);
 const emulator=android.match(/^  emulator-smoke:\n([\s\S]*?)^    steps:/m);
 assert.ok(emulator,"manual build must retain emulator smoke checks");
 assert.match(emulator[1],/needs: debug-apk/);
 assert.match(android,/android-emulator-runner@v2/);
 assert.match(android,/scripts\/android\/emulator-smoke\.sh/);
});

test("official Android releases remain explicitly requested or triggered by release tags",()=>{
 assert.match(release,/workflow_dispatch:/);
 assert.match(release,/push:\s*\n\s*tags:/);
 assert.doesNotMatch(release,/pull_request:/);
 assert.doesNotMatch(release,/branches:\s*\[main\]/);
 assert.match(step(release,"Run game regression tests"),/npm test/);
});
