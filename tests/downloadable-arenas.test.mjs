import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {
 ARENA_CATALOG_URL,DOWNLOADED_ARENAS_KEY,parseArenaCatalog,parseDownloadedArena,validArenaSvg,
 loadArenaCatalog,installDownloadedArena,removeDownloadedArena,restoreDownloadedArenas,
 getDownloadedArena,installedArenas
} from "../.test-build/gameplay/DownloadableArenas.js";
import {GameSession} from "../.test-build/gameplay/GameSession.js";

const base="https://raw.githubusercontent.com/abolfazl260/doodlegame/main/public/downloadable-arenas/";
const asset=path=>readFileSync("public/downloadable-arenas/"+path,"utf8");
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
 [base+"neon-city/background.svg",asset("neon-city/background.svg")]
]);
const mockFetch=async url=>{
 if(!responses.has(url))return new Response("Not found",{status:404});
 return new Response(responses.get(url),{status:200});
};
const memory=()=>{
 const data=new Map();
 return {get:key=>data.get(key)??null,set:(key,v)=>data.set(key,v),remove:key=>data.delete(key),has:key=>data.has(key)};
};
const input={getState:()=>({moveX:0,moveY:0,jumpPressed:false,attackHeld:false,attackPressed:false,attackReleased:false,aimUpHeld:false,aimDownHeld:false,weaponNext:false,weaponPrevious:false}),resetTransientState(){},setLocalPvPEnabled(){}};

test("GitHub catalog exposes five optional arenas while 16 bundled arenas remain",async()=>{
 const list=await loadArenaCatalog(mockFetch);
 assert.deepEqual(list.map(x=>x.id),["extra-forest","extra-desert","extra-glacier","extra-volcano","extra-neon-city"]);
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
 assert.match(installed.backgroundSvg,/svg/);
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
test("failed fetch leaves installed state unchanged",async()=>{
 const storage=memory(),list=parseArenaCatalog(JSON.parse(asset("catalog.json")));
 await assert.rejects(installDownloadedArena(list[0],storage,async()=>new Response("",{status:503})));
 assert.equal(storage.get(DOWNLOADED_ARENAS_KEY),null);
});
