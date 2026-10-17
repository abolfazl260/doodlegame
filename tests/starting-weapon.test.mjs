import test from "node:test";
import assert from "node:assert/strict";
import {GameSession} from "../.test-build/gameplay/GameSession.js";

const input={getState:()=>({}),endFrame(){},start(){},stop(){},dispose(){}};

test("chosen starting weapon is equipped when a match starts",()=>{
 const session=new GameSession(input);
 assert.equal(session.setStartingWeapon("bow"),true);
 assert.equal(session.getHudState().weapon,"bow");
 session.reset();
 assert.equal(session.getHudState().weapon,"bow");
 session.reset();
 assert.equal(session.getHudState().weapon,"bow");
 session.dispose();
});

test("mode restrictions override selection without losing a preferred weapon",()=>{
 const session=new GameSession(input);
 assert.equal(session.setStartingWeapon("uzi"),true);
 session.setMode("melee-only");
 assert.equal(session.getHudState().weapon,"blade");
 assert.equal(session.setStartingWeapon("bow"),false);
 assert.equal(session.setStartingWeapon("hammer"),true);
 session.setMode("duel");
 assert.equal(session.getHudState().weapon,"hammer");
 session.setArena("fortress");
 assert.equal(session.getHudState().weapon,"hammer");
 session.setArena("classic");
 assert.equal(session.getHudState().weapon,"hammer");
 session.dispose();
});

test("random mode prevents manual weapon selection and switches modes normally",()=>{
 const session=new GameSession(input);
 assert.equal(session.setStartingWeapon("blaster"),true);
 session.setMode("random-weapons");
 assert.equal(session.setStartingWeapon("bow"),false);
 session.setMode("duel");
 assert.equal(session.getHudState().weapon,"blaster");
 session.dispose();
});

test("spear can be selected as a starting weapon but is blocked by melee-only rules",()=>{
 const session=new GameSession(input);
 assert.equal(session.setStartingWeapon("spear"),true);
 assert.equal(session.getHudState().weapon,"spear");
 session.reset(false);
 assert.equal(session.getRenderState().player.weapon,"spear");
 session.setMode("melee-only");
 assert.equal(session.setStartingWeapon("spear"),false);
 assert.notEqual(session.getHudState().weapon,"spear");
 session.setMode("duel");
 assert.equal(session.setStartingWeapon("spear"),true);
 session.dispose();
});
