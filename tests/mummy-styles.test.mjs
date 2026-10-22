import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {GameSession} from "../.test-build/gameplay/GameSession.js";
import {MUMMY_STYLE_IDS,MUMMY_STYLE_NAMES} from "../.test-build/gameplay/MummyStyles.js";
import {fighterVisual,characterSkinLayers,fighterInkPalette} from "../.test-build/rendering/FighterVisual.js";

const idle={moveX:0,moveY:0,pointerX:0,pointerY:0,pointerDown:false,pointerPressed:false,pointerReleased:false,
 attackHeld:false,jumpPressed:false,dashPressed:false,attackPressed:false,weaponNextPressed:false,weaponPreviousPressed:false};
const session=()=>{
 const input={getState:()=>({...idle}),getPlayer2State:()=>({...idle}),endFrame(){},setLocalPvPEnabled(){}};
 return new GameSession(input);
};

test("all six illustrated Mummy variants are available without adding fighter classes or weapons",()=>{
 assert.deepEqual(MUMMY_STYLE_IDS,["classic","royal","cursed","scarab","desert","sentinel"]);
 for(const id of MUMMY_STYLE_IDS){
  assert.ok(MUMMY_STYLE_NAMES[id].en);
  assert.ok(MUMMY_STYLE_NAMES[id].fa);
 }
 const source=readFileSync(new URL("../src/gameplay/GameSession.ts",import.meta.url),"utf8");
 assert.match(source,/export type CharacterId="soldier"\|"ninja"\|"viking"\|"ranger"\|"pharaoh"\|"knight"\|"mummy"\|"archer"/);
});

test("Mummy styles affect only cosmetics and survive reset/rematch",()=>{
 const s=session();
 assert.equal(s.setMummyStyle(1,"royal"),false,"must select Mummy first");
 s.setCharacterId("mummy");
 assert.equal(s.setMummyStyle(1,"royal"),true);
 assert.equal(s.setMummyStyle(1,"not-a-style"),false);
 assert.equal(s.setMummyStyle(2,"cursed"),false,"P2 is only selectable in local PvP");
 s.setLocalPvP(true);
 s.setPlayer2CharacterId("mummy");
 assert.equal(s.setMummyStyle(2,"sentinel"),true);
 s.reset(false);
 let state=s.getRenderState();
 assert.equal(state.player.mummyStyle,"royal");
 assert.equal(state.opponent.mummyStyle,"sentinel");
 assert.equal(state.player.maxHealth,100);
 assert.equal(state.opponent.maxHealth,100);
 assert.equal(state.player.weapon,"blade");
 assert.equal(state.opponent.weapon,"blade");
 assert.equal(s.getHudState().mummyStyle,"royal");
 assert.equal(s.getHudState().secondMummyStyle,"sentinel");
 s.setStartingWeapon("bow");s.setPlayer2StartingWeapon("hammer");
 assert.equal(s.lockLoadout(),true);
 assert.equal(s.setMummyStyle(1,"desert"),false,"loadout stays locked in matches");
 s.reset(false);
 state=s.getRenderState();
 assert.equal(state.player.mummyStyle,"royal");
 assert.equal(state.opponent.mummyStyle,"sentinel");
 assert.equal(state.player.weapon,"bow");
 assert.equal(state.opponent.weapon,"hammer");
 s.dispose();
});

test("shared Canvas/WebGL pose layers are distinct for every skin, stable while moving",()=>{
 const s=session();
 s.setCharacterId("mummy");
 const signatures=new Set();
 const eyes=new Set();
 for(const id of MUMMY_STYLE_IDS){
  assert.equal(s.setMummyStyle(1,id),true);
  s.reset(false);
  const fighter=s.getRenderState().player;
  const pose=fighterVisual(fighter);
  const layers=characterSkinLayers(fighter,pose);
  assert.equal(layers.length,14,"never exceed the 14 preallocated GPU skin layers");
  assert.ok(layers.every(layer=>layer.segments.length>0));
  const ink=fighterInkPalette(false,"mummy",id);
  const coords=layers.flatMap(layer=>layer.segments.flatMap(segment=>segment.flat()));
  assert.ok(coords.every(Number.isFinite),"ornaments must never create invalid GPU geometry");
  if(id==="sentinel"){
   assert.ok(layers.some(layer=>layer.segments.some(segment=>
    segment.some(point=>point[1]>pose.head[1]+.6))),"Sentinel's obelisk must rise above the Mummy's head");
  }
  if(id==="scarab"){
   assert.ok(layers.some(layer=>layer.segments.some(segment=>
    segment.some(point=>point[1]>pose.head[1]+.49))),"Scarab's winged crown must have its own silhouette");
  }
  signatures.add(layers.map(layer=>layer.color+":"+layer.segments.length).join("|"));
  eyes.add(ink.accent);
  for(let i=0;i<5;i++)s.update(1/60);
  assert.equal(characterSkinLayers(s.getRenderState().player,fighterVisual(s.getRenderState().player)).length,14);
 }
 assert.equal(signatures.size,MUMMY_STYLE_IDS.length);
 assert.equal(eyes.size,MUMMY_STYLE_IDS.length);
 s.dispose();
});

test("UI offers per-player outfits only in Mummy loadout and reuses existing eight portraits",()=>{
 const ui=readFileSync(new URL("../src/ui/GameUI.ts",import.meta.url),"utf8");
 assert.match(ui,/for\(const style of MUMMY_STYLE_IDS\)/);
 assert.match(ui,/actions\.mummyStyleSelect\?\.\(this\.loadoutPlayer,style\)/);
 assert.match(ui,/this\.setHidden\(this\.mummyStylePicker,character!=="mummy"\)/);
 assert.match(ui,/const mummyChanged=/);
 assert.match(ui,/this\.mummyStyleCards\.setAttribute\("role","group"\)/);
 const canvas=readFileSync(new URL("../src/rendering/CanvasRenderer.ts",import.meta.url),"utf8");
 const three=readFileSync(new URL("../src/rendering/ThreeRenderer.ts",import.meta.url),"utf8");
 for(const code of [canvas,three])assert.match(code,/fighterInkPalette\([^;]+s\.mummyStyle\)/);
});

test("six previews include distinct thematic SVG shapes and never introduce external sprites",()=>{
 const ui=readFileSync(new URL("../src/ui/GameUI.ts",import.meta.url),"utf8");
 for(const name of ["royal","cursed","scarab","desert","sentinel"]){
  assert.match(ui,new RegExp('^  '+name+':\\\\{','m'),name+" must have its own SVG ornament layer");
 }
 assert.match(ui,/replace\('<ellipse ',parts\.behind/);
 assert.match(ui,/parts\.front\+"<\/svg>"/);
 assert.doesNotMatch(ui,/fetch\([^\)]*mummy/i);
 const styles=readFileSync(new URL("../src/styles.css",import.meta.url),"utf8");
 for(const id of MUMMY_STYLE_IDS)assert.ok(styles.includes('data-mummy-style="'+id+'"'));
});
