import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {
  compareRuntimeDependencies,
  parsePermissions,
  reviewRequiredPermissions
} from "../scripts/android/privacy-audit.mjs";

test("privacy audit parses normal and sdk-scoped Android permissions",()=>{
  const xml='<manifest xmlns:android="http://schemas.android.com/apk/res/android"><uses-permission android:name="android.permission.INTERNET"/><uses-permission-sdk-23 android:name="android.permission.CAMERA"/></manifest>';
  assert.deepEqual(parsePermissions(xml),["android.permission.CAMERA","android.permission.INTERNET"]);
});

test("privacy audit rejects unreviewed sensitive permission fixtures",()=>{
  assert.deepEqual(reviewRequiredPermissions(["android.permission.INTERNET"]),[]);
  assert.deepEqual(reviewRequiredPermissions(["android.permission.CAMERA"]),["android.permission.CAMERA"]);
  assert.deepEqual(reviewRequiredPermissions(["android.permission.CAMERA"],["android.permission.CAMERA"]),[]);
});

test("privacy audit requires explicit review when runtime dependencies change",()=>{
  assert.equal(compareRuntimeDependencies({"three":"1"},{"three":"1"}),true);
  assert.equal(compareRuntimeDependencies({"three":"1","analytics-sdk":"1"},{"three":"1"}),false);
});

test("public privacy policy is static, identifies DoodleGame and contains no tracking scripts",()=>{
  const html=readFileSync(new URL("../public/privacy.html",import.meta.url),"utf8");
  assert.match(html,/DoodleGame Privacy Policy/);
  assert.match(html,/does not collect or share personal or sensitive user data/i);
  assert.doesNotMatch(html,/<script\b/i);
  assert.doesNotMatch(html,/google-analytics|gtag\(|facebook pixel|segment\.com/i);
});
