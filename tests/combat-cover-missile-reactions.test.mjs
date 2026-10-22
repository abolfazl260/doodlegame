import test from "node:test";
import assert from "node:assert/strict";
import {GameSession} from "../.test-build/gameplay/GameSession.js";

function sessionWithFighters(weapon) {
 const input={getState:()=>({}),endFrame(){}};
 const session=new GameSession(input);
 const attacker=session.player,target=session.opponent;
 attacker.x=0;attacker.y=2;attacker.facing=1;attacker.grounded=true;attacker.weapon=weapon;attacker.cooldown=0;
 target.x=1.15;target.y=2;target.health=100;target.maxHealth=100;
 return {session,attacker,target};
}
function blockingWall() {
 return {kind:"wall",x:.56,y:2,width:.22,height:2,hp:20,maxHp:20,active:true,
  rotation:0,pulse:0,warning:0,falling:false,vx:0,vy:0,grounded:true,cooldown:0,timer:0};
}
for (const weapon of ["blade","hammer"]) {
 test(`${weapon} cannot hit through a solid wall but still hits without cover`,()=>{
  const {session,attacker,target}=sessionWithFighters(weapon);
  session.environment=[blockingWall()];
  session.attack(attacker,target,true);
  assert.equal(target.health,100);
  session.environment=[];
  attacker.cooldown=0;
  session.attack(attacker,target,true);
  assert.ok(target.health<100);
 });
}
test("upgraded hammer's area hit respects cover",()=>{
 const {session,attacker,target}=sessionWithFighters("hammer");
 session.upgradedWeapons.add("hammer");
 session.environment=[blockingWall()];
 session.attack(attacker,target,true);
 assert.equal(target.health,100);
});
test("missile blast interrupts slam and applies normal hit reaction",()=>{
 const {session,attacker,target}=sessionWithFighters("missile");
 target.slamPhase="descent";target.slamElapsed=.2;target.kickKind=null;
 target.doubleJumpAvailable=false;target.airDashAvailable=false;
 const projectile={x:target.x+.1,y:target.y+.35,vx:8,vy:0,life:1,
  weapon:"missile",owner:"player",originX:attacker.x,returning:false,spin:0,age:0,bounce:0,ricochets:0};
 session.explodeMissile(projectile);
 assert.ok(target.health<100);
 assert.equal(target.slamPhase,null);
 assert.ok(target.hitTime>0);
 assert.equal(target.doubleJumpAvailable,true);
 assert.equal(target.airDashAvailable,true);
});
