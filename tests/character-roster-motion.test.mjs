import test from "node:test";
import assert from "node:assert/strict";
import {GameSession,CHARACTER_IDS} from "../.test-build/gameplay/GameSession.js";
import {fighterVisual,fighterOutfit,characterMarkings,fighterInkPalette,vikingSkinLayers,characterSkinLayers,toolSegments,weaponAccentSegments,weaponAccentColor,weaponStyleLayers} from "../.test-build/rendering/FighterVisual.js";

const session=()=>new GameSession({getState(){return {}},endFrame(){}});
const finite=(segments)=>segments.every(([a,b])=>[...a,...b].every(Number.isFinite));

test("all six selectable skins survive reset without modifying match rules",()=>{
 assert.deepEqual(CHARACTER_IDS,["soldier","ninja","viking","ranger","pharaoh","knight"]);
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
  assert.equal(pose.costume.length,["ranger","pharaoh","knight"].includes(characterId)?0:2,
   "armored skin detail must not inherit floating stick-figure shoulder strokes");
  if(["ranger","pharaoh","knight"].includes(characterId)){
   assert.deepEqual(outfit.vest,[]);
   assert.deepEqual(outfit.gear,[]);
   assert.deepEqual(outfit.trim,[]);
  }else assert.ok(outfit.vest.length>0,"simple skins retain original outfit");
  assert.equal(pose.body.length,9,"core animated rig stays intact");
  assert.equal(outfit.hair.length,0,"all skins have clean non-hairy base rigs");
  assert.equal(marks.length,["soldier","ninja"].includes(characterId)?5:0,"all helmets/hoods replace colored headbands");
  const art=characterSkinLayers(s,pose);
  assert.equal(art.length,characterId==="viking"?8:["ranger","pharaoh","knight"].includes(characterId)?14:0);
  assert.ok(art.every(l=>l.segments.length&&l.width>0&&l.width<=.25&&finite(l.segments)));
  assert.ok(finite([...pose.joints,...outfit.hair,...outfit.gear,...marks]));
  assert.ok([pose.scaleX,pose.scaleY,pose.lean,pose.blink].every(Number.isFinite));
  signatures.add(JSON.stringify([...pose.costume,...marks,...art.flatMap(l=>l.segments)]));
 }
 assert.equal(signatures.size,CHARACTER_IDS.length,"each character is visibly distinct");
 const original=fighterInkPalette(false);
 assert.equal(original.face,"#f9fcff");
 assert.equal(fighterInkPalette(false,"ninja").face,"#12141b");
 assert.equal(new Set(CHARACTER_IDS.map(id=>fighterInkPalette(false,id).accent)).size,6);
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

test("skin selection never changes sword size, weapon geometry, accent or damage",()=>{
 const game=session(),base=game.getRenderState().player;
 for(const weapon of ["blade","hammer","blaster","uzi","boomerang","bow","bomb","missile","spear"]){
  const soldier={...base,characterId:"soldier",weapon,weaponHolsterFrom:null,weaponDrawTime:0,grabPhase:null};
  for(const characterId of CHARACTER_IDS.filter(id=>id!=="soldier")){
   const skin={...soldier,characterId};
   assert.deepEqual(toolSegments(skin),toolSegments(soldier),weapon+" silhouette depends on equipment only");
   assert.deepEqual(weaponAccentSegments(skin),weaponAccentSegments(soldier),weapon+" accent shape is not a skin perk");
   assert.equal(weaponAccentColor(skin),weaponAccentColor(soldier),weapon+" accent color is not a skin perk");
   assert.deepEqual(weaponStyleLayers(skin),weaponStyleLayers(soldier),weapon+" painted inlays stay identical");
  }
 }
 // Selecting a skin must not change the weapon equipped or its cooldown/stats.
 game.setStartingWeapon("blade");
 const before=game.getHudState().weapon;
 game.setCharacterId("ninja");
 assert.equal(game.getHudState().weapon,before);
 for(const id of ["viking","ranger","pharaoh","knight"]){
  game.setCharacterId(id);
  assert.equal(game.getHudState().weapon,before);
 }
 game.reset(false);
 assert.equal(game.getRenderState().player.characterId,"knight");
 assert.notEqual(game.getRenderState().opponent.characterId,"knight");
 game.setCharacterId("soldier");
 assert.equal(game.getHudState().weapon,before);
});

test("Viking horns, metal helmet, fur mantle and boots follow animation without affecting hitboxes",()=>{
 const game=session(),base=game.getRenderState().player;
 for(const velocityX of [0,3,8,-6]){
  const state={...base,characterId:"viking",velocityX,gaitPhase:1.15,animationTime:1.7,grounded:true};
  const pose=fighterVisual(state),layers=vikingSkinLayers(state,pose);
  assert.equal(layers.length,8);
  assert.deepEqual(layers.map(l=>l.color),
   ["#07090d","#3a434d","#f4e6c8","#dbad4c","#8c603b","#a67545","#edd8b5","#8c5e27"]);
  assert.ok(layers.every(l=>l.width>0&&l.width<=.155&&l.segments.length>0));
  assert.ok(finite(layers.flatMap(l=>l.segments)));
  assert.ok(layers[2].segments.some(([a,b])=>Math.max(a[1],b[1])>pose.head[1]+.5),"curved horns rise above head");
  assert.ok(layers[5].segments.some(([a,b])=>Math.min(a[1],b[1])<-.5),"boots follow the lower leg");
  assert.equal(characterMarkings(state,pose.head).length,0,"helmet replaces headband");
  assert.equal(pose.body.length,9,"Viking uses identical animated hitbox-independent rig");
 }
 for(const id of CHARACTER_IDS.filter(id=>id!=="viking")){
  const state={...base,characterId:id},pose=fighterVisual(state);
  assert.deepEqual(vikingSkinLayers(state,pose),[],"other cosmetics never inherit helmet geometry");
 }
 assert.deepEqual(fighterInkPalette(false,"viking").face,"#10131a");
 assert.equal(game.getRenderState().player.maxHealth,100);
});

test("three reference-matched cosmetic outfits include distinctive helmet, hood, and regal details",()=>{
 const base=session().getRenderState().player,signatures=new Set();
 const expected={
  ranger:["#d2b24b","#f7fcf6","#478e4b","#5f3b22","#426b26"],
  pharaoh:["#d6a13b","#0754a1","#32e8ff","#fff3da","#f0c46b"],
  knight:["#b91f30","#aeb8c5","#d5a946","#d52937","#8a929e"]
 };
 for(const characterId of ["ranger","pharaoh","knight"]){
  const state={...base,characterId,weapon:"missile",animationTime:2.4,gaitPhase:1.4,velocityX:4.2},
   pose=fighterVisual(state),layers=characterSkinLayers(state,pose);
  assert.equal(layers.length,14);
  assert.equal(characterMarkings(state,pose.head).length,0,"helmets and hood cover headbands");
  for(const shade of expected[characterId])
   assert.ok(layers.some(l=>l.color===shade),characterId+" requires "+shade);
  assert.ok(layers.every(l=>l.segments.length>0&&l.segments.every(([a,b])=>[...a,...b].every(Number.isFinite))));
  signatures.add(JSON.stringify(layers));
  const running={...state,gaitPhase:2.7,velocityX:7.8};
  const runLayers=characterSkinLayers(running,fighterVisual(running));
  assert.notDeepEqual(runLayers,layers,"wearable cuffs and boots track animated limbs");
  assert.deepEqual(toolSegments(state),toolSegments({...state,characterId:"soldier"}),
   "the skin never changes even the rocket launcher");
 }
 assert.equal(signatures.size,3);
});

test("layered armor has no dangling legacy ticks or oversized exposed cloth strokes",()=>{
 const base=session().getRenderState().player;
 const near=(a,b)=>Math.abs(a-b)<1e-6;
 for(const characterId of ["ranger","pharaoh","knight"]){
  for(const action of [
   {velocityX:0,gaitPhase:0,grounded:true},
   {velocityX:8,gaitPhase:1.4,grounded:true},
   {velocityX:-6,gaitPhase:2.6,grounded:true},
   {velocityX:1,velocityY:6,grounded:false},
   {velocityX:0,grounded:true,attackTime:.12}
  ]){
   const state={...base,...action,characterId,animationTime:1.7};
   const pose=fighterVisual(state),outfit=fighterOutfit(state,pose);
   assert.equal(pose.costume.length,0,characterId+" may not show separate generic shoulder strokes");
   assert.ok([outfit.vest,outfit.gear,outfit.trim,outfit.hair].every(x=>x.length===0),
    "obsolete undergarments may not protrude from "+characterId);
   const layers=characterSkinLayers(state,pose);
   assert.ok(layers.length>0&&finite(layers.flatMap(x=>x.segments)));
   assert.equal(pose.body.length,9);
  }
 }
 const ranger={...base,characterId:"ranger"};
 const rangerPose=fighterVisual(ranger),rangerLayers=characterSkinLayers(ranger,rangerPose);
 const whiteEye=rangerLayers.find(layer=>layer.color==="#f7fcf6");
 assert.ok(whiteEye);
 assert.ok(whiteEye.segments.every(([a,b])=>a[0]-rangerPose.head[0]<=.2&&b[0]-rangerPose.head[0]<=.2),
  "the white visor line is contained inside the hood");
 const pharaoh={...base,characterId:"pharaoh"};
 const pharaohLayers=characterSkinLayers(pharaoh,fighterVisual(pharaoh));
 const folds=pharaohLayers.find(layer=>layer.color==="#fff3da");
 assert.ok(folds&&near(folds.width,.054));
 assert.ok(folds.segments.every(([a,b])=>Math.abs(a[0])<=.2&&Math.abs(b[0])<=.2),
  "white skirt drapery must not jut beside the legs");
 const simple=fighterVisual({...base,characterId:"soldier"});
 assert.equal(simple.costume.length,2,"classic stick figure shoulder marks preserved");
});
