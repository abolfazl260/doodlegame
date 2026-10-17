import test from "node:test";
import assert from "node:assert/strict";
import {GameSession} from "../.test-build/gameplay/GameSession.js";
import {generatePlatformInk,platformMaterial,platformArtKey,platformInkReaction,PlatformInkCache} from "../.test-build/rendering/PlatformDecorations.js";

const p={x:-4,y:1.2,width:4.2,height:.35,surface:"normal"};
const makeState=()=>new GameSession({getState(){return {}},endFrame(){}}).getRenderState();

test("platform decorations are stable when platforms move, varied across arenas and bounded",()=>{
 const first=generatePlatformInk("moving",p,2);
 assert.equal(first.material,"metal");
 assert.deepEqual(first,generatePlatformInk("moving",{...p,x:200,y:50},2),"changing position must not re-seed art");
 assert.notDeepEqual(first.strokes,generatePlatformInk("moving",p,3).strokes,"different platforms should vary");
 assert.equal(platformArtKey("moving",p,2),platformArtKey("moving",{...p,x:5,y:-9},2));
 for(const arena of ["classic","ruins","bridge","crater","moving"]){
  const art=generatePlatformInk(arena,{...p,width:24},0);
  assert.ok(art.strokes.length>20&&art.strokes.length<150,"bounded detail count for "+arena);
  for(const mark of art.strokes){
   assert.ok([mark.x1,mark.x2,mark.y1,mark.y2,mark.anchorX].every(Number.isFinite));
   assert.ok(mark.x1>=-.3&&mark.x2<24.3,"details must stay near platform bounds");
  }
 }
});

test("decoration families reflect materials and preserve special surface cues",()=>{
 assert.equal(platformMaterial("classic",p),"earth");
 assert.equal(platformMaterial("ruins",p),"stone");
 assert.equal(platformMaterial("bridge",p),"metal");
 assert.equal(platformMaterial("classic",{...p,surface:"ice"}),"frost");
 assert.equal(platformMaterial("classic",{...p,surface:"conveyorRight"}),"metal");
 const earthy=generatePlatformInk("classic",p,0);
 const stone=generatePlatformInk("ruins",p,0);
 const metal=generatePlatformInk("bridge",p,0);
 const frozen=generatePlatformInk("classic",{...p,surface:"ice"},0);
 assert.ok(earthy.strokes.some(s=>s.motion==="tip"),"grass/plants have anchored, animated tips");
 assert.ok(stone.strokes.some(s=>s.motion==="pebble"||s.tone==="detail"));
 assert.ok(metal.strokes.every(s=>s.motion==="none"),"bolts are fixed");
 assert.ok(frozen.strokes.every(s=>s.motion==="none"),"ice must not contain plants or loose pebbles");
 assert.deepEqual(p,{x:-4,y:1.2,width:4.2,height:.35,surface:"normal"},"render generation must not mutate physics data");
});

test("every built-in stage has separate platform engraving without modifying collision boxes",()=>{
 const ids=["classic","towers","pit","steps","zigzag","sky","moving","fortress",
  "bridge","crater","vertical","ruins","conveyor","collapse","storm","reactor"];
 const marks=ids.map(id=>{
  const art=generatePlatformInk(id,p,2);
  assert.ok(art.strokes.length>18&&art.strokes.length<150,id+" keeps decoration affordable");
  assert.ok(art.strokes.every(mark=>[mark.x1,mark.y1,mark.x2,mark.y2].every(Number.isFinite)));
  assert.deepEqual(art,generatePlatformInk(id,p,2),"art must be deterministic");
  return JSON.stringify(art.strokes.slice(-6));
 });
 assert.equal(new Set(marks).size,16,"no two arenas share the same final accent engraving");
 assert.equal(p.width,4.2);
 assert.equal(p.height,.35);
});

test("cache reuses shapes for moving platforms and resets explicitly",()=>{
 const cache=new PlatformInkCache();
 const before=cache.get("moving",p,1);
 assert.strictEqual(before,cache.get("moving",{...p,x:p.x+5,y:p.y+.2},1));
 assert.notStrictEqual(before,cache.get("moving",{...p,width:6},1));
 cache.clear();
 assert.notStrictEqual(before,cache.get("moving",p,1));
});

test("landing and impact perturb nearby loose decorations, not collisions or bolts",()=>{
 const art=generatePlatformInk("classic",p,0);
 const grass=art.strokes.find(s=>s.motion==="tip");
 assert.ok(grass);
 const resting=makeState();
 assert.equal(platformInkReaction(grass,p,resting),0);
 const x=p.x+grass.anchorX,top=p.y+p.height;
 const cue={id:1,kind:"slam",weapon:"hammer",x,y:top,direction:1,intensity:1,age:.04,life:.34};
 const state={...resting,combatCues:[cue]};
 assert.ok(Math.abs(platformInkReaction(grass,p,state))>.001,"nearby impact should animate grass");
 assert.equal(platformInkReaction(grass,p,state,false),0,"reduced-motion setting freezes decoration");
 assert.equal(platformInkReaction(grass,p,{...state,combatCues:[{...cue,x:x+8}]}),0);
 const fixed=generatePlatformInk("bridge",p,0).strokes.find(s=>s.motion==="none");
 assert.equal(platformInkReaction(fixed,p,state),0);
 const landing={...resting,player:{...resting.player,x,y:top+.9,grounded:true,landingTime:.13}};
 assert.ok(Number.isFinite(platformInkReaction(grass,p,landing)));
 assert.deepEqual(p,{x:-4,y:1.2,width:4.2,height:.35,surface:"normal"});
});
