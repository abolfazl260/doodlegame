import test from "node:test";
import assert from "node:assert/strict";
import {
 findChildDirectedMarketing,
 findIdentifierSignals,
 validateAudienceState
} from "../scripts/ci/verify-audience.mjs";

const baseline={
 reviewIssue:22,
 targetAgeGroups:["13-15","16-17","18+"],
 under13Targeted:false,
 minorAudienceIncluded:true,
 playFamiliesChildAgeGroupsSelected:false,
 localLawReviewRequired:true,
 blockedPermissions:[
  "com.google.android.gms.permission.AD_ID",
  "android.permission.ACCESS_FINE_LOCATION",
  "android.permission.ACCESS_COARSE_LOCATION",
  "android.permission.ACCESS_BACKGROUND_LOCATION",
  "android.permission.READ_PHONE_STATE"
 ]
};
const audienceDoc=`# Google Play target audience / Families profile
Ages 13–15
Ages 16–17
Ages 18 and over
The game is not designed for users under 13.
stylized/fantasy stick-figure combat: yes
blood: no
gore/dismemberment: no
ads: no
in-app purchases: no
`;

test("audience gate detects direct device identifier APIs",()=>{
 assert.deepEqual(findIdentifierSignals("AdvertisingIdClient.getAdvertisingIdInfo(context)"),["Advertising ID"]);
 assert.deepEqual(findIdentifierSignals("Settings.Secure.ANDROID_ID"),["Android ID"]);
 assert.deepEqual(findIdentifierSignals("telephonyManager.getImei()"),["IMEI/device ID"]);
});

test("audience gate detects child-directed marketing copy",()=>{
 assert.ok(findChildDirectedMarketing("A fun game for kids").length>0);
 assert.deepEqual(findChildDirectedMarketing("A minimalist arcade duel game"),[]);
});

test("reviewed 13+ profile passes with the current dependency/permission surface",()=>{
 const result=validateAudienceState({
  baseline,
  permissions:["android.permission.INTERNET"],
  identifierFindings:[],
  marketingFindings:[],
  runtimeDependencies:{"three":"1"},
  privacyRuntimeDependencies:{"three":"1"},
  audienceDoc
 });
 assert.deepEqual(result.problems,[]);
});

test("AD_ID or location permissions fail the audience gate",()=>{
 const result=validateAudienceState({
  baseline,
  permissions:["com.google.android.gms.permission.AD_ID","android.permission.ACCESS_FINE_LOCATION"],
  identifierFindings:[],
  marketingFindings:[],
  runtimeDependencies:{"three":"1"},
  privacyRuntimeDependencies:{"three":"1"},
  audienceDoc
 });
 assert.ok(result.problems.some(x=>/Blocked audience-sensitive permissions/.test(x)));
});

test("device identifier access fails even without an Android permission",()=>{
 const result=validateAudienceState({
  baseline,
  permissions:["android.permission.INTERNET"],
  identifierFindings:[{path:"src/example.ts",signal:"Android ID"}],
  marketingFindings:[],
  runtimeDependencies:{"three":"1"},
  privacyRuntimeDependencies:{"three":"1"},
  audienceDoc
 });
 assert.ok(result.problems.some(x=>/Device identifier access/.test(x)));
});

test("runtime SDK changes require privacy and audience review together",()=>{
 const result=validateAudienceState({
  baseline,
  permissions:["android.permission.INTERNET"],
  identifierFindings:[],
  marketingFindings:[],
  runtimeDependencies:{"three":"1","analytics-sdk":"2"},
  privacyRuntimeDependencies:{"three":"1"},
  audienceDoc
 });
 assert.ok(result.problems.some(x=>/Runtime dependencies differ/.test(x)));
});
