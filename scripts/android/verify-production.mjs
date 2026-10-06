import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { extname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { parsePermissions, releaseManifestCandidates } from "./privacy-audit.mjs";

const APP_ID="com.abolfazl.doodlegame";
const ALLOWED_EXPORTED_WITHOUT_PERMISSION=new Set([`${APP_ID}.MainActivity`]);
const TEXT_EXTENSIONS=new Set([".html",".js",".css",".json",".xml",".txt"]);
const DEV_PATTERNS=[
  ["localhost",/\blocalhost\b/i],
  ["loopback IPv4",/\b127\.0\.0\.1\b/],
  ["Android emulator host",/\b10\.0\.2\.2\b/],
  ["WebSocket dev URL",/\bws:\/\//i],
  ["Vite HMR client",/@vite\/client|vite-hmr|__vite_ping/i],
  ["live reload",/live[-_ ]?reload/i]
];
const SECRET_PATTERNS=[
  ["private key",/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/],
  ["AWS access key",/\bAKIA[0-9A-Z]{16}\b/],
  ["GitHub token",/\bgh[pousr]_[A-Za-z0-9_]{30,}\b/],
  ["Google API key",/\bAIza[0-9A-Za-z_-]{35}\b/]
];

function attrs(text){
  const out={};
  for(const match of text.matchAll(/(?:android:)?([\w.-]+)\s*=\s*["']([^"']*)["']/g))out[match[1]]=match[2];
  return out;
}
export function parseApplication(xml){
  const match=/<application\b([^>]*)>/m.exec(xml);
  if(!match)throw new Error("Merged release manifest has no <application> element.");
  return attrs(match[1]);
}
export function parseComponents(xml){
  const items=[];
  const pattern=/<(activity|activity-alias|service|receiver|provider)\b([^>]*)>/g;
  for(const match of xml.matchAll(pattern)){
    const a=attrs(match[2]);
    items.push({type:match[1],name:a.name??"",exported:a.exported??null,permission:a.permission??a.readPermission??a.writePermission??null});
  }
  return items;
}
export function normalizeComponentName(name){
  if(name.startsWith("."))return APP_ID+name;
  if(name&&!name.includes("."))return `${APP_ID}.${name}`;
  return name;
}
export function scanTextForRisks(text){
  const findings=[];
  for(const [name,pattern] of [...DEV_PATTERNS,...SECRET_PATTERNS])if(pattern.test(text))findings.push(name);
  return findings;
}
function walk(root,files=[]){
  if(!existsSync(root))return files;
  for(const entry of readdirSync(root,{withFileTypes:true})){
    const path=join(root,entry.name);
    if(entry.isDirectory())walk(path,files);else files.push(path);
  }
  return files;
}
function pickManifest(){
  const candidates=releaseManifestCandidates();
  const matches=candidates.map(path=>({path,xml:readFileSync(path,"utf8")})).filter(item=>/MainActivity/.test(item.xml)&&/<application\b/.test(item.xml));
  if(matches.length===0)throw new Error("No merged app release AndroidManifest.xml found.");
  matches.sort((a,b)=>b.xml.length-a.xml.length);
  return matches[0];
}
function check(name,ok,detail){return{name,ok:Boolean(ok),detail};}
function falseLike(value){return value==null||value==="false";}
function writeReport(dir,report,manifestXml){
  mkdirSync(dir,{recursive:true});
  writeFileSync(join(dir,"production-hardening.json"),JSON.stringify(report,null,2)+"\n");
  writeFileSync(join(dir,"merged-release-manifest.xml"),manifestXml);
  const lines=[
    "# Google Play production hardening report","",
    `Overall: **${report.ok?"PASS":"FAIL"}**`,"",
    "## Checks","",
    ...report.checks.map(x=>`- [${x.ok?"x":" "}] ${x.name}: ${x.detail}`),
    "","## Exported components","",
    ...report.components.map(x=>`- \`${x.type}\` \`${x.name}\` — exported=${x.exported??"(absent)"}${x.permission?` — permission=\`${x.permission}\``:""}`),
    "","## Release permissions","",
    ...report.permissions.map(x=>`- \`${x}\``),
    "","## Scanned release web files","",
    `- files: ${report.webFiles}`,
    `- source maps: ${report.sourceMaps.length}`,
    `- dev/secret findings: ${report.riskFindings.length}`,""
  ];
  writeFileSync(join(dir,"production-hardening.md"),lines.join("\n"));
}
export function main(){
  for(const path of ["docs/play/privacy-baseline.json","capacitor.config.ts","android/app/src/main/java/com/abolfazl/doodlegame/MainActivity.java","android/app/src/main/res/values/strings.xml"]){
    if(!existsSync(path))throw new Error(`Production verification input missing: ${path}`);
  }
  const {path:manifestPath,xml}=pickManifest();
  const app=parseApplication(xml),components=parseComponents(xml);
  const baseline=JSON.parse(readFileSync("docs/play/privacy-baseline.json","utf8"));
  const permissions=parsePermissions(xml).sort();
  const expectedPermissions=[...baseline.releasePermissions].sort();
  const cap=readFileSync("capacitor.config.ts","utf8");
  const activity=readFileSync("android/app/src/main/java/com/abolfazl/doodlegame/MainActivity.java","utf8");
  const strings=readFileSync("android/app/src/main/res/values/strings.xml","utf8");
  const webRoot="android/app/src/main/assets/public";
  const webFiles=walk(webRoot);
  const sourceMaps=webFiles.filter(path=>path.endsWith(".map"));
  const riskFindings=[];
  for(const path of webFiles){
    if(!TEXT_EXTENSIONS.has(extname(path)))continue;
    const text=readFileSync(path,"utf8");
    for(const risk of scanTextForRisks(text))riskFindings.push({path,risk});
  }

  const exportedProblems=[];
  for(const c of components){
    const normalized=normalizeComponentName(c.name);
    if(c.exported==null)exportedProblems.push(`${c.type} ${normalized||"(unnamed)"} has no explicit android:exported`);
    else if(c.exported==="true"&&!ALLOWED_EXPORTED_WITHOUT_PERMISSION.has(normalized)&&!c.permission){
      exportedProblems.push(`${c.type} ${normalized} is exported without an access permission`);
    }
  }

  const checks=[
    check("Release debuggable is false",falseLike(app.debuggable),`android:debuggable=${app.debuggable??"(absent/default false)"}`),
    check("Release testOnly is false",falseLike(app.testOnly),`android:testOnly=${app.testOnly??"(absent/default false)"}`),
    check("Cleartext traffic disabled",app.usesCleartextTraffic==="false",`android:usesCleartextTraffic=${app.usesCleartextTraffic}`),
    check("Hardware acceleration enabled",app.hardwareAccelerated==="true",`android:hardwareAccelerated=${app.hardwareAccelerated}`),
    check("Cloud backup disabled",app.allowBackup==="false",`android:allowBackup=${app.allowBackup}`),
    check("Legacy backup rules explicit",app.fullBackupContent==="@xml/doodlegame_backup_rules",String(app.fullBackupContent)),
    check("Android 12+ extraction rules explicit",app.dataExtractionRules==="@xml/doodlegame_data_extraction_rules",String(app.dataExtractionRules)),
    check("Exported component policy",exportedProblems.length===0,exportedProblems.length?exportedProblems.join("; "):"All components explicitly declare exported; only launcher may be exported without a permission."),
    check("Release permission allowlist",JSON.stringify(permissions)===JSON.stringify(expectedPermissions),`actual=[${permissions.join(", ")}] expected=[${expectedPermissions.join(", ")}]`),
    check("Production app label",/name="app_name">DoodleGame<\/string>/.test(strings), "app_name = DoodleGame"),
    check("WebView debugging build-gated",/setWebContentsDebuggingEnabled\(BuildConfig\.DEBUG\)/.test(activity),"Release BuildConfig.DEBUG=false explicitly disables remote WebView debugging."),
    check("WebView file access disabled",/setAllowFileAccess\(false\)/.test(activity),"setAllowFileAccess(false)"),
    check("WebView content access disabled",/setAllowContentAccess\(false\)/.test(activity),"setAllowContentAccess(false)"),
    check("Navigation allowlist is explicit",/allowNavigation\s*:\s*\[\s*\]/.test(cap)&&!/\burl\s*:/.test(cap),"No extra in-WebView origins and no dev server URL."),
    check("No Android release source maps",sourceMaps.length===0,sourceMaps.length?sourceMaps.join(", "):"No .map files packaged."),
    check("No dev URLs or embedded secret signatures",riskFindings.length===0,riskFindings.length?riskFindings.map(x=>`${x.risk}@${x.path}`).join("; "):"No blocked patterns found.")
  ];

  const report={ok:checks.every(x=>x.ok),manifestPath,application:app,components,permissions,webFiles:webFiles.length,sourceMaps,riskFindings,checks};
  const dir=resolve("artifacts/production-hardening");
  writeReport(dir,report,xml);
  for(const item of checks)console.log(`${item.ok?"PASS":"FAIL"}: ${item.name} — ${item.detail}`);
  console.log(`Production hardening report: ${join(dir,"production-hardening.md")}`);
  if(!report.ok)process.exitCode=1;
  return report;
}
const isCli=process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href;
if(isCli)main();
