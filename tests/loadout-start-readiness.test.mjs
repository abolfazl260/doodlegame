import test from "node:test";
import assert from "node:assert/strict";
import {GameSession} from "../.test-build/gameplay/GameSession.js";

function session(){
 return new GameSession({
  start(){},stop(){},dispose(){},endFrame(){},
  getState(){return {moveX:0,moveY:0,pointerX:0,pointerY:0,pointerDown:false,
    pointerPressed:false,pointerReleased:false,attackHeld:false,attackCancelled:false,
    jumpPressed:false,dashPressed:false,attackPressed:false,
    weaponNextPressed:false,weaponPreviousPressed:false};}
 });
}

test("choosing a weapon confirms the visible default character and unlocks solo START",()=>{
 const match=session();
 assert.equal(match.hasConfirmedLoadout(),false);
 assert.equal(match.setStartingWeapon("blade"),true,"the already-equipped default must count as chosen");
 assert.equal(match.getHudState().characterChosen,true);
 assert.equal(match.getHudState().weaponChosen,true);
 assert.equal(match.hasConfirmedLoadout(),true);
 assert.equal(match.lockLoadout(),true);
 assert.equal(match.setStartingWeapon("bow"),false,"match loadout must remain locked once started");
});

test("an invalid weapon must not mark the current character or loadout ready",()=>{
 const match=session();
 match.setMode("melee-only");
 assert.equal(match.setStartingWeapon("blaster"),false);
 assert.equal(match.getHudState().characterChosen,false);
 assert.equal(match.hasConfirmedLoadout(),false);
 assert.equal(match.setStartingWeapon("hammer"),true);
 assert.equal(match.hasConfirmedLoadout(),true);
});

test("local two-player START requires both players' weapon confirmations",()=>{
 const match=session();
 match.setLocalPvP(true);
 assert.equal(match.setStartingWeapon("bow"),true);
 assert.equal(match.getHudState().characterChosen,true);
 assert.equal(match.getHudState().secondCharacterChosen,false);
 assert.equal(match.hasConfirmedLoadout(),false);
 assert.equal(match.lockLoadout(),false);
 assert.equal(match.setPlayer2StartingWeapon("hammer"),true);
 assert.equal(match.getHudState().secondCharacterChosen,true);
 assert.equal(match.getHudState().secondWeaponChosen,true);
 assert.equal(match.hasConfirmedLoadout(),true);
 assert.equal(match.lockLoadout(),true);
});

test("random loadouts also confirm the visible character on each side",()=>{
 const match=session();
 match.setMode("random-weapons");
 assert.equal(match.setStartingWeapon("blade"),false,"manual selection remains disallowed");
 assert.equal(match.chooseRandomStartingWeapon(1),true);
 assert.equal(match.hasConfirmedLoadout(),true);
 match.setLocalPvP(true);
 assert.equal(match.hasConfirmedLoadout(),false);
 assert.equal(match.chooseRandomStartingWeapon(2),true);
 assert.equal(match.hasConfirmedLoadout(),true);
});
