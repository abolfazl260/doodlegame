import test from "node:test";
import assert from "node:assert/strict";
import {GameSession} from "../.test-build/gameplay/GameSession.js";
import {fighterInkPalette,fighterVisual,fighterOutfit,characterMarkings} from "../.test-build/rendering/FighterVisual.js";

const CHARACTER_IDS=["shadow","bolt","ninja","hero1"];

test("all four character choices persist across game session resets",()=>{
 const session=new GameSession({});
 for(const id of CHARACTER_IDS){
  session.setCharacterId(id);
  assert.equal(session.getHudState().characterId,id);
  assert.equal(session.getRenderState().player.characterId,id);
  session.reset(false);
  assert.equal(session.getHudState().characterId,id);
 }
 // Unknown storage values must not overwrite a valid selection.
 session.setCharacterId("unknown");
 assert.equal(session.getHudState().characterId,"hero1");
});

test("Ninja and Hero 1 have distinct 2D character drawings",()=>{
 const session=new GameSession({});
 const sprites={};
 for(const id of CHARACTER_IDS){
  session.setCharacterId(id);
  const state=session.getRenderState().player;
  const pose=fighterVisual(state);
  const clothing=fighterOutfit(state,pose);
  const marks=characterMarkings(state,pose.head);
  const ink=fighterInkPalette(false,id);
  assert.ok(pose.body.length>0);
  assert.ok(marks.length>0);
  assert.ok(ink.core&&ink.accent&&ink.eye);
  sprites[id]={clothing,ink};
 }
 assert.equal(sprites.hero1.clothing.hair.length,0,"Hero 1 has a clean white head");
 assert.ok(sprites.ninja.clothing.hair.length>0,"Ninja has a separate hood");
 assert.notEqual(sprites.ninja.ink.core,sprites.hero1.ink.core);
 assert.notEqual(sprites.ninja.ink.eye,sprites.hero1.ink.eye);
});
