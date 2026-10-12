import test from "node:test";
import assert from "node:assert/strict";
import {GameSession,TURN_POSE_DURATION} from "../.test-build/gameplay/GameSession.js";
import {fighterVisual} from "../.test-build/rendering/FighterVisual.js";

const idle=()=>({moveX:0,moveY:0,jumpPressed:false,dashPressed:false,attackPressed:false,
 attackHeld:false,grabPressed:false,weaponNextPressed:false,weaponPreviousPressed:false});
function setup(arena="classic"){
 const input={state:idle(),second:idle(),getState(){return this.state},getPlayer2State(){return this.second},
 endFrame(){for(const state of [this.state,this.second])for(const key of ["jumpPressed","dashPressed","attackPressed","grabPressed","weaponNextPressed","weaponPreviousPressed"])state[key]=false;},
 setLocalPvPEnabled(){}};
 const game=new GameSession(input);game.setArena(arena);game.updateOpponent=()=>{};
 return {game,input};
}
function tick(game,count=1){for(let i=0;i<count;i++)game.update(1/60)}
const fighter=game=>game.getRenderState().player;

test("idle breathing moves only head and limbs; no world position or collision drift",()=>{
 const {game}=setup(),before=fighter(game),position=[before.x,before.y];
 const base=fighterVisual({...before,animationTime:0});
 const inhale=fighterVisual({...before,animationTime:Math.PI/(2*2.7)});
 assert.ok(inhale.head[1]>base.head[1]+.015,"breathing visibly lifts the head");
 assert.notDeepEqual(inhale.joints[0][1],base.joints[0][1],"shoulders breathe as well");
 assert.equal(inhale.idle,1);
 tick(game,120);
 const end=fighter(game);
 assert.ok(Math.abs(end.x-position[0])<1e-9);
 assert.ok(Math.abs(end.y-position[1])<1e-9);
 assert.equal(end.velocityX,0);
 assert.equal(end.visualFacing,end.facing);
 assert.equal(end.turnPoseTime,0);
});

test("fast run has larger stride and counter-swing than slow walk",()=>{
 const {game}=setup(),p=fighter(game);
 const slow={...p,grounded:true,velocityX:2,gaitPhase:Math.PI/2,animationTime:0};
 const fast={...slow,velocityX:8};
 const a=fighterVisual(slow),b=fighterVisual(fast);
 assert.equal(a.fastRun,0);
 assert.ok(b.fastRun>.9);
 assert.ok(b.joints[4][1][0]>a.joints[4][1][0]+.25,"faster run extends the leading foot");
 assert.ok(Math.abs(b.lean)>Math.abs(a.lean)+.05);
 assert.ok(Math.abs(b.joints[1][1][0])>Math.abs(a.joints[1][1][0]),"knees and arms gain stride");
});

test("reversal keeps logical facing and hitbox instant but visual orientation blends",()=>{
 const {game,input}=setup();input.state.moveX=1;tick(game,40);
 const before=fighter(game);
 assert.equal(before.facing,1);
 assert.equal(before.visualFacing,1);
 const oldX=before.x;
 input.state.moveX=-1;tick(game,1);
 const reversed=fighter(game);
 assert.equal(reversed.facing,-1,"input direction must switch in the very first frame");
 assert.ok(reversed.visualFacing>0,"rendered character still faces old side during pivot");
 assert.ok(reversed.visualFacing<1);
 assert.ok(reversed.turnPoseTime>0&&reversed.turnPoseTime<=TURN_POSE_DURATION);
 assert.ok(reversed.x>=oldX,"momentum is not modified by visual animation");
 const mid=fighterVisual(reversed);
 assert.ok(mid.pivot>0);
 tick(game,15);
 assert.ok(fighter(game).visualFacing<-.9,"visual orientation catches up");
 assert.equal(fighter(game).turnPoseTime,0);
 assert.equal(fighter(game).facing,-1);
});

test("rapid left-right taps smoothly change visual direction without NaN or snapping",()=>{
 const {game,input}=setup();input.state.moveX=1;tick(game,35);
 let last=fighter(game).visualFacing;
 for(let i=0;i<16;i++){
  input.state.moveX=i%2===0?-1:1;
  tick(game,1);
  const p=fighter(game),pose=fighterVisual(p);
  assert.ok(Math.abs(p.visualFacing-last)<.45,"one tap never snaps the drawn facing");
  assert.ok(Math.abs(p.visualFacing)<=1);
  assert.ok([pose.visualFacing,pose.lean,pose.head[0],pose.hand[0],pose.pivot].every(Number.isFinite));
  assert.equal(p.facing,input.state.moveX,"logical hit direction remains immediate");
  last=p.visualFacing;
 }
 game.reset(false);
 assert.equal(fighter(game).visualFacing,fighter(game).facing);
 assert.equal(fighter(game).turnPoseTime,0);
});

test("ice, slippery surfaces, moving platforms and conveyors preserve locomotion physics",()=>{
 for(const arena of ["classic","moving","conveyor","sky"]){
  const {game,input}=setup(arena);
  input.state.moveX=1;tick(game,25);
  input.state.moveX=-1;tick(game,2);
  const p=fighter(game),pose=fighterVisual(p);
  assert.equal(p.facing,-1);
  assert.ok(Math.abs(p.visualFacing)<=1);
  assert.ok([p.x,p.y,p.velocityX,pose.lean,pose.scaleX].every(Number.isFinite));
 }
 // Ice keeps its original inertial slowdown; changing visual facing does not
 // alter the physical value as physics tests already require.
 const {game,input}=setup();
 game.player.velocityX=6;
 game.player.x=-2;game.player.y=3.25;
 input.state.moveX=-1;tick(game);
 assert.equal(fighter(game).facing,-1);
 assert.ok(game.player.velocityX>0,"slippery movement retains momentum");
});

test("dash, aerial pose, landing, hit and kick override grounded pivot appropriately",()=>{
 const {game,input}=setup();
 input.state.moveX=1;tick(game,35);
 input.state.moveX=-1;tick(game);
 assert.ok(fighter(game).turnPoseTime>0);
 input.state.dashPressed=true;tick(game);
 assert.equal(fighter(game).turnPoseTime,0,"dash cancels grounded pivot");
 game.reset(false);
 input.state.moveX=1;tick(game,35);
 input.state.moveX=-1;tick(game);
 input.state.jumpPressed=true;tick(game);
 assert.equal(fighter(game).turnPoseTime,0,"jump supersedes turn");
 assert.notEqual(fighter(game).jumpStage,0);
 game.reset(false);
 input.state.moveX=1;tick(game,35);
 input.state.moveX=-1;tick(game);
 game.damage(game.player,8,2);
 tick(game);
 assert.equal(fighter(game).turnPoseTime,0,"damage overrides pivot");
 assert.equal(fighterVisual(fighter(game)).pivot,0);
 game.reset(false);
 assert.equal(fighter(game).turnPoseTime,0);
 assert.equal(fighter(game).visualFacing,fighter(game).facing);
});

test("player two and AI have independent facing transitions and unchanged weapon selection",()=>{
 const {game,input}=setup();
 game.setLocalPvP(true);
 input.state.moveX=1;input.second.moveX=-1;tick(game,35);
 assert.equal(game.getRenderState().player.visualFacing,1);
 assert.equal(game.getRenderState().opponent.visualFacing,-1);
 input.second.moveX=1;tick(game);
 const snap=game.getRenderState();
 assert.equal(snap.opponent.facing,1);
 assert.ok(snap.opponent.visualFacing<0);
 assert.equal(snap.player.facing,1);
 assert.equal(snap.player.visualFacing,1);
 game.selectPlayer2Weapon(1);
 assert.equal(game.getHudState().secondWeapon,"hammer");
 input.state.moveX=-1;tick(game);
 assert.equal(game.getRenderState().player.facing,-1);
 assert.equal(game.getRenderState().opponent.facing,1);
 game.setLocalPvP(false);game.reset(false);
 game.opponent.facing=1;tick(game,1);
 assert.ok(Number.isFinite(game.getRenderState().opponent.visualFacing));
});

test("read-only rendering does not advance turns or alter physical facing while paused",()=>{
 const {game,input}=setup();
 input.state.moveX=1;tick(game,35);
 input.state.moveX=-1;tick(game);
 const snap=fighter(game);
 for(let i=0;i<8;i++)fighterVisual(fighter(game));
 assert.equal(fighter(game).visualFacing,snap.visualFacing);
 assert.equal(fighter(game).turnPoseTime,snap.turnPoseTime);
 assert.equal(fighter(game).facing,snap.facing);
});
