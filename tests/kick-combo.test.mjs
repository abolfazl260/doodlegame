import test from "node:test";
import assert from "node:assert/strict";
import {GameSession} from "../.test-build/gameplay/GameSession.js";
import {WebInput} from "../.test-build/platform/web/WebInput.js";
import {fighterVisual,kickEffectSegments} from "../.test-build/rendering/FighterVisual.js";
import {KICK_SPECS} from "../.test-build/gameplay/KickCombat.js";

const idle=()=>({moveX:0,moveY:0,pointerX:0,pointerY:0,pointerDown:false,pointerPressed:false,
 pointerReleased:false,attackHeld:false,attackCancelled:false,jumpPressed:false,dashPressed:false,
 attackPressed:false,weaponNextPressed:false,weaponPreviousPressed:false});
const fixture=(mode="duel")=>{
 const input={state:idle(),p2:idle(),getState(){return this.state},getPlayer2State(){return this.p2},
  endFrame(){for(const s of [this.state,this.p2]){s.attackPressed=false;s.attackCancelled=false;
   s.jumpPressed=false;s.dashPressed=false;s.weaponPreviousPressed=false;s.weaponNextPressed=false;}}};
 const game=new GameSession(input);
 game.setMode(mode);
 if(mode!=="local-pvp")game.updateOpponent=()=>{};
 game.player.x=-6;game.opponent.x=-5;game.player.y=game.opponent.y=.9;
 game.player.velocityX=game.opponent.velocityX=0;
 game.player.facing=1;game.opponent.facing=-1;
 return {game,input};
};
const tick=(game,frames=1)=>{for(let i=0;i<frames;i++)game.update(1/120);};
const kick=(input,player=1)=>{const s=player===1?input.state:input.p2;s.moveY=1;s.attackPressed=true;s.attackHeld=true;};
const resetOpponent=(game)=>{game.opponent.x=game.player.x+1;game.opponent.y=game.player.y;
 game.opponent.velocityX=0;game.opponent.velocityY=0;game.opponent.grounded=true;};

test("a grounded straight kick has windup, exactly one short hit and no hold-to-repeat",()=>{
 const {game,input}=fixture();
 kick(input);tick(game);
 assert.equal(game.player.kickKind,"straight");
 assert.equal(game.player.cooldown>0,true);
 assert.equal(game.opponent.health,100,"windup must precede damage");
 tick(game,100);
 assert.equal(game.opponent.health,100-KICK_SPECS.straight.damage);
 assert.equal(game.player.kickKind,null);
 assert.equal(game.projectiles.length,0);
 tick(game,40);
 assert.equal(game.opponent.health,100-KICK_SPECS.straight.damage,"held ATTACK cannot repeatedly kick");
});
test("a deliberately timed second Down + ATTACK becomes an unmistakable spinning kick",()=>{
 const {game,input}=fixture();
 kick(input);tick(game,42);
 assert.equal(game.player.kickKind,null,"first kick must complete its recovery");
 resetOpponent(game);
 const before=game.opponent.health;
 input.state.attackPressed=true;tick(game);
 assert.equal(game.player.kickKind,"spin");
 tick(game,55);
 assert.equal(game.opponent.health,before-KICK_SPECS.spin.damage);
 assert.equal(game.player.kickKind,null,"spinning recovery ends");
 tick(game,100);
 resetOpponent(game);
 input.state.attackPressed=true;tick(game);
 assert.equal(game.player.kickKind,"straight","combo expires instead of repeating roundhouse forever");
});
test("kick reach, facing, vertical separation and solid cover prevent phantom contact",()=>{
 const {game,input}=fixture();
 const start=()=>{
  game.player.cooldown=0;game.player.kickComboRemaining=0;
  game.cancelKick(game.player);kick(input);tick(game,40);
 };
 game.opponent.x=game.player.x-1;start();assert.equal(game.opponent.health,100,"back-facing hit forbidden");
 game.opponent.x=game.player.x+1.8;start();assert.equal(game.opponent.health,100,"out of range");
 game.opponent.x=game.player.x+1;game.opponent.y=game.player.y+2.5;start();assert.equal(game.opponent.health,100,"vertical mismatch");
 game.opponent.y=game.player.y;
 game.environment.push({kind:"wall",active:true,x:-5.5,y:.75,width:.24,height:1.2,
  hp:30,maxHp:30,rotation:0,pulse:0,warning:0,falling:false,vx:0,vy:0,grounded:true,cooldown:0,timer:0});
 start();assert.equal(game.opponent.health,100,"wall blocks leg hit");
});
test("airborne down attack uses ordinary weapon; neutral attacks preserve bow and UZI",()=>{
 const {game,input}=fixture();
 game.player.grounded=false;game.player.y=2;
 input.state.moveY=1;input.state.attackPressed=true;tick(game);
 assert.equal(game.player.kickKind,null);
 assert.ok(game.player.cooldown>0,"airborne ATTACK remains the weapon attack");
 game.reset(false);
 game.selectWeaponById("bow");game.player.cooldown=0;
 input.state.moveY=0;input.state.attackPressed=true;input.state.attackHeld=true;
 tick(game,20);assert.ok(game.player.bowCharge>0);
 input.state.attackHeld=false;tick(game);
 assert.ok(game.projectiles.some(p=>p.weapon==="bow"));
 game.reset(false);
 game.selectWeaponById("uzi");game.player.cooldown=0;
 input.state.attackPressed=true;input.state.attackHeld=true;
 tick(game,45);assert.ok(game.projectiles.filter(p=>p.weapon==="uzi").length>=2);
 assert.equal(game.player.kickKind,null);
});
test("pause cancellation, damage interruption, defeat and reset clear active kick pose",()=>{
 const {game,input}=fixture();
 kick(input);tick(game,2);
 game.cancelTransientActions();
 assert.equal(game.player.kickKind,null);
 assert.equal(game.player.kickComboRemaining,0);
 tick(game,60);
 assert.equal(game.opponent.health,100,"paused action cannot hit later");
 game.player.cooldown=0;kick(input);tick(game);
 game.damage(game.player,4,-3);
 assert.equal(game.player.kickKind,null,"damage interrupts the windup");
 game.reset(false);
 assert.equal(game.player.kickKind,null);
 assert.equal(game.player.kickComboRemaining,0);
 game.player.cooldown=0;kick(input);tick(game);
 game.damage(game.player,1000,-5);
 tick(game);
 assert.equal(game.player.kickKind,null);
});
test("local PvP and the mobile down joystick can initiate the same attacks independently",()=>{
 const {game,input}=fixture("local-pvp");
 input.p2.moveY=1;input.p2.attackPressed=true;
 tick(game);
 assert.equal(game.opponent.kickKind,"straight");
 assert.equal(game.player.kickKind,null);
 game.reset(false);
 game.player.x=-6;game.opponent.x=-5;
 const web=new WebInput({});
 web.setTouchMove(0,.9);web.touchAttack();
 assert.ok(web.getState().attackPressed&&web.getState().moveY>.55);
 const mobile=new GameSession(web);
 mobile.updateOpponent=()=>{};
 mobile.update(1/60);
 assert.equal(mobile.player.kickKind,"straight");
 web.touchAttackCancel();mobile.cancelTransientActions();
 assert.equal(mobile.player.kickKind,null);
});
test("Canvas and Three.js share distinct finite straight/roundhouse poses and sweep trails",()=>{
 const {game}=fixture();
 const base=game.getRenderState().player;
 const straight={...base,kickKind:"straight",kickElapsed:.14};
 const spin={...base,kickKind:"spin",kickElapsed:.26};
 const a=fighterVisual(straight),b=fighterVisual(spin),neutral=fighterVisual(base);
 assert.notDeepEqual(a.joints,neutral.joints);
 assert.notDeepEqual(b.joints,a.joints);
 assert.notEqual(a.lean,b.lean);
 assert.ok(kickEffectSegments(straight).length>0);
 assert.ok(kickEffectSegments(spin).length>0);
 assert.deepEqual(kickEffectSegments({...spin,kickElapsed:0}),[]);
 for(const pose of [a,b])assert.ok(pose.joints.flat(2).every(Number.isFinite));
});
