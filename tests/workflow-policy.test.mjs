import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const android=readFileSync(".github/workflows/android.yml","utf8");
const ci=readFileSync(".github/workflows/ci.yml","utf8");

function step(workflow,name){
 const header="      - name: "+name+"\n";
 const start=workflow.indexOf(header);
 assert.ok(start>=0,"missing workflow step: "+name);
 const nextStep=workflow.indexOf("\n      - ",start+header.length);
 const nextJob=workflow.indexOf("\n  emulator-smoke:",start+header.length);
 const boundaries=[nextStep,nextJob].filter(index=>index>=0);
 return workflow.slice(start,boundaries.length?Math.min(...boundaries):workflow.length);
}

test("every PR runs fast CI, while obsolete PR runs can be cancelled",()=>{
 assert.match(ci,/pull_request:\s*\n\s*branches: \[main\]/);
 assert.match(ci,/cancel-in-progress: \$\{\{ github\.event_name == 'pull_request' \}\}/);
 assert.match(android,/pull_request:\s*\n\s*branches: \[main\]/);
 assert.match(android,/cancel-in-progress: \$\{\{ github\.event_name == 'pull_request' \}\}/);
});

test("PRs compile and size-check an Android debug APK without building releases",()=>{
 assert.match(step(android,"Build Android debug APK"),/npm run android:build:debug/);
 assert.doesNotMatch(step(android,"Build Android debug APK"),/if:/);
 assert.match(step(android,"Verify debug APK size"),/app-debug\.apk/);
 assert.doesNotMatch(step(android,"Upload debug APK"),/if: github\.event_name != 'pull_request'/);
 const releaseSteps=[
  "Validate unsigned release APK and AAB",
  "Verify Google Play technical compliance",
  "Audit Google Play privacy surface",
  "Verify monetization guardrail",
  "Verify target audience guardrail",
  "Verify production hardening",
  "Verify Google Play reviewer readiness",
  "Upload reviewer readiness report",
  "Upload production hardening report",
  "Upload privacy audit report",
  "Upload monetization dependency inventory",
  "Upload target audience audit",
  "Upload Google Play compliance report",
  "Report Android artifact sizes"
 ];
 for(const name of releaseSteps){
  assert.match(step(android,name),/if: github\.event_name != 'pull_request'/,name);
 }
});

test("emulator runs after debug APK, but only for main or manual Android runs",()=>{
 const match=android.match(/^  emulator-smoke:\n([\s\S]*?)^    steps:/m);
 assert.ok(match,"missing emulator smoke job");
 assert.match(match[1],/if: github\.event_name != 'pull_request'/);
 assert.match(match[1],/needs: debug-apk/);
 assert.match(android,/push:\s*\n\s*branches: \[main\]/);
 assert.match(android,/workflow_dispatch:/);
 assert.match(step(android,"Run game regression tests for manual runs"),/if: github\.event_name == 'workflow_dispatch'/);
});
