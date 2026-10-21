import test from "node:test";
import assert from "node:assert/strict";
import {Game} from "../.test-build/core/Game.js";
import {GameSession} from "../.test-build/gameplay/GameSession.js";
import {Progression} from "../.test-build/progression/Progression.js";

function setup(progression){
 const input={
  state:{moveX:0,moveY:0,pointerX:0,pointerY:0,pointerDown:false,pointerPressed:false,pointerReleased:false,
   attackHeld:false,attackPressed:false,weaponNextPressed:false,weaponPreviousPressed:false},
  getState(){return this.state;},endFrame(){this.state.weaponNextPressed=false;this.state.weaponPreviousPressed=false;},
  start(){},stop(){},dispose(){}
 };
 const renderer={resize(){},render(){},dispose(){}};
 const scheduler={request(){return 1;},cancel(){}};
 const session=new GameSession(input);
 const game=new Game(renderer,session,scheduler,error=>{throw error;},progression);
 game.initialize();
 return {game,session,input};
}
const memory=()=>{const values=new Map();return {get:k=>values.get(k)??null,set:(k,v)=>values.set(k,structuredClone(v)),remove:k=>values.delete(k),has:k=>values.has(k)};};

test("selecting a weapon confirms the shown character while allowing customization before START",()=>{
 const {game,session,input}=setup();
 assert.equal(game.start(),false);
 assert.equal(game.getState(),"MENU");
 game.selectStartingWeapon("bow");
 assert.equal(session.getHudState().characterChosen,true,"the displayed default character is confirmed");
 game.selectCharacter("archer");
 assert.equal(game.start(),true);
 assert.equal(game.getState(),"PLAYING");
 assert.equal(session.getHudState().weapon,"bow");
 game.selectWeapon(1);
 game.selectWeaponById("missile");
 input.state.weaponNextPressed=true;
 session.update(1/60);
 assert.equal(session.getHudState().weapon,"bow","buttons, key input and APIs cannot change a live loadout");
 game.pause();game.resume();
 assert.equal(session.getHudState().weapon,"bow");
 game.restart();
 assert.equal(session.getHudState().weapon,"bow","rematches retain the chosen weapon");
 game.stop();
 assert.equal(game.getState(),"MENU");
 assert.equal(session.getHudState().characterChosen,false);
 assert.equal(session.getHudState().weaponChosen,false);
 assert.equal(game.start(),false);
 game.dispose();
});

test("both local fighters must confirm a weapon and can customize their characters",()=>{
 const {game,session}=setup();
 game.selectPlayerCount(2);
 game.selectCharacter("ninja");game.selectStartingWeapon("uzi");
 assert.equal(game.start(),false);
 game.selectPlayer2Character("knight");
 assert.equal(game.start(),false);
 game.selectPlayer2StartingWeapon("hammer");
 assert.equal(game.start(),true);
 assert.equal(session.getHudState().characterId,"ninja");
 assert.equal(session.getHudState().opponentCharacterId,"knight");
 assert.equal(session.getHudState().weapon,"uzi");
 assert.equal(session.getHudState().secondWeapon,"hammer");
 game.selectPlayer2WeaponById("missile");
 game.selectPlayer2Weapon(1);
 assert.equal(session.getHudState().secondWeapon,"hammer");
 game.dispose();
});

test("Random Weapons needs explicit assignment; Run cannot bypass setup",()=>{
 const {game,session}=setup(new Progression(memory()));
 assert.equal(game.newRun(),false);
 assert.equal(game.quickPlay(),false);
 game.selectMode("random-weapons");
 game.selectCharacter("viking");
 assert.equal(game.selectStartingWeapon("hammer"),false);
 assert.equal(game.start(),false);
 assert.equal(game.chooseRandomStartingWeapon(1),true);
 const chosen=session.getHudState().weapon;
 assert.equal(game.start(),true);
 assert.equal(session.getHudState().weapon,chosen);
 game.stop();
 game.selectMode("duel");
 game.selectCharacter("ranger");game.selectStartingWeapon("blaster");
 assert.equal(game.newRun(),true);
 assert.equal(game.getState(),"PLAYING");
 assert.equal(session.getHudState().weapon,"blaster");
 game.dispose();
});
