import {execFileSync} from "node:child_process";
import {existsSync,mkdirSync,readFileSync,readdirSync,writeFileSync} from "node:fs";
import {extname,join,relative,resolve} from "node:path";
import {pathToFileURL} from "node:url";

const BLOCKED_DEPENDENCY=/auth|firebase|supabase|billing|stripe|admob|ads|analytics|telemetry/i;
const NETWORK_API=/\bfetch\s*\(|\bXMLHttpRequest\b|\bWebSocket\b|\bEventSource\b|\bsendBeacon\s*\(/;
const REMOTE_RESOURCE=/<(?:script|img|audio|video|source)\b[^>]*\bsrc=["']https?:\/\//i;
const REMOTE_LINK=/<link\b(?=[^>]*\brel=["'](?:stylesheet|preload|modulepreload|icon)["'])[^>]*\bhref=["']https?:\/\//i;
const REMOTE_CSS=/url\(\s*["']?https?:\/\//i;

function walk(root,files=[]){
 if(!existsSync(root))return files;
 for(const entry of readdirSync(root,{withFileTypes:true})){
  const path=join(root,entry.name);
  if(entry.isDirectory())walk(path,files);else files.push(path);
 }
 return files;
}
export function scanSourceForNetworkApi(text){return NETWORK_API.test(text);}
export function hasRemoteRuntimeResource(text,extension){
 return extension===".html"?(REMOTE_RESOURCE.test(text)||REMOTE_LINK.test(text)):extension===".css"?REMOTE_CSS.test(text):false;
}
export function blockedDependencies(dependencies){return Object.keys(dependencies).filter(name=>BLOCKED_DEPENDENCY.test(name));}
function check(name,ok,detail){return{name,ok:Boolean(ok),detail};}
function zipEntries(path){return execFileSync("unzip",["-Z1",path],{encoding:"utf8"}).split(/\r?\n/).filter(Boolean);}
function writeReport(dir,report){
 mkdirSync(dir,{recursive:true});
 writeFileSync(join(dir,"review-readiness.json"),JSON.stringify(report,null,2)+"\n");
 const lines=["# Google Play reviewer readiness report","",`Overall: **${report.ok?"PASS":"FAIL"}**`,"","## Checks","",...report.checks.map(x=>`- [${x.ok?"x":" "}] ${x.name}: ${x.detail}`),"","## Evidence","",`- packaged web files: ${report.distFiles}`,`- source network API findings: ${report.networkFindings.length}`,`- remote runtime resource findings: ${report.remoteFindings.length}`,""];
 writeFileSync(join(dir,"review-readiness.md"),lines.join("\n"));
}
export function main(){
 const aab="android/app/build/outputs/bundle/release/app-release.aab";
 const reviewerDoc="docs/play/reviewer-access.md";
 const mainPath="src/main.ts";
 for(const path of [aab,reviewerDoc,mainPath,"package.json","dist/index.html"])if(!existsSync(path))throw new Error(`Review readiness input missing: ${path}`);

 const distRoot=resolve("dist");
 const dist=walk(distRoot);
 const entries=new Set(zipEntries(aab));
 const missingFromAab=[];
 for(const file of dist){
  const rel=relative(distRoot,file).replace(/\\/g,"/");
  if(!entries.has(`base/assets/public/${rel}`))missingFromAab.push(rel);
 }

 const remoteFindings=[];
 for(const file of dist){
  const ext=extname(file);
  if(ext!==".html"&&ext!==".css")continue;
  const text=readFileSync(file,"utf8");
  if(hasRemoteRuntimeResource(text,ext))remoteFindings.push(relative(distRoot,file));
 }

 const networkFindings=[];
 for(const file of walk("src")){
  if(![".ts",".js"].includes(extname(file)))continue;
  const text=readFileSync(file,"utf8");
  if(scanSourceForNetworkApi(text))networkFindings.push(file);
 }

 const pkg=JSON.parse(readFileSync("package.json","utf8"));
 const blocked=blockedDependencies(pkg.dependencies??{});
 const reviewer=readFileSync(reviewerDoc,"utf8");
 const main=readFileSync(mainPath,"utf8");
 const checks=[
  check("All built game assets are packaged in AAB",missingFromAab.length===0,missingFromAab.length?missingFromAab.join(", "):`${dist.length} dist files mirrored under base/assets/public`),
  check("No CDN/runtime remote resources",remoteFindings.length===0,remoteFindings.length?remoteFindings.join(", "):"HTML/CSS resources are local."),
  check("Core source has no network API dependency",networkFindings.length===0,networkFindings.length?networkFindings.join(", "):"No fetch/XHR/WebSocket/EventSource/sendBeacon usage."),
  check("No auth/paywall/ads dependency",blocked.length===0,blocked.length?blocked.join(", "):"No blocked runtime dependency."),
  check("Reviewer access declaration",reviewer.includes("All functionality is available without special access"),"Play Console App Access wording is documented."),
  check("Offline behavior documented",/offline/i.test(reviewer)&&/(no account|does not require an account|without an account)/i.test(reviewer),"Reviewer guide documents offline/no-account operation."),
  check("Boot error state exists",main.includes("showBootError")&&main.includes("Startup timed out."),"Startup failure cannot remain on an indefinite Loading screen."),
  check("WebGL fallback exists",main.includes("new ThreeRenderer")&&main.includes("new CanvasRenderer"),"Canvas fallback remains available."),
  check("Menu keyboard start exists",/event\.code==="Enter"/.test(main)&&main.includes("game.start()"),"Emulator/reviewer can start gameplay without pointer automation.")
 ];
 const report={ok:checks.every(x=>x.ok),distFiles:dist.length,missingFromAab,remoteFindings,networkFindings,blockedDependencies:blocked,checks};
 const dir=resolve("artifacts/review-readiness");
 writeReport(dir,report);
 for(const item of checks)console.log(`${item.ok?"PASS":"FAIL"}: ${item.name} — ${item.detail}`);
 if(!report.ok)process.exitCode=1;
 return report;
}
const isCli=process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href;
if(isCli)main();
