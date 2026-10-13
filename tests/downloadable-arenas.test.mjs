import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {
 ARENA_CATALOG_URL,DOWNLOADED_ARENAS_KEY,parseArenaCatalog,parseDownloadedArena,validArenaSvg,
 loadArenaCatalog,installDownloadedArena,removeDownloadedArena,restoreDownloadedArenas,
 getDownloadedArena,installedArenas,validArenaWebp,arenaImageDataUrl,MAX_WEBP_BYTES
} from "../.test-build/gameplay/DownloadableArenas.js";
import {GameSession} from "../.test-build/gameplay/GameSession.js";
import {WEBP_SAMPLE_BASE64,WEBP_SAMPLE_DESCRIPTOR,WEBP_SAMPLE_LISTING} from "./fixtures/downloadable-webp.mjs";

const base="https://raw.githubusercontent.com/abolfazl260/doodlegame/main/public/downloadable-arenas/";
const asset=path=>readFileSync("public/downloadable-arenas/"+path,"utf8");
const binaryAsset=path=>readFileSync("public/downloadable-arenas/"+path);
const webpDescriptor={...JSON.parse(asset("forest/arena.json")),...WEBP_SAMPLE_DESCRIPTOR};
const webpBytes=Buffer.from(WEBP_SAMPLE_BASE64,"base64");
const responses=new Map([
 [ARENA_CATALOG_URL,asset("catalog.json")],
 [base+"forest/arena.json",asset("forest/arena.json")],
 [base+"forest/background.svg",asset("forest/background.svg")],
 [base+"desert/arena.json",asset("desert/arena.json")],
 [base+"desert/background.svg",asset("desert/background.svg")],
 [base+"glacier/arena.json",asset("glacier/arena.json")],
 [base+"glacier/background.svg",asset("glacier/background.svg")],
 [base+"volcano/arena.json",asset("volcano/arena.json")],
 [base+"volcano/background.svg",asset("volcano/background.svg")],
 [base+"neon-city/arena.json",asset("neon-city/arena.json")],
 [base+"neon-city/background.svg",asset("neon-city/background.svg")],
 [base+"webp-demo/arena.json",JSON.stringify(webpDescriptor)],
 [base+"webp-demo/background.webp",webpBytes]
]);
// Serve every catalog entry from the local test fixtures.
for(const e of JSON.parse(asset("catalog.json")).arenas){
 responses.set(base+e.path,asset(e.path));
 const svgPath=e.path.replace(/arena\.json$/,"background.svg");
 responses.set(base+svgPath,asset(svgPath));
}
const mockFetch=async url=>{
 if(!responses.has(url))return new Response("Not found",{status:404});
 return new Response(responses.get(url),{status:200});
};
const memory=()=>{
 const data=new Map();
 return {get:key=>data.get(key)??null,set:(key,v)=>data.set(key,v),remove:key=>data.delete(key),has:key=>data.has(key)};
};
const input={getState:()=>({moveX:0,moveY:0,jumpPressed:false,attackHeld:false,attackPressed:false,attackReleased:false,aimUpHeld:false,aimDownHeld:false,weaponNext:false,weaponPrevious:false}),resetTransientState(){},setLocalPvPEnabled(){}};

test("GitHub catalog exposes 25 optional arenas while 16 bundled arenas remain",async()=>{
 const list=await loadArenaCatalog(mockFetch);
 assert.equal(list.length,25);
 assert.deepEqual(list.slice(0,5).map(x=>x.id),["extra-forest","extra-desert","extra-glacier","extra-volcano","extra-neon-city"]);
 assert.deepEqual(list.slice(0,5).map(x=>x.version),[3,3,3,3,3]);
 assert.ok(list.slice(5).every(x=>x.version===1));
 const session=new GameSession(input);
 assert.equal(session.getRenderState().arena,"classic");
 session.setArena("extra-missing");
 assert.equal(session.getRenderState().arena,"classic","not-yet-downloaded maps cannot be selected");
});
test("download and install two unique arena backgrounds, then use them without network",async()=>{
 const storage=memory(),list=await loadArenaCatalog(mockFetch);
 const installed=await installDownloadedArena(list[0],storage,mockFetch);
 assert.equal(installed.id,"extra-forest");
 assert.equal(installed.arena.platforms.length,4);
 assert.equal(validArenaSvg(installed.backgroundSvg),true);
 assert.equal(installed.backgroundWebp,undefined);
 assert.ok(arenaImageDataUrl(installed).startsWith("data:image/svg+xml;charset=utf-8,"));
 const desert=await installDownloadedArena(list[1],storage,mockFetch);
 assert.notEqual(desert.backgroundSvg,installed.backgroundSvg);
 const session=new GameSession(input);
 session.setArena("extra-forest");
 assert.equal(session.getRenderState().arena,"extra-forest");
 assert.equal(session.getArena().spawnX[0],-8);
 session.setArena("extra-desert");
 assert.equal(session.getRenderState().arena,"extra-desert");
 assert.deepEqual(storage.get(DOWNLOADED_ARENAS_KEY).map(x=>x.id),["extra-forest","extra-desert"]);
 removeDownloadedArena("extra-forest",storage);
 assert.equal(getDownloadedArena("extra-forest"),undefined);
 restoreDownloadedArenas(storage);
 assert.equal(installedArenas().some(x=>x.id==="extra-desert"),true);
 removeDownloadedArena("extra-desert",storage);
});
test("three additional themed maps install from GitHub, play and persist offline",async()=>{
 const storage=memory(),listing=await loadArenaCatalog(mockFetch);
 const newIds=["extra-glacier","extra-volcano","extra-neon-city"];
 const packs=[];
 for(const id of newIds){
  const entry=listing.find(item=>item.id===id);
  assert.ok(entry,`catalog is missing ${id}`);
  const descriptor=JSON.parse(asset(entry.path));
  const background=asset(entry.path.replace(/arena\.json$/,"background.svg"));
  assert.equal(descriptor.id,id);
  assert.equal(descriptor.version,entry.version);
  assert.deepEqual(descriptor.names,entry.names);
  assert.equal(validArenaSvg(background),true);
  const parsed=parseDownloadedArena({...descriptor,backgroundSvg:background});
  assert.ok(parsed,`invalid layout or SVG in ${id}`);
  const pack=await installDownloadedArena(entry,storage,mockFetch);
  assert.equal(pack.arena.platforms.length,descriptor.arena.platforms.length);
  assert.equal(pack.backgroundSvg,background);
  packs.push(pack);
  const session=new GameSession(input);
  session.setArena(id);
  assert.equal(session.getRenderState().arena,id);
  assert.deepEqual(session.getArena().spawnX,[-8,8]);
 }
 assert.equal(new Set(packs.map(pack=>pack.backgroundSvg)).size,3,"all new maps must have different artwork");
 assert.equal(new Set(packs.map(pack=>JSON.stringify(pack.arena.platforms))).size,3,"all three layouts must differ");
 assert.equal(packs[0].arena.platforms[0].surface,"ice");
 assert.equal(packs[1].arena.fallLimit,-5.8);
 assert.equal(packs[2].arena.movingPlatforms,true);
 assert.deepEqual(storage.get(DOWNLOADED_ARENAS_KEY).map(pack=>pack.id),newIds);
 // Same locally saved bytes are usable without another GitHub request.
 restoreDownloadedArenas(storage);
 for(const id of newIds)assert.ok(getDownloadedArena(id),`offline restore failed for ${id}`);
 for(const id of newIds)removeDownloadedArena(id,storage);
});

test("all 20 new GitHub arenas install, play, and restore offline alongside the original five",async()=>{
 const list=await loadArenaCatalog(mockFetch),newEntries=list.slice(5);
 assert.equal(newEntries.length,20);
 const storage=memory(),installed=[],images=new Set(),layouts=new Set();
 try{
  for(const entry of list){
   const descriptor=JSON.parse(asset(entry.path));
   const svg=asset(entry.path.replace(/arena\.json$/,"background.svg"));
   assert.equal(descriptor.id,entry.id);
   assert.deepEqual(descriptor.names,entry.names);
   assert.equal(descriptor.version,entry.version);
   assert.ok(validArenaSvg(svg),entry.id+" SVG validation");
   assert.ok(parseDownloadedArena({...descriptor,backgroundSvg:svg}),entry.id+" layout validation");
   if(newEntries.includes(entry)){
    images.add(svg);layouts.add(JSON.stringify(descriptor.arena.platforms));
   }
   const pack=await installDownloadedArena(entry,storage,mockFetch);
   installed.push(pack.id);
   const game=new GameSession(input);
   game.setArena(pack.id);
   assert.equal(game.getRenderState().arena,pack.id);
   assert.equal(game.getArena().platforms.length,descriptor.arena.platforms.length);
  }
  assert.equal(images.size,20,"unique artwork for every new location");
  assert.equal(layouts.size,20,"unique platform layout for every new location");
  assert.equal(installedArenas().length,25);
  assert.equal(storage.get(DOWNLOADED_ARENAS_KEY).length,25);
  restoreDownloadedArenas(storage);
  assert.equal(installedArenas().length,25);
 }finally{
  for(const id of installed)removeDownloadedArena(id,storage);
 }
});
test("version-2 WebP maps remain usable offline and can upgrade to version-3 SVG",async()=>{
 const storage=memory();
 const former=JSON.parse(asset("forest/arena.json"));
 const cached=parseDownloadedArena({...former,version:2,backgroundWebp:binaryAsset("forest/background.webp").toString("base64")});
 assert.ok(cached);
 storage.set(DOWNLOADED_ARENAS_KEY,[cached]);
 restoreDownloadedArenas(storage);
 assert.equal(getDownloadedArena("extra-forest").backgroundWebp,cached.backgroundWebp);
 const listing=(await loadArenaCatalog(mockFetch))[0];
 const next=await installDownloadedArena(listing,storage,mockFetch);
 assert.equal(next.version,3);
 assert.equal(next.backgroundWebp,undefined);
 assert.equal(validArenaSvg(next.backgroundSvg),true);
 assert.equal(storage.get(DOWNLOADED_ARENAS_KEY)[0].version,3);
 removeDownloadedArena("extra-forest",storage);
});

test("reject invalid layout, SVG script, external references and unsafe paths",()=>{
 const catalog=JSON.parse(asset("catalog.json"));
 assert.throws(()=>parseArenaCatalog({...catalog,arenas:[{...catalog.arenas[0],path:"../../outside.json"}]}));
 assert.throws(()=>parseArenaCatalog({...catalog,arenas:[catalog.arenas[0],catalog.arenas[0]]}));
 const f=JSON.parse(asset("forest/arena.json"));
 const svg=asset("forest/background.svg");
 assert.equal(validArenaSvg(svg),true);
 assert.equal(validArenaSvg(svg.replace("</svg>","<script>alert(1)</script></svg>")),false);
 assert.equal(validArenaSvg(svg.replace("</svg>","<image href='https://evil.invalid/a'/></svg>")),false);
 assert.equal(parseDownloadedArena({...f,backgroundSvg:svg,arena:{...f.arena,platforms:[{x:999,y:0,width:4,height:.3}]}}),null);
 assert.equal(parseDownloadedArena({...f,backgroundSvg:svg,arena:{...f.arena,gravity:999}}),null);
 assert.ok(parseDownloadedArena({...f,backgroundSvg:svg}));
});

test("genuine WebP is validated by RIFF header, codec and dimensions",()=>{
 assert.equal(validArenaWebp(WEBP_SAMPLE_BASE64),true);
 assert.equal(validArenaWebp("garbage"),false);
 assert.equal(validArenaWebp(WEBP_SAMPLE_BASE64.slice(0,-4)),false);
 const bogus=Buffer.from(webpBytes);
 bogus.write("NOPE",8,"ascii");
 assert.equal(validArenaWebp(bogus.toString("base64")),false);
 const oversized=Buffer.alloc(MAX_WEBP_BYTES+1,0);
 assert.equal(validArenaWebp(oversized.toString("base64")),false);
 const badSize=Buffer.from(webpBytes);
 badSize.writeUInt32LE(12,4);
 assert.equal(validArenaWebp(badSize.toString("base64")),false);
 const enormous=Buffer.from(webpBytes);
 enormous[26]=0xff;enormous[27]=0x3f; // 16383px width is not permitted
 assert.equal(validArenaWebp(enormous.toString("base64")),false);
 assert.equal(parseDownloadedArena({...webpDescriptor,backgroundWebp:WEBP_SAMPLE_BASE64,backgroundSvg:"<svg></svg>"}),null);
 assert.equal(parseDownloadedArena({...webpDescriptor,backgroundWebp:"not-a-webp"}),null);
 const complete={...webpDescriptor,backgroundWebp:WEBP_SAMPLE_BASE64};
 assert.ok(parseDownloadedArena(complete));
});

test("WebP downloads use real binary bytes and survive offline persistence",async()=>{
 const storage=memory();
 const installed=await installDownloadedArena(WEBP_SAMPLE_LISTING,storage,mockFetch);
 assert.equal(installed.backgroundWebp,WEBP_SAMPLE_BASE64);
 assert.equal(installed.backgroundSvg,undefined);
 assert.ok(arenaImageDataUrl(installed).startsWith("data:image/webp;base64,"));
 const game=new GameSession(input);
 game.setArena("extra-webp-demo");
 assert.equal(game.getRenderState().arena,"extra-webp-demo");
 assert.equal(storage.get(DOWNLOADED_ARENAS_KEY)[0].backgroundWebp,WEBP_SAMPLE_BASE64);
 restoreDownloadedArenas(storage);
 assert.equal(getDownloadedArena("extra-webp-demo").backgroundWebp,WEBP_SAMPLE_BASE64);
 const refused=memory();
 await assert.rejects(installDownloadedArena(WEBP_SAMPLE_LISTING,refused,async url=>{
  if(url.endsWith("background.webp"))return new Response(new Uint8Array(MAX_WEBP_BYTES+1),{status:200});
  return mockFetch(url);
 }),/size limit/);
 assert.equal(refused.get(DOWNLOADED_ARENAS_KEY),null,"oversized WebP cannot be saved");
 removeDownloadedArena("extra-webp-demo",storage);
});

test("failed fetch leaves installed state unchanged",async()=>{
 const storage=memory(),list=parseArenaCatalog(JSON.parse(asset("catalog.json")));
 await assert.rejects(installDownloadedArena(list[0],storage,async()=>new Response("",{status:503})));
 assert.equal(storage.get(DOWNLOADED_ARENAS_KEY),null);
});
