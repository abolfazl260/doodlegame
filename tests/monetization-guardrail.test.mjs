import test from "node:test";
import assert from "node:assert/strict";
import {
 classifyRuntimeDependencies,
 scanTextForMonetization,
 validateMonetizationState
} from "../scripts/ci/verify-monetization.mjs";

const cleanBaseline={
 state:"disabled",
 reviewIssue:25,
 adsEnabled:false,
 billingEnabled:false,
 privacyReviewApproved:false,
 audienceReviewApproved:false,
 sdkPolicyReviewApproved:false,
 consentReviewApproved:false,
 playBillingReviewApproved:false,
 externalPaymentPolicyReviewApproved:false,
 testFiles:[]
};

const cleanArgs={
 baseline:cleanBaseline,
 classified:{ads:[],billing:[],externalPayment:[]},
 codeFindings:[],
 permissions:["android.permission.INTERNET"],
 monetizationDoc:"# Google Play monetization guardrail\n\nCurrent state: disabled\n",
 dataSafetyDoc:"The current game has no account system, analytics, advertising, crash-reporting SDK.",
 privacyRuntimeDependencies:{"three":"1"},
 audienceDocExists:false,
 existingTestFiles:new Set()
};

test("monetization guardrail classifies common Ads, Billing and payment dependencies",()=>{
 const result=classifyRuntimeDependencies({
  "three":"1",
  "@capacitor-community/admob":"1",
  "@revenuecat/purchases-capacitor":"2",
  "stripe":"3"
 });
 assert.deepEqual(result.ads,["@capacitor-community/admob"]);
 assert.deepEqual(result.billing,["@revenuecat/purchases-capacitor"]);
 assert.deepEqual(result.externalPayment,["stripe"]);
});

test("monetization guardrail detects native Ads and Billing APIs",()=>{
 assert.deepEqual(scanTextForMonetization("MobileAds.initialize(this);").map(x=>x.category),["ads"]);
 assert.deepEqual(scanTextForMonetization("BillingClient.newBuilder(context)").map(x=>x.category),["billing"]);
 assert.deepEqual(scanTextForMonetization("const client = new Stripe(key)").map(x=>x.category),["externalPayment"]);
});

test("disabled ad-free baseline passes when no monetization signal exists",()=>{
 const result=validateMonetizationState(cleanArgs);
 assert.equal(result.detected,false);
 assert.deepEqual(result.problems,[]);
});

test("an Ads dependency cannot merge under the disabled baseline",()=>{
 const result=validateMonetizationState({
  ...cleanArgs,
  classified:{ads:["@capacitor-community/admob"],billing:[],externalPayment:[]}
 });
 assert.equal(result.detected,true);
 assert.ok(result.problems.some(x=>/reviewed-enabled/.test(x)));
 assert.ok(result.problems.some(x=>/privacy review/.test(x)));
 assert.ok(result.problems.some(x=>/target-audience review/.test(x)));
 assert.ok(result.problems.some(x=>/consent\/region review/.test(x)));
});

test("AD_ID alone activates the Ads review gate",()=>{
 const result=validateMonetizationState({
  ...cleanArgs,
  permissions:["android.permission.INTERNET","com.google.android.gms.permission.AD_ID"]
 });
 assert.equal(result.detected,true);
 assert.ok(result.categories.includes("ads"));
 assert.ok(result.problems.length>0);
});

test("reviewed monetization requires policy docs and real test evidence",()=>{
 const baseline={
  ...cleanBaseline,
  state:"reviewed-enabled",
  adsEnabled:true,
  privacyReviewApproved:true,
  audienceReviewApproved:true,
  sdkPolicyReviewApproved:true,
  consentReviewApproved:true,
  testFiles:["tests/ads.test.mjs"]
 };
 const result=validateMonetizationState({
  ...cleanArgs,
  baseline,
  classified:{ads:["admob-sdk"],billing:[],externalPayment:[]},
  monetizationDoc:"Current state: reviewed-enabled\nIssue #25",
  dataSafetyDoc:"admob-sdk",
  privacyRuntimeDependencies:{"admob-sdk":"1"},
  audienceDocExists:true,
  existingTestFiles:new Set(["tests/ads.test.mjs"])
 });
 assert.deepEqual(result.problems,[]);
});
