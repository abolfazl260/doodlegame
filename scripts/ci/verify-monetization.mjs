import {existsSync,mkdirSync,readFileSync,readdirSync,writeFileSync} from "node:fs";
import {extname,join,relative,resolve} from "node:path";
import {pathToFileURL} from "node:url";
import {parsePermissions,releaseManifestCandidates} from "../android/privacy-audit.mjs";

const ADS_DEPENDENCY_PATTERNS=[
 /admob/i,
 /google[-_/]?mobile[-_/]?ads/i,
 /play[-_.]?services[-_.]?ads/i,
 /applovin/i,
 /ironsource/i,
 /unity[-_/]?ads/i,
 /facebook[-_/]?(?:audience|ads)/i,
 /meta[-_/]?(?:audience|ads)/i
];
const BILLING_DEPENDENCY_PATTERNS=[
 /billing/i,
 /in[-_/]?app[-_/]?purchase/i,
 /(?:^|[-_/])iap(?:$|[-_/])/i,
 /revenuecat/i,
 /purchases[-_/]?capacitor/i,
 /cordova[-_/]?plugin[-_/]?purchase/i
];
const EXTERNAL_PAYMENT_PATTERNS=[
 /stripe/i,
 /paypal/i,
 /paddle/i,
 /braintree/i,
 /razorpay/i
];
const TEXT_SIGNAL_PATTERNS=[
 {category:"ads",label:"Google Mobile Ads",pattern:/com\.google\.android\.gms(?::play-services-ads|\.ads)|\bMobileAds\b|\bRewardedAd\b|\bInterstitialAd\b|\bAdView\b/},
 {category:"billing",label:"Google Play Billing",pattern:/com\.android\.billingclient(?::billing|\.api)|\bBillingClient\b|\bProductDetails\b|\bPurchasesUpdatedListener\b|com\.android\.vending\.BILLING/},
 {category:"externalPayment",label:"External payment SDK",pattern:/\bStripe\b|\bPayPal\b|\bBraintree\b|\bPaddle\b|\bRazorpay\b/}
];
const MONETIZATION_PERMISSIONS=new Set([
 "com.google.android.gms.permission.AD_ID",
 "com.android.vending.BILLING"
]);

function sortedObject(value){return Object.fromEntries(Object.entries(value).sort(([a],[b])=>a.localeCompare(b)));}

function matchesAny(name,patterns){return patterns.some(pattern=>pattern.test(name));}

export function classifyRuntimeDependencies(dependencies={}){
 const result={ads:[],billing:[],externalPayment:[]};
 for(const name of Object.keys(dependencies).sort()){
  if(matchesAny(name,ADS_DEPENDENCY_PATTERNS))result.ads.push(name);
  if(matchesAny(name,BILLING_DEPENDENCY_PATTERNS))result.billing.push(name);
  if(matchesAny(name,EXTERNAL_PAYMENT_PATTERNS))result.externalPayment.push(name);
 }
 return result;
}

export function scanTextForMonetization(text){
 return TEXT_SIGNAL_PATTERNS
  .filter(item=>item.pattern.test(text))
  .map(item=>({category:item.category,label:item.label}));
}

function walk(root,files=[]){
 if(!existsSync(root))return files;
 for(const entry of readdirSync(root,{withFileTypes:true})){
  const path=join(root,entry.name);
  if(entry.isDirectory())walk(path,files);else files.push(path);
 }
 return files;
}

function sourceCandidates(){
 const files=[
  ...walk("src"),
  ...walk("android/app/src"),
  "capacitor.config.ts",
  "scripts/android/configure.mjs"
 ].filter(path=>existsSync(path));
 return [...new Set(files)].filter(path=>[".ts",".js",".mjs",".java",".kt",".gradle",".kts",".xml"].includes(extname(path)));
}

function manifestCandidates(){
 const merged=releaseManifestCandidates();
 if(merged.length)return merged;
 const staticManifest="android/app/src/main/AndroidManifest.xml";
 return existsSync(staticManifest)?[staticManifest]:[];
}

function collectPermissions(){
 const set=new Set();
 for(const path of manifestCandidates()){
  for(const permission of parsePermissions(readFileSync(path,"utf8")))set.add(permission);
 }
 return [...set].sort();
}

function collectCodeFindings(){
 const findings=[];
 for(const path of sourceCandidates()){
  const text=readFileSync(path,"utf8");
  for(const signal of scanTextForMonetization(text))findings.push({path,category:signal.category,label:signal.label});
 }
 return findings;
}

function candidateDependencies(classified){
 return [...new Set([...classified.ads,...classified.billing,...classified.externalPayment])].sort();
}

export function validateMonetizationState({
 baseline,
 classified,
 codeFindings=[],
 permissions=[],
 monetizationDoc="",
 dataSafetyDoc="",
 privacyRuntimeDependencies={},
 audienceDocExists=false,
 existingTestFiles=new Set()
}){
 const problems=[];
 const permissionSignals=permissions.filter(permission=>MONETIZATION_PERMISSIONS.has(permission));
 const categories=new Set([
  ...(classified.ads.length?["ads"]:[]),
  ...(classified.billing.length?["billing"]:[]),
  ...(classified.externalPayment.length?["externalPayment"]:[]),
  ...codeFindings.map(item=>item.category),
  ...(permissionSignals.includes("com.google.android.gms.permission.AD_ID")?["ads"]:[]),
  ...(permissionSignals.includes("com.android.vending.BILLING")?["billing"]:[])
 ]);
 const detected=categories.size>0;
 const candidates=candidateDependencies(classified);

 if(baseline.reviewIssue!==25)problems.push("reviewIssue must remain 25.");
 if(!/Current state:\s*(?:disabled|reviewed-enabled)/i.test(monetizationDoc))problems.push("docs/play/monetization.md must declare the current state.");

 if(!detected){
  if(baseline.state!=="disabled")problems.push("No monetization is detected, so baseline state must be disabled.");
  if(baseline.adsEnabled||baseline.billingEnabled)problems.push("Ads/Billing flags must be false while monetization is disabled.");
  if(baseline.externalPaymentPolicyReviewApproved)problems.push("External payment approval must be false while monetization is disabled.");
  if(!/Current state:\s*disabled/i.test(monetizationDoc))problems.push("Monetization documentation must say Current state: disabled.");
  if(!/(no account system, analytics, advertising|no .*advertising)/i.test(dataSafetyDoc))problems.push("Data Safety inventory must document the current no-advertising state.");
  return{detected,categories:[...categories].sort(),permissionSignals,candidates,problems};
 }

 if(baseline.state!=="reviewed-enabled")problems.push("Monetization detected: set state to reviewed-enabled only after completing Issue #25 review.");
 if(!baseline.privacyReviewApproved)problems.push("Monetization detected: privacy review is required.");
 if(!baseline.audienceReviewApproved)problems.push("Monetization detected: target-audience review is required.");
 if(!baseline.sdkPolicyReviewApproved)problems.push("Monetization detected: SDK/policy review is required.");
 if(!audienceDocExists)problems.push("Monetization detected: docs/play/audience.md is required.");

 if(categories.has("ads")){
  if(!baseline.adsEnabled)problems.push("Ads signals detected but adsEnabled is false.");
  if(!baseline.consentReviewApproved)problems.push("Ads signals detected: consent/region review is required.");
 }
 if(categories.has("billing")){
  if(!baseline.billingEnabled)problems.push("Billing signals detected but billingEnabled is false.");
  if(!baseline.playBillingReviewApproved)problems.push("Billing signals detected: Google Play Billing review is required.");
 }
 if(categories.has("externalPayment")&&!baseline.externalPaymentPolicyReviewApproved){
  problems.push("External payment signals detected: explicit Google Play policy review is required.");
 }

 const tests=Array.isArray(baseline.testFiles)?baseline.testFiles:[];
 if(tests.length===0)problems.push("Monetization detected: list automated monetization tests in testFiles.");
 for(const path of tests)if(!existingTestFiles.has(path))problems.push(`Monetization test file is missing: ${path}`);

 for(const dependency of candidates){
  if(!(dependency in privacyRuntimeDependencies))problems.push(`Monetization dependency is not in privacy baseline: ${dependency}`);
  if(!dataSafetyDoc.includes(dependency))problems.push(`Monetization dependency is not documented in Data Safety inventory: ${dependency}`);
 }
 if(!/Current state:\s*reviewed-enabled/i.test(monetizationDoc))problems.push("Monetization documentation must say Current state: reviewed-enabled.");
 if(!/#25|Issue 25|Issue #25/i.test(monetizationDoc))problems.push("Monetization documentation must reference Issue #25.");

 return{detected,categories:[...categories].sort(),permissionSignals,candidates,problems};
}

function check(name,ok,detail){return{name,ok:Boolean(ok),detail};}

function writeReport(dir,report){
 mkdirSync(dir,{recursive:true});
 writeFileSync(join(dir,"monetization-inventory.json"),JSON.stringify(report,null,2)+"\n");
 const lines=[
  "# Google Play monetization guardrail","",
  `Overall: **${report.ok?"PASS":"FAIL"}**`,"",
  `Baseline state: \`${report.baselineState}\``,
  `Monetization detected: **${report.detected?"yes":"no"}**`,"",
  "## Runtime dependencies","",
  ...Object.entries(report.runtimeDependencies).map(([name,version])=>`- \`${name}\` — \`${version}\``),
  "","## Monetization signals","",
  `- dependency candidates: ${report.candidateDependencies.length?report.candidateDependencies.map(x=>`\`${x}\``).join(", "):"none"}`,
  `- code/Gradle findings: ${report.codeFindings.length}`,
  `- monetization permissions: ${report.permissionSignals.length?report.permissionSignals.map(x=>`\`${x}\``).join(", "):"none"}`,
  "","## Checks","",
  ...report.checks.map(item=>`- [${item.ok?"x":" "}] ${item.name}: ${item.detail}`),
  ""
 ];
 writeFileSync(join(dir,"monetization-inventory.md"),lines.join("\n"));
}

export function main(){
 const required=[
  "package.json",
  "docs/play/monetization-baseline.json",
  "docs/play/monetization.md",
  "docs/play/privacy-baseline.json",
  "docs/play/data-safety.md"
 ];
 for(const path of required)if(!existsSync(path))throw new Error(`Monetization guardrail input is missing: ${path}`);

 const pkg=JSON.parse(readFileSync("package.json","utf8"));
 const baseline=JSON.parse(readFileSync("docs/play/monetization-baseline.json","utf8"));
 const privacyBaseline=JSON.parse(readFileSync("docs/play/privacy-baseline.json","utf8"));
 const monetizationDoc=readFileSync("docs/play/monetization.md","utf8");
 const dataSafetyDoc=readFileSync("docs/play/data-safety.md","utf8");
 const runtimeDependencies=sortedObject(pkg.dependencies??{});
 const classified=classifyRuntimeDependencies(runtimeDependencies);
 const codeFindings=collectCodeFindings();
 const permissions=collectPermissions();
 const testFiles=new Set((baseline.testFiles??[]).filter(path=>existsSync(path)));

 const validation=validateMonetizationState({
  baseline,
  classified,
  codeFindings,
  permissions,
  monetizationDoc,
  dataSafetyDoc,
  privacyRuntimeDependencies:privacyBaseline.runtimeDependencies??{},
  audienceDocExists:existsSync("docs/play/audience.md"),
  existingTestFiles:testFiles
 });

 const checks=[
  check("Issue #25 review pointer",baseline.reviewIssue===25,`reviewIssue=${baseline.reviewIssue}`),
  check("Current dependency/code/permission guardrail",validation.problems.length===0,validation.problems.length?validation.problems.join("; "):"No unreviewed monetization surface detected."),
  check("Runtime dependency inventory captured",Object.keys(runtimeDependencies).length>0,`${Object.keys(runtimeDependencies).length} runtime dependencies inventoried.`)
 ];
 const report={
  ok:checks.every(item=>item.ok),
  baselineState:baseline.state,
  detected:validation.detected,
  categories:validation.categories,
  runtimeDependencies,
  classifiedDependencies:classified,
  candidateDependencies:validation.candidates,
  codeFindings,
  permissions,
  permissionSignals:validation.permissionSignals,
  problems:validation.problems,
  checks
 };
 const dir=resolve("artifacts/monetization-guardrail");
 writeReport(dir,report);

 for(const item of checks)console.log(`${item.ok?"PASS":"FAIL"}: ${item.name} — ${item.detail}`);
 console.log(`Monetization inventory: ${join(dir,"monetization-inventory.md")}`);
 if(!report.ok)process.exitCode=1;
 return report;
}

const isCli=process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href;
if(isCli)main();
