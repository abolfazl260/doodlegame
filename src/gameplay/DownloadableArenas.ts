import type {ArenaDefinition,ArenaId,Platform,PlatformSurface} from "./GameSession.js";
import type {ArenaTheme,ArenaBackdrop,ArenaUiSkin} from "../themes/ArenaThemes.js";
import type {Storage} from "../storage/Storage.js";

export const ARENA_CATALOG_URL="https://raw.githubusercontent.com/abolfazl260/doodlegame/main/public/downloadable-arenas/catalog.json";
const ASSETS_BASE="https://raw.githubusercontent.com/abolfazl260/doodlegame/main/public/downloadable-arenas/";
export const DOWNLOADED_ARENAS_KEY="doodlegame.downloadableArenas.v1";
export const MAX_PACKS=25,MAX_CATALOG_BYTES=16000,MAX_ARENA_BYTES=14000,MAX_IMAGE_BYTES=60000;
// WebP is kept in local device storage as base64; cap raw files to 384 KiB.
export const MAX_WEBP_BYTES=384*1024;
export type DownloadedArenaId=`extra-${string}`;
export type ArenaListing={id:DownloadedArenaId;version:number;names:{fa:string;en:string};path:string};
export type DownloadedArena={schemaVersion:1;id:DownloadedArenaId;version:number;names:{fa:string;en:string};arena:ArenaDefinition;theme:ArenaTheme} & (
 {backgroundSvg:string;backgroundWebp?:never}|{backgroundSvg?:never;backgroundWebp:string});
const packs=new Map<DownloadedArenaId,DownloadedArena>();
const images=new Map<DownloadedArenaId,HTMLImageElement>();
const plain=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==="object"&&!Array.isArray(v);
const num=(v:unknown,min:number,max:number):v is number=>typeof v==="number"&&Number.isFinite(v)&&v>=min&&v<=max;
const str=(v:unknown,max:number):v is string=>typeof v==="string"&&v.trim().length>0&&v.length<=max;
const isId=(id:unknown):id is DownloadedArenaId=>typeof id==="string"&&/^extra-[a-z0-9-]{2,32}$/.test(id);
const color=(v:unknown):v is string=>typeof v==="string"&&/^#[0-9a-fA-F]{6}$/.test(v);
const oneOf=<T extends string>(v:unknown,values:readonly T[]):v is T=>typeof v==="string"&&values.includes(v as T);
const surfaces:readonly PlatformSurface[]=["normal","ice","slippery","oneWay","conveyorLeft","conveyorRight"];
const skins:readonly ArenaUiSkin[]=["doodle","neon","fantasy"];
const backdrops:readonly ArenaBackdrop[]=["sketch","city","clouds","mountains","cavern","industrial"];
function parseNames(v:unknown):{fa:string;en:string}|null{
 return plain(v)&&str(v.fa,45)&&str(v.en,45)?{fa:v.fa,en:v.en}:null;
}
export function parseArenaCatalog(v:unknown):ArenaListing[]{
 if(!plain(v)||v.schemaVersion!==1||!Array.isArray(v.arenas)||v.arenas.length>32)throw new Error("Invalid arena catalog");
 const result:ArenaListing[]=[],seen=new Set<string>();
 for(const e of v.arenas){
  if(!plain(e)||!isId(e.id)||!Number.isSafeInteger(e.version)||!num(e.version,1,1000000))throw new Error("Invalid arena listing");
  const names=parseNames(e.names);
  if(!names||!str(e.path,90)||!/^([a-z0-9-]{2,32})\/arena\.json$/.test(e.path)||seen.has(e.id))throw new Error("Unsafe arena listing");
  seen.add(e.id);result.push({id:e.id,version:e.version,names,path:e.path});
 }
 return result;
}
function parsePlatforms(v:unknown):Platform[]|null{
 if(!Array.isArray(v)||v.length<1||v.length>24)return null;
 const platforms:Platform[]=[];
 for(const p of v){
  if(!plain(p)||!num(p.x,-12,12)||!num(p.y,-8,9)||!num(p.width,.25,24)||!num(p.height,.15,3)||p.x+p.width>12.5||
    (p.surface!==undefined&&!oneOf(p.surface,surfaces)))return null;
  platforms.push({x:p.x,y:p.y,width:p.width,height:p.height,...(p.surface?{surface:p.surface}:{})});
 }
 return platforms;
}
function parseTheme(v:unknown):ArenaTheme|null{
 if(!plain(v)||!oneOf(v.skin,skins)||!oneOf(v.backdrop,backdrops))return null;
 const keys=["skyTop","skyBottom","silhouette","platform","platformEdge","accent","secondary","hudBackground"] as const;
 if(keys.some(k=>!color(v[k])))return null;
 return {skin:v.skin,backdrop:v.backdrop,...Object.fromEntries(keys.map(k=>[k,v[k]]))} as unknown as ArenaTheme;
}
export function validArenaSvg(svg:unknown):svg is string{
 return typeof svg==="string"&&svg.length>=100&&svg.length<=MAX_IMAGE_BYTES&&
  /^\s*<svg\s/i.test(svg)&&/<\/svg>\s*$/.test(svg)&&
  !/<\s*(?:script|foreignObject|iframe|image|use|a|style|animate|set)\b/i.test(svg)&&
  !/\b(?:on[a-z]+|href|xlink:href)\s*=/i.test(svg)&&
  !/(?:<!DOCTYPE|<!ENTITY|@import|javascript:|data:)/i.test(svg);
}
/**
 * Reject oversized/malformed WebP bytes before caching. Check the RIFF size,
 * WebP codec signature and intrinsic pixel dimensions (including VP8X).
 * Image decoding still happens in the browser before the pack is persisted.
 */
export function validArenaWebp(base64:unknown):base64 is string{
 if(typeof base64!=="string"||base64.length<32||base64.length>Math.ceil(MAX_WEBP_BYTES/3)*4||
  base64.length%4!==0||!/^[A-Za-z0-9+/]+={0,2}$/.test(base64))return false;
 let bytes:Uint8Array;
 try{bytes=Uint8Array.from(atob(base64),c=>c.charCodeAt(0));}catch{return false;}
 if(bytes.length<30||bytes.length>MAX_WEBP_BYTES)return false;
 const word=(at:number)=>bytes[at]|(bytes[at+1]<<8)|(bytes[at+2]<<16)|(bytes[at+3]<<24);
 const text=(at:number)=>String.fromCharCode(...bytes.subarray(at,at+4));
 if(text(0)!=="RIFF"||text(8)!=="WEBP"||word(4)!==(bytes.length-8))return false;
 const kind=text(12),chunkSize=word(16);
 if(!["VP8 ","VP8L","VP8X"].includes(kind)||chunkSize<5||chunkSize>bytes.length-20)return false;
 let width=0,height=0;
 if(kind==="VP8 "){
  if(chunkSize<10||bytes[23]!==0x9d||bytes[24]!==0x01||bytes[25]!==0x2a)return false;
  width=(bytes[26]|bytes[27]<<8)&0x3fff;
  height=(bytes[28]|bytes[29]<<8)&0x3fff;
 }else if(kind==="VP8L"){
  if(bytes[20]!==0x2f)return false;
  width=1+(bytes[21]|(bytes[22]&0x3f)<<8);
  height=1+((bytes[22]>>6)|(bytes[23]<<2)|((bytes[24]&0x0f)<<10));
 }else{
  if(chunkSize<10||(bytes[20]&0x02)!==0)return false; // no animated backgrounds
  width=1+bytes[24]+(bytes[25]<<8)+(bytes[26]<<16);
  height=1+bytes[27]+(bytes[28]<<8)+(bytes[29]<<16);
 }
 return width>0&&height>0&&width<=2560&&height<=1440;
}
function bytesToBase64(bytes:Uint8Array):string{
 // Chunked conversion prevents a maximum-call-stack error on Android WebView.
 let binary="";
 for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));
 return btoa(binary);
}
async function fetchWebp(url:string,fetcher:typeof fetch):Promise<Uint8Array>{
 if(!url.startsWith(ASSETS_BASE)||!url.endsWith("/background.webp"))throw new Error("Untrusted WebP URL");
 const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),12000);
 try{
  const response=await fetcher(url,{cache:"no-store",signal:controller.signal,headers:{Accept:"image/webp"}});
  if(!response.ok)throw new Error("WebP download failed: HTTP "+response.status);
  if(Number(response.headers.get("content-length")||0)>MAX_WEBP_BYTES)throw new Error("WebP exceeds size limit");
  // Stream with a hard bound: do not buffer arbitrarily large remote files.
  const reader=response.body?.getReader();
  if(!reader){
   const data=new Uint8Array(await response.arrayBuffer());
   if(data.byteLength>MAX_WEBP_BYTES)throw new Error("WebP exceeds size limit");
   return data;
  }
  const chunks:Uint8Array[]= [];let total=0;
  try{
   while(true){
    const {done,value}=await reader.read();if(done)break;
    total+=value.byteLength;
    if(total>MAX_WEBP_BYTES)throw new Error("WebP exceeds size limit");
    chunks.push(value);
   }
  }catch(e){void reader.cancel().catch(()=>{});throw e;}
  const data=new Uint8Array(total);let offset=0;
  for(const chunk of chunks){data.set(chunk,offset);offset+=chunk.byteLength;}
  return data;
 }finally{clearTimeout(timeout);}
}

export function parseDownloadedArena(v:unknown):DownloadedArena|null{
 if(!plain(v)||v.schemaVersion!==1||!isId(v.id)||!Number.isSafeInteger(v.version)||!num(v.version,1,1000000))return null;
 const names=parseNames(v.names),a=v.arena,theme=parseTheme(v.theme);
 const svg=validArenaSvg(v.backgroundSvg)&&v.backgroundWebp===undefined;
 const webp=typeof v.backgroundWebp==="string"&&v.backgroundSvg===undefined&&validArenaWebp(v.backgroundWebp);
 if(!names||!plain(a)||!theme||(!svg&&!webp))return null;
 const platforms=parsePlatforms(a.platforms);
 if(!platforms||!Array.isArray(a.spawnX)||a.spawnX.length!==2||!num(a.spawnX[0],-11,11)||!num(a.spawnX[1],-11,11)||
  a.spawnX[0]>=a.spawnX[1]||!num(a.speedMultiplier,.6,1.5)||!num(a.jumpMultiplier,.6,1.6)||
  !num(a.gravity,-32,-12)||(a.fallLimit!==null&&!num(a.fallLimit,-9,0))||typeof a.movingPlatforms!=="boolean")return null;
 const arena:ArenaDefinition={id:v.id,name:names.en,platforms,spawnX:[a.spawnX[0],a.spawnX[1]],speedMultiplier:a.speedMultiplier,
  jumpMultiplier:a.jumpMultiplier,gravity:a.gravity,fallLimit:a.fallLimit as number|null,movingPlatforms:a.movingPlatforms};
 const common={schemaVersion:1 as const,id:v.id,version:v.version,names,arena,theme};
 return svg?{...common,backgroundSvg:v.backgroundSvg as string}:{...common,backgroundWebp:v.backgroundWebp as string};
}
export function arenaImageDataUrl(background:DownloadedArena|string){
 if(typeof background!=="string"&&background.backgroundWebp)return "data:image/webp;base64,"+background.backgroundWebp;
 const svg=typeof background==="string"?background:background.backgroundSvg;
 if(!svg)throw new Error("Arena is missing its background");
 return "data:image/svg+xml;charset=utf-8,"+encodeURIComponent(svg);
}
async function prepareImage(pack:DownloadedArena):Promise<HTMLImageElement|null>{
 if(typeof Image==="undefined")return null;
 const img=new Image();
 const ready=new Promise<HTMLImageElement>((resolve,reject)=>{
  img.onload=()=>img.naturalWidth&&img.naturalHeight?resolve(img):reject(new Error("Invalid background dimensions"));
  img.onerror=()=>reject(new Error("Could not decode arena background"));
 });
 img.src=arenaImageDataUrl(pack);return ready;
}
function register(pack:DownloadedArena,img:HTMLImageElement|null){
 packs.set(pack.id,pack);
 if(img)images.set(pack.id,img);else images.delete(pack.id);
}
export function getDownloadedArena(id:ArenaId):DownloadedArena|undefined{return packs.get(id as DownloadedArenaId);}
export function getDownloadedImage(id:ArenaId):HTMLImageElement|undefined{return images.get(id as DownloadedArenaId);}
export function installedArenas():DownloadedArena[]{return [...packs.values()];}
export function restoreDownloadedArenas(storage:Storage){
 let saved:unknown;try{saved=storage.get<unknown>(DOWNLOADED_ARENAS_KEY);}catch{return;}
 if(!Array.isArray(saved))return;
 for(const value of saved.slice(0,MAX_PACKS)){
  const pack=parseDownloadedArena(value);if(!pack)continue;
  register(pack,null);
  void prepareImage(pack).then(img=>{if(packs.get(pack.id)===pack&&img)images.set(pack.id,img);}).catch(()=>{});
 }
}
function persist(storage:Storage){storage.set(DOWNLOADED_ARENAS_KEY,installedArenas());}
export function removeDownloadedArena(id:DownloadedArenaId,storage:Storage){
 const prev=packs.get(id),image=images.get(id)??null;
 packs.delete(id);images.delete(id);
 try{persist(storage);}catch(error){if(prev)register(prev,image);throw error;}
}
async function fetchText(url:string,max:number,fetcher:typeof fetch):Promise<string>{
 if(!url.startsWith(ASSETS_BASE))throw new Error("Untrusted arena URL");
 const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),12000);
 try{
  const response=await fetcher(url,{cache:"no-store",signal:controller.signal,headers:{Accept:"application/json, image/svg+xml"}});
  if(!response.ok)throw new Error("Arena download failed: HTTP "+response.status);
  if(Number(response.headers.get("content-length")||0)>max)throw new Error("Arena download exceeds size limit");
  const body=await response.text();
  if(new TextEncoder().encode(body).length>max)throw new Error("Arena download exceeds size limit");
  return body;
 }finally{clearTimeout(timeout);}
}
export async function loadArenaCatalog(fetcher:typeof fetch=fetch):Promise<ArenaListing[]>{
 return parseArenaCatalog(JSON.parse(await fetchText(ARENA_CATALOG_URL,MAX_CATALOG_BYTES,fetcher)));
}
export async function installDownloadedArena(listing:ArenaListing,storage:Storage,fetcher:typeof fetch=fetch):Promise<DownloadedArena>{
 if(!isId(listing.id)||!/^([a-z0-9-]{2,32})\/arena\.json$/.test(listing.path))throw new Error("Invalid arena path");
 if(!packs.has(listing.id)&&packs.size>=MAX_PACKS)throw new Error(`Maximum of ${MAX_PACKS} downloaded arenas`);
 const descriptor=JSON.parse(await fetchText(ASSETS_BASE+listing.path,MAX_ARENA_BYTES,fetcher)) as unknown;
 if(!plain(descriptor)||descriptor.id!==listing.id||descriptor.version!==listing.version||
  (descriptor.background!=="background.svg"&&descriptor.background!=="background.webp"))throw new Error("Arena descriptor does not match catalog");
 const backgroundUrl=ASSETS_BASE+listing.path.replace(/arena\.json$/,descriptor.background);
 const background=descriptor.background==="background.webp"?
  {backgroundWebp:bytesToBase64(await fetchWebp(backgroundUrl,fetcher))}:
  {backgroundSvg:await fetchText(backgroundUrl,MAX_IMAGE_BYTES,fetcher)};
 const pack=parseDownloadedArena({...descriptor,...background});
 if(!pack)throw new Error("Invalid arena layout or background");
 const img=await prepareImage(pack);
 const prev=packs.get(pack.id),previousImage=images.get(pack.id)??null;
 register(pack,img);
 try{persist(storage);}catch(error){if(prev)register(prev,previousImage);else{packs.delete(pack.id);images.delete(pack.id);}throw error;}
 return pack;
}
