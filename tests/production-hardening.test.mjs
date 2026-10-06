import test from "node:test";
import assert from "node:assert/strict";
import {normalizeComponentName,parseApplication,parseComponents,scanTextForRisks} from "../scripts/android/verify-production.mjs";

test("production verifier parses release application flags",()=>{
 const app=parseApplication('<manifest><application android:debuggable="false" android:usesCleartextTraffic="false" android:allowBackup="false"></application></manifest>');
 assert.equal(app.debuggable,"false");
 assert.equal(app.usesCleartextTraffic,"false");
 assert.equal(app.allowBackup,"false");
});

test("production verifier audits exported components",()=>{
 const xml='<manifest><application><activity android:name=".MainActivity" android:exported="true"></activity><provider android:name="x.Provider" android:exported="false"></provider><receiver android:name="x.Safe" android:exported="true" android:permission="android.permission.DUMP"></receiver></application></manifest>';
 const components=parseComponents(xml);
 assert.equal(components.length,3);
 assert.equal(normalizeComponentName(components[0].name),"com.abolfazl.doodlegame.MainActivity");
 assert.equal(components[2].permission,"android.permission.DUMP");
});

test("production verifier catches dev endpoints and secret signatures",()=>{
 assert.deepEqual(scanTextForRisks("https://localhost:5173 @vite/client"),["localhost","Vite HMR client"]);
 assert.ok(scanTextForRisks("-----BEGIN PRIVATE KEY-----").includes("private key"));
 assert.deepEqual(scanTextForRisks("https://abolfazl260.github.io/doodlegame/privacy.html"),[]);
});
