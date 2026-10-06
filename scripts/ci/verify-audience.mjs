import {existsSync,mkdirSync,readFileSync,readdirSync,writeFileSync} from "node:fs";
import {extname,join,resolve} from "node:path";
import {pathToFileURL} from "node:url";
import {parsePermissions,releaseManifestCandidates} from "../android/privacy-audit.mjs";

const IDENTIFIER_PATTERNS=[
 ["Advertising ID",/\bAdvertisingIdClient\b|\bAdvertisingIdInfo\b/],
 ["Android ID",/Settings\.Secure\.ANDROID_ID|\bANDROID_ID\b/],
 ["device serial",/Build\.SERIAL|Build\.getSerial\s*\(/],
 ["IMEI/device ID",/\bgetImei\s*\(|\bgetMeid\s*\(|\bgetDeviceId\s*\(/],
 ["subscriber/SIM ID",/\bgetSubscriberId\s*\(|\bgetSimSerialNumber\s*\(/],
 ["Wi-Fi hardware/network ID",/\bgetMacAddress\s*\(|\bgetBSSID\s*\(|\bgetSSID\s*\(/]
];

const CHILD_MARKETING_PATTERNS=[
 /\bfor kids\b/i,
 /\bfor children\b/i,
 /\bkids game\b/i,
 /\bchildren'?s game\b/i,
 /\btoddler\b/i,
 /\bfamily[- ]friendly game\b/i,
 /\bdesigned for (?:young )?children\b/i
];

function walk(root,files=[]){
 if(!existsSync(root))return files;
 for(const entry of readdirSync(root,{withFileTypes:true})){
  const path=join(root,entry.name);
  if(entry.isDirectory())walk(path,files);else files.push(path);
 }
 return files;
}

function stable(value){return JSON.stringify(Object.fromEntries(Object.entries(value).sort(([a],[b])=>a.localeCompare(b))));}

export function findIdentifierSignals(text){
 return IDENTIFIER_PATTERNS.filter(([,pattern])=>pattern.test(text)).map(([name])=>name);
}

export function findChildDirectedMarketing(text){
 return CHILD_MARKETING_PATTERNS.filter(pattern=>pattern.test(text)).map(pattern=>pattern.source);
}

export function validateAudienceState({
 baseline,
 permissions=[],
 identifierFindings=[],
 marketingFindings=[],
 runtimeDependencies={},
 privacyRuntimeDependencies={},
 audienceDoc=""
}){
 const problems=[];
 const expectedGroups=["13-15","16-17","18+"];
 if(baseline.reviewIssue!==22)problems.push("reviewIssue must remain 22.");
 if(JSON.stringify(baseline.targetAgeGroups)!==JSON.stringify(expectedGroups))problems.push("Target age groups must match the reviewed 13+ profile.");
 if(baseline.under13Targeted!==false)problems.push("Current profile must not target users under 13.");
 if(baseline.minorAudienceIncluded!==true)problems.push("Current profile includes teen minors and must record that explicitly.");
 if(baseline.playFamiliesChildAgeGroupsSelected!==false)problems.push("No under-13 Google Play age group should be selected for this profile.");
 if(baseline.localLawReviewRequired!==true)problems.push("Local-law review for minors must remain explicit.");

 const blocked=new Set(baseline.blockedPermissions??[]);
 const blockedPresent=permissions.filter(permission=>blocked.has(permission));
 if(blockedPresent.length)problems.push("Blocked audience-sensitive permissions detected: "+blockedPresent.join(", "));
 if(identifierFindings.length)problems.push("Device identifier access detected: "+identifierFindings.map(x=>x.signal+"@"+x.path).join(", "));
 if(marketingFindings.length)problems.push("Child-directed marketing copy detected: "+marketingFindings.map(x=>x.path).join(", "));

 if(stable(runtimeDependencies)!==stable(privacyRuntimeDependencies)){
  problems.push("Runtime dependencies differ from the reviewed privacy baseline; review privacy and audience impact together.");
 }

 const requiredPhrases=[
  /Ages 13.?15/i,
  /Ages 16.?17/i,
  /18 and over/i,
  /not designed for users under 13/i,
  /stylized\/fantasy stick-figure combat: yes/i,
  /blood: no/i,
  /gore\/dismemberment: no/i,
  /ads: no/i,
  /in-app purchases: no/i
 ];
 for(const pattern of requiredPhrases)if(!pattern.test(audienceDoc))problems.push("audience.md is missing required reviewed content: "+pattern);

 return{blockedPresent,problems};
}

function collectPermissions(){
 const manifests=releaseManifestCandidates();
 const candidates=manifests.length?manifests:(existsSync("android/app/src/main/AndroidManifest.xml")?["android/app/src/main/AndroidManifest.xml"]:[]);
 const set=new Set();
 for(const path of candidates)for(const permission of parsePermissions(readFileSync(path,"utf8")))set.add(permission);
 return{permissions:[...set].sort(),manifests:candidates};
}

function collectIdentifierFindings(){
 const files=[
  ...walk("src"),
  ...walk("android/app/src")
 ].filter(path=>[".ts",".js",".mjs",".java",".kt"].includes(extname(path)));
 const findings=[];
 for(const path of files){
  const text=readFileSync(path,"utf8");
  for(const signal of findIdentifierSignals(text))findings.push({path,signal});
 }
 return findings;
}

function collectMarketingFindings(){
 const candidates=["README.md","index.html",...walk("src/i18n")].filter(path=>existsSync(path));
 const findings=[];
 for(const path of candidates){
  const text=readFileSync(path,"utf8");
  const signals=findChildDirectedMarketing(text);
  if(signals.length)findings.push({path,signals});
 }
 return findings;
}

function check(name,ok,detail){return{name,ok:Boolean(ok),detail};}

function writeReport(dir,report){
 mkdirSync(dir,{recursive:true});
 writeFileSync(join(dir,"audience-audit.json"),JSON.stringify(report,null,2)+"\n");
 const lines=[
  "# Google Play target audience audit","",
  `Overall: **${report.ok?"PASS":"FAIL"}**`,"",
  `Target age groups: ${report.targetAgeGroups.join(", ")}`,
  `Under 13 targeted: **${report.under13Targeted?"yes":"no"}**`,"",
  "## Checks","",
  ...report.checks.map(item=>`- [${item.ok?"x":" "}] ${item.name}: ${item.detail}`),
  "","## Android permissions","",
  ...(report.permissions.length?report.permissions.map(x=>`- \`${x}\``):["- none found"]),
  "","## Identifier findings","",
  ...(report.identifierFindings.length?report.identifierFindings.map(x=>`- ${x.signal} — \`${x.path}\``):["- none"]),
  "","## Child-directed marketing findings","",
  ...(report.marketingFindings.length?report.marketingFindings.map(x=>`- \`${x.path}\``):["- none"]),
  ""
 ];
 writeFileSync(join(dir,"audience-audit.md"),lines.join("\n"));
}

export function main(){
 const required=[
  "package.json",
  "docs/play/audience-baseline.json",
  "docs/play/audience.md",
  "docs/play/privacy-baseline.json"
 ];
 for(const path of required)if(!existsSync(path))throw new Error(`Audience audit input missing: ${path}`);

 const pkg=JSON.parse(readFileSync("package.json","utf8"));
 const baseline=JSON.parse(readFileSync("docs/play/audience-baseline.json","utf8"));
 const privacyBaseline=JSON.parse(readFileSync("docs/play/privacy-baseline.json","utf8"));
 const audienceDoc=readFileSync("docs/play/audience.md","utf8");
 const runtimeDependencies=pkg.dependencies??{};
 const {permissions,manifests}=collectPermissions();
 const identifierFindings=collectIdentifierFindings();
 const marketingFindings=collectMarketingFindings();
 const validation=validateAudienceState({
  baseline,
  permissions,
  identifierFindings,
  marketingFindings,
  runtimeDependencies,
  privacyRuntimeDependencies:privacyBaseline.runtimeDependencies??{},
  audienceDoc
 });

 const checks=[
  check("Issue #22 review pointer",baseline.reviewIssue===22,`reviewIssue=${baseline.reviewIssue}`),
  check("Reviewed target age profile",validation.problems.length===0,validation.problems.length?validation.problems.join("; "):"13+ profile, SDKs, permissions and copy match the reviewed audience decision."),
  check("Merged/static manifest inspected",manifests.length>0,manifests.length?manifests.join(", "):"No Android manifest available.")
 ];
 const report={
  ok:checks.every(item=>item.ok),
  targetAgeGroups:baseline.targetAgeGroups,
  under13Targeted:baseline.under13Targeted,
  minorAudienceIncluded:baseline.minorAudienceIncluded,
  permissions,
  manifests,
  identifierFindings,
  marketingFindings,
  runtimeDependencies,
  problems:validation.problems,
  checks
 };
 const dir=resolve("artifacts/audience-audit");
 writeReport(dir,report);
 for(const item of checks)console.log(`${item.ok?"PASS":"FAIL"}: ${item.name} — ${item.detail}`);
 console.log(`Audience audit: ${join(dir,"audience-audit.md")}`);
 if(!report.ok)process.exitCode=1;
 return report;
}

const isCli=process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href;
if(isCli)main();
