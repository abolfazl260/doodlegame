import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {SCENIC_ARENA_IDS,SCENIC_ARENA_SCENES} from "../.test-build/themes/ScenicArenaArt.js";
import {svgBackdropInnerMarkup} from "../.test-build/themes/SimplifiedSvgBackdrops.js";
import {arenaPreviewSvg,BUILT_IN_PREVIEW_IDS} from "../.test-build/ui/ArenaPreviews.js";
import {ARENA_THEMES} from "../.test-build/themes/ArenaThemes.js";
import {getBuiltInArenaPreviewDefinition,GameSession} from "../.test-build/gameplay/GameSession.js";
import {ARENAS as LAN_ARENAS,decodeLobby} from "../.test-build/network/Protocol.js";
import {I18n} from "../.test-build/i18n/I18n.js";

const names=["alpine-lake","dusk-valley","autumn-valley","ember-river"];
const input={getState(){return{moveX:0,moveY:0,pointerX:0,pointerY:0,pointerDown:false,pointerPressed:false,pointerReleased:false,attackHeld:false,attackPressed:false,jumpPressed:false,dashPressed:false,weaponNextPressed:false,weaponPreviousPressed:false};},getPlayer2State(){return this.getState();},endFrame(){}};

test("the four illustrated landscapes are distinct offline SVGs and share in-game previews",()=>{
 assert.deepEqual(SCENIC_ARENA_IDS,names);
 const signatures=new Set();
 for(const id of names){
  const svg=SCENIC_ARENA_SCENES[id];
  assert.ok(svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg"'),id);
  assert.ok(svg.length>2000,"rich layered scene "+id);
  assert.match(svg,/<path\b/);
  assert.match(svg,/linearGradient/);
  assert.doesNotMatch(svg,/<(?:image|script|foreignObject|iframe)\b|(?:href|xlink:href)\s*=|url\(https?:/i);
  const inner=svgBackdropInnerMarkup(id);
  assert.ok(inner&&inner.length>2000);
  assert.ok(arenaPreviewSvg(id).includes(inner),"arena picker and gameplay share scene");
  assert.ok(BUILT_IN_PREVIEW_IDS.includes(id));
  assert.ok(ARENA_THEMES[id]);
  signatures.add(inner);
 }
 assert.equal(signatures.size,4,"every scene has unique vector mountain shapes");
});
test("four landscape maps use safe, fair arena geometry and persist selection",()=>{
 const definitions=getBuiltInArenaPreviewDefinition();
 const s=new GameSession(input);
 for(const id of names){
  const {arena,environment}=definitions[id];
  assert.ok(arena.platforms.length>=4);
  assert.equal(arena.platforms[0].width,24);
  assert.equal(arena.spawnX[0],-arena.spawnX[1]);
  assert.equal(arena.fallLimit,null);
  assert.deepEqual(environment,[]);
  s.setArena(id);
  s.reset(false);
  assert.equal(s.getRenderState().arena,id);
  assert.ok(s.getRenderState().player.x<s.getRenderState().opponent.x);
 }
 s.dispose();
});
test("LAN protocol accepts each new offline arena without public matchmaking",()=>{
 assert.equal(new Set(LAN_ARENAS).size,20);
 for(const id of names){
  assert.ok(LAN_ARENAS.includes(id));
  const result=decodeLobby({arena:id,mode:"duel",hostReady:false,guestReady:false,phase:"lobby",epoch:0,remaining:0,match:0,hostCharacter:"soldier",guestCharacter:"ninja",hostWeapon:"blade",guestWeapon:"blade"});
  assert.equal(result.arena,id);
 }
});
test("both locales label the new arenas and renderers use their shared cached backdrop",()=>{
 const oldDocument=globalThis.document;
 globalThis.document={documentElement:{lang:"",dir:""}};
 try{
  const i18n=new I18n({get(){return "en";},set(){}});
  for(const locale of ["en","fa"]){
   i18n.setLocale(locale);
   for(const id of names)assert.ok(i18n.messages.arenas[id].length>3);
  }
 }finally{
  if(oldDocument===undefined)delete globalThis.document;
  else globalThis.document=oldDocument;
 }
 for(const file of ["src/rendering/CanvasRenderer.ts","src/rendering/ThreeRenderer.ts"]){
  const source=readFileSync(new URL("../"+file,import.meta.url),"utf8");
  assert.match(source,/paintArenaBackdrop/);
  assert.match(source,/svgBackdropRevision/);
 }
});
