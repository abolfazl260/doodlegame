import test from "node:test";
import assert from "node:assert/strict";
import {GameSession} from "../.test-build/gameplay/GameSession.js";
import {GRAVITY_GAUNTLET,gauntletPullImpulse,gauntletParryContact} from "../.test-build/gameplay/GravityGauntlet.js";
import {toolSegments,weaponStyleLayers,weaponAccentColor,gauntletEffectSegments} from "../.test-build/rendering/FighterVisual.js";

const idle=()=>({moveX:0,moveY:0,pointerX:0,pointerY:0,pointerDown:false,pointerPressed:false,
 pointerReleased:false,attackHeld:false,attackCancelled:false,jumpPressed:false,dashPressed:false,
 grabPressed:false,attackPressed:false,weaponNextPressed:false,weaponPreviousPressed:false});
function fixture(){
 const input={state:idle(),getState(){return this.state},getPlayer2State(){return idle()},
 endFrame(){this.state={...this.state,attackPressed:false,grabPressed:false,jumpPressed:false,dashPressed:false}},
 setLocalPvPEnabled(){}};
 const s=new GameSession(input);s.setLocalPvP(true);s.setStartingWeapon("gravity-gauntlet");
 s.reset(false);
 const player=Reflect.get(s,"player"),opponent=Reflect.get(s,"opponent");
 player.x=-1;player.facing=1;opponent.x=1;opponent.y=player.y;opponent.facing=-1;
 return{s,input,player,opponent};
}
test("Gravity Gauntlet registers as a normal selectable weapon with visual-only four-layer neon glove",()=>{
 const {s}=fixture();assert.equal(s.getHudState().weapon,"gravity-gauntlet");
 const fighter=s.getRenderState().player;
 assert.equal(fighter.gauntletPullTime,0);assert.equal(fighter.gauntletParryTime,0);
 assert.ok(toolSegments(fighter).length>20);
 assert.equal(weaponStyleLayers(fighter).length,4);
 assert.equal(weaponAccentColor(fighter),"#35f3e7");
 assert.deepEqual(gauntletEffectSegments(fighter),[]);
});
test("tap produces one Pulse Punch hit in front, no hits behind or through cover",()=>{
 const {s,input,player,opponent}=fixture();
 opponent.x=player.x+GRAVITY_GAUNTLET.pulseRange-.3;
 input.state.attackPressed=true;input.state.attackHeld=true;
 s.update(1/60);
 assert.equal(opponent.health,100-GRAVITY_GAUNTLET.pulseDamage);
 const remaining=opponent.health;s.update(1/60);
 assert.equal(opponent.health,remaining,"held attack cannot repeat the pulse");
 assert.equal(s.getHudState().gauntlet.pullCooldown,0);
});
test("Mag Pull needs an uninterrupted hold, consumes one activation, and pulls nearby enemies",()=>{
 const {s,input,player,opponent}=fixture();
 player.x=5;opponent.x=player.x+3.2;
 input.state.attackHeld=true;
 for(let i=0;i<25;i++)s.update(1/60);
 assert.equal(s.getHudState().gauntlet.pulling,true);
 assert.ok(s.getHudState().gauntlet.pullCooldown>0);
 assert.ok(opponent.velocityX<0,"target is accelerated toward the glove");
 const cooldown=s.getHudState().gauntlet.pullCooldown;
 for(let i=0;i<55;i++)s.update(1/60);
 assert.equal(s.getHudState().gauntlet.pulling,false);
 assert.ok(s.getHudState().gauntlet.pullCooldown<cooldown);
 assert.equal(gauntletPullImpulse(10,0,.016).x,0,"field is range-limited");
 const direct=gauntletPullImpulse(2,0,.016);
 assert.ok(direct.x>0&&direct.x<1);
});
test("Perfect Parry reflects one incoming missile via the existing GRAB key, with cooldown",()=>{
 const {s,input,player,opponent}=fixture();
 opponent.x=8; // Keep the returned missile away from its distant owner during this frame.
 const shots=Reflect.get(s,"projectiles");
 shots.push({x:player.x+1.3,y:player.y+.25,vx:-12,vy:0,life:3,weapon:"missile",
  owner:"opponent",originX:player.x+5,returning:false,spin:0,age:0,bounce:0,ricochets:0});
 input.state.grabPressed=true;
 s.update(.04);
 assert.equal(shots[0]?.owner,"player","incoming projectile ownership is reversed");
 assert.ok(shots[0].vx>0);
 assert.equal(s.getHudState().gauntlet.parrying,false,"shield reflects at most one projectile");
 assert.ok(s.getHudState().gauntlet.parryCooldown>0);
 assert.equal(gauntletParryContact(0,0,-1,0,.1,0,1),true);
 assert.equal(gauntletParryContact(0,0,-2,2,-1,2,1),false);
});
test("Air Slam uses the committed landing pipeline with larger Gravity burst",()=>{
 const {s,input,player,opponent}=fixture();
 player.x=6;opponent.x=6.85;player.y+=3;player.grounded=false;player.velocityY=-5;
 opponent.x=player.x+.85;
 const before=opponent.health;
 input.state.moveY=1;input.state.attackPressed=true;input.state.attackHeld=true;
 s.update(1/60);input.state.attackHeld=false;input.state.moveY=0;
 for(let i=0;i<90&&player.slamPhase!==null;i++)s.update(1/60);
 assert.ok(opponent.health<before,"landing shockwave deals damage");
 assert.ok(s.getRenderState().combatCues.every(cue=>Number.isFinite(cue.intensity)));
});
test("paused/cancelled holds are discarded and cooldowns reset on rematch, while upgrades never change base HP",()=>{
 const {s,input,player}=fixture();
 input.state.attackHeld=true;
 for(let i=0;i<12;i++)s.update(1/60);
 s.cancelTransientActions();
 assert.equal(player.gauntletHold,0);assert.equal(player.gauntletPullTime,0);
 s.setUpgradeSnapshot({points:0,upgradedWeapons:["gravity-gauntlet"]});
 s.reset(false);
 assert.equal(s.getRenderState().player.maxHealth,100);
 assert.equal(s.getHudState().gauntlet.parryCooldown,0);
 assert.equal(s.getHudState().gauntlet.pullCooldown,0);
});
