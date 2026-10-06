import test from "node:test";
import assert from "node:assert/strict";
import {
  compareVersions,
  deriveVersionCode,
  nativeLibrariesFromEntries,
  parseAndroidConfig,
  parseReadelfLoadAlignments,
  validateAbiPairs
} from "../scripts/android/verify-play.mjs";

test("Play verifier derives deterministic Android version codes",()=>{
  assert.equal(deriveVersionCode("0.1.0"),1000);
  assert.equal(deriveVersionCode("2.14.7"),2_014_007);
});

test("Play verifier parses generated Android configuration",()=>{
  const parsed=parseAndroidConfig({
    variables:"minSdkVersion = 24\ncompileSdkVersion = 36\ntargetSdkVersion = 36",
    appGradle:'applicationId "com.abolfazl.doodlegame"\nversionCode = 1000\nversionName = "0.1.0"',
    rootGradle:"classpath 'com.android.tools.build:gradle:8.13.0'"
  });
  assert.deepEqual(parsed,{
    minSdk:24,compileSdk:36,targetSdk:36,
    applicationId:"com.abolfazl.doodlegame",versionCode:1000,versionName:"0.1.0",agpVersion:"8.13.0"
  });
  assert.ok(compareVersions(parsed.agpVersion,[8,5,1])>=0);
});

test("Play verifier inventories native libraries in APK and AAB paths",()=>{
  const libs=nativeLibrariesFromEntries([
    "base/lib/armeabi-v7a/libfoo.so",
    "base/lib/arm64-v8a/libfoo.so",
    "assets/index.html"
  ]);
  assert.deepEqual(libs.map(({abi,name})=>({abi,name})),[
    {abi:"armeabi-v7a",name:"libfoo.so"},
    {abi:"arm64-v8a",name:"libfoo.so"}
  ]);
  assert.deepEqual(validateAbiPairs(libs),[]);
});

test("Play verifier rejects a 32-bit native fixture without its 64-bit counterpart",()=>{
  const libs=nativeLibrariesFromEntries(["base/lib/armeabi-v7a/libbad.so"]);
  const problems=validateAbiPairs(libs);
  assert.ok(problems.length>=1);
  assert.match(problems.join("\n"),/arm64-v8a/);
});

test("Play verifier recognizes 16 KB ELF LOAD alignment and rejects 4 KB",()=>{
  const aligned=parseReadelfLoadAlignments(" LOAD 0x0 0x0 0x0 0x100 0x100 R E 0x4000\n LOAD 0x4000 0x4000 0x4000 0x100 0x100 RW 0x4000");
  const unaligned=parseReadelfLoadAlignments(" LOAD 0x0 0x0 0x0 0x100 0x100 R E 0x1000");
  assert.ok(aligned.every(value=>value>=16384));
  assert.ok(unaligned.some(value=>value<16384));
});
