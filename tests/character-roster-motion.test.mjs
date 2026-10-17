import test from "node:test";
import assert from "node:assert/strict";
import {GameSession,CHARACTER_IDS} from "../.test-build/gameplay/GameSession.js";
import {fighterVisual,fighterOutfit,characterMarkings,fighterInkPalette} from "../.test-build/rendering/FighterVisual.js";

const session=()=>new GameSession({getState(){return {}},endFrame(){}});
const finite=(segments)=>segments.every(([a,b])=>[...a,...b].every(Number.isFinite));

test("both selectable characters survive reset without modifying match rules",()=>{
 assert.deepEqual(CHARACTER_IDS,["soldier","ninja"]);
 const game=session();
 for(const id of CHARACTER_IDS){
  game.setCharacterId(id);
  assert.equal(game.getHudState().characterId,id);
  assert.equal(game.getRenderState().player.characterId,id);
  game.reset(false);
  assert.equal(game.getRenderState().player.characterId,id);
  assert.equal(game.getRenderState().player.maxHealth,100);
 }
});

test("each simplified 2D fighter has a distinctive, finite costume and facial detail",()=>{
 const base=session().getRenderState().player;
 const signatures=new Set();
 for(const characterId of CHARACTER_IDS){
  const s={...base,characterId,animationTime:.35,gaitPhase:1.2};
  const pose=fighterVisual(s),outfit=fighterOutfit(s,pose),marks=characterMarkings(s,pose.head);
  assert.equal(pose.body.length,9,"joints keep the existing collision-independent rig");
  assert.ok(pose.costume.length>=2,characterId+" needs a readable silhouette");
  assert.equal(outfit.hair.length,0,"approved designs have clean round heads");
  assert.ok(marks.length>=5);
  assert.ok(finite([...pose.joints,...outfit.hair,...outfit.gear,...marks]));
  assert.ok([pose.scaleX,pose.scaleY,pose.lean,pose.blink].every(Number.isFinite));
  signatures.add(JSON.stringify([...pose.costume,...marks]));
 }
 assert.equal(signatures.size,CHARACTER_IDS.length,"each character is visibly distinct");
 const original=fighterInkPalette(false);
 assert.equal(original.face,"#f9fcff");
 assert.equal(fighterInkPalette(false,"ninja").face,"#12141b");
 assert.equal(new Set(CHARACTER_IDS.map(id=>fighterInkPalette(false,id).accent)).size,2);
});

test("gait, landing, recoil, blink and accessories animate without editing gameplay state",()=>{
 const game=session(),base=game.getRenderState().player,original={...base};
 for(const characterId of CHARACTER_IDS){
  const idle=fighterVisual({...base,characterId,animationTime:.2});
  const running=fighterVisual({...base,characterId,grounded:true,velocityX:7.8,gaitPhase:1.4,animationTime:.4});
  const landing=fighterVisual({...base,characterId,landingTime:.12});
  const gunshot=fighterVisual({...base,characterId,weapon:"blaster",attackTime:.08});
  const normal=fighterVisual({...base,characterId,animationTime:4.2});
  const blink=fighterVisual({...base,characterId,animationTime:4.55});
  assert.notDeepEqual(running.head,idle.head);
  assert.ok(landing.scaleX>idle.scaleX&&landing.scaleY<idle.scaleY);
  assert.notDeepEqual(gunshot.hand,idle.hand);
  assert.equal(normal.blink,1);
  assert.ok(blink.blink<.5);
  assert.ok(finite(running.joints));
  const before=JSON.stringify({...base,characterId,animationTime:.4});
  fighterVisual({...base,characterId,animationTime:.4});
  assert.equal(JSON.stringify({...base,characterId,animationTime:.4}),before);
 }
 assert.deepEqual(game.getRenderState().player,original,"render-only motion cannot mutate the session");
});
