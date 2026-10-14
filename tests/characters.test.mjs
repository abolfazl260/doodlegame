import {test} from "node:test";
import assert from "node:assert/strict";
import {GameSession,CHARACTER_IDS} from "../.test-build/gameplay/GameSession.js";
import {fighterVisual,fighterOutfit,fighterInkPalette,characterMarkings} from "../.test-build/rendering/FighterVisual.js";

const session=()=>new GameSession({getState(){return {}},endFrame(){}});

test("four selectable characters persist across resets and bots use another character",()=>{
 assert.deepEqual(CHARACTER_IDS,["shadow","bolt","ember","frost"]);
 const duel=session(),originalRandom=Math.random;
 try{
  for(const id of CHARACTER_IDS){
   duel.setCharacterId(id);
   assert.equal(duel.getRenderState().player.characterId,id);
   for(const roll of [0,.34,.67,.99]){
    Math.random=()=>roll;
    duel.reset(false);
    const state=duel.getRenderState();
    assert.equal(state.player.characterId,id);
    assert.ok(CHARACTER_IDS.includes(state.opponent.characterId));
    assert.notEqual(state.opponent.characterId,id);
    assert.equal(duel.getHudState().characterId,id);
   }
  }
 }finally{Math.random=originalRandom;duel.dispose();}
});

test("Ember and Frost have their own face, costume and armor colors without changing combat poses",()=>{
 const duel=session(),baseline=duel.getRenderState().player;
 const armor=new Set();
 for(const id of CHARACTER_IDS){
  const s={...baseline,characterId:id,animationTime:2.8,velocityX:4.1,gaitPhase:1.3};
  const pose=fighterVisual(s),outfit=fighterOutfit(s,pose);
  assert.equal(pose.head.length,2);
  assert.ok(outfit.hair.length>=3);
  assert.ok(characterMarkings(s,pose.head).length>=5);
  for(const segment of [...pose.body,...pose.costume,...outfit.vest,
    ...outfit.gear,...outfit.trim,...outfit.hair,...characterMarkings(s,pose.head)])
   assert.ok(segment.flat().every(Number.isFinite),id+" visual must remain finite");
  const player=fighterInkPalette(false,id),opponent=fighterInkPalette(true,id);
  armor.add(player.armor);
  assert.equal(player.halo,"#8be0ff","player silhouette must remain recognizable");
  assert.equal(opponent.halo,"#fff2d7","enemy remains distinguishable");
  assert.notEqual(player.core,opponent.core);
 }
 assert.equal(armor.size,4,"every character needs a distinct armor palette");
 duel.dispose();
});
