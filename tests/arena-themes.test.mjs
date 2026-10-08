import test from "node:test";
import assert from "node:assert/strict";
import {ARENA_THEMES,getArenaTheme,platformColors,paintArenaBackdrop} from "../.test-build/themes/ArenaThemes.js";

const arenas=["classic","towers","pit","steps","zigzag","sky","moving","fortress","bridge","crater","vertical","ruins","conveyor","collapse","storm","reactor"];

test("all 16 gameplay arenas have complete, distinct visual palettes",()=>{
 assert.deepEqual(Object.keys(ARENA_THEMES).sort(),[...arenas].sort());
 for(const id of arenas){
  const t=getArenaTheme(id);
  assert.ok(["doodle","neon","fantasy"].includes(t.skin));
  assert.ok(["sketch","city","clouds","mountains","cavern","industrial"].includes(t.backdrop));
  for(const value of [t.skyTop,t.skyBottom,t.silhouette,t.platform,t.platformEdge,t.accent,t.secondary,t.hudBackground])
   assert.match(value,/^#[0-9a-fA-F]{6}$/);
 }
 const palettes=arenas.map(id=>getArenaTheme(id).skyTop+getArenaTheme(id).accent);
 assert.equal(new Set(palettes).size,arenas.length);
 assert.equal(getArenaTheme("fortress").skin,"doodle");
 assert.equal(getArenaTheme("moving").skin,"neon");
});

test("surface colors retain gameplay affordances regardless of arena",()=>{
 const lava=getArenaTheme("crater"),neon=getArenaTheme("moving");
 assert.notEqual(platformColors(lava).body,platformColors(neon).body);
 for(const t of [lava,neon]){
  assert.notEqual(platformColors(t,"ice").body,platformColors(t,"normal").body);
  assert.notEqual(platformColors(t,"conveyorLeft").edge,platformColors(t,"normal").edge);
  assert.equal(platformColors(t,"conveyorRight").body,platformColors(t,"conveyorLeft").body);
 }
});

test("background drawing balances Canvas state and supports 2D renderer fallback",()=>{
 let saves=0,draws=0;
 const ctx={
  save(){saves++;},restore(){saves--;},
  createLinearGradient(){return {addColorStop(){}};},
  beginPath(){},moveTo(){},lineTo(){},closePath(){},
  fill(){draws++;},stroke(){draws++;},fillRect(){draws++;},ellipse(){}
 };
 for(const id of arenas){
  paintArenaBackdrop(ctx,640,360,getArenaTheme(id));
  assert.equal(saves,0,"Canvas state must be restored in "+id);
 }
 assert.ok(draws>arenas.length*2);
});
