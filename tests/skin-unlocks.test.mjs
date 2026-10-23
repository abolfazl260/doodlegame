import test from "node:test";
import assert from "node:assert/strict";
import {SkinUnlocks,SKIN_UNLOCK_STORAGE_KEY,mummySkinProgress,MUMMY_SKIN_TASKS} from "../.test-build/progression/SkinUnlocks.js";
import {GameSession} from "../.test-build/gameplay/GameSession.js";
import {Game} from "../.test-build/core/Game.js";
import {GameState} from "../.test-build/core/GameState.js";

function store(){
 const values=new Map();
 return{values,get:key=>values.get(key)??null,set:(key,value)=>values.set(key,structuredClone(value)),
  remove:key=>values.delete(key),has:key=>values.has(key)};
}
const input=()=>({getState:()=>({moveX:0,moveY:0,pointerX:0,pointerY:0,pointerDown:false,pointerPressed:false,pointerReleased:false,
 attackHeld:false,jumpPressed:false,dashPressed:false,attackPressed:false,weaponNextPressed:false,weaponPreviousPressed:false}),
 endFrame(){},setLocalPvPEnabled(){}});
function reward(c,weapon="blade",arena="classic",completedRun=false){
 return c.recordSoloVictory({weapon,arena,completedRun});
}
test("all five Mummy cosmetics require distinct earned challenges; classic is always free",()=>{
 const c=new SkinUnlocks(store()),snapshot=c.getView();
 assert.equal(mummySkinProgress(snapshot,"classic").unlocked,true);
 for(const style of Object.keys(MUMMY_SKIN_TASKS))assert.equal(c.isUnlocked(style),false,style);
 assert.deepEqual(reward(c),["royal"]);
 assert.equal(c.isUnlocked("royal"),true);
 assert.equal(c.isUnlocked("scarab"),false);
 assert.deepEqual(reward(c,"bow","bridge"),[]);
 assert.deepEqual(reward(c,"bow","crater"),["scarab","desert"]);
 assert.deepEqual(reward(c,"blade","crater"),[]);
 assert.deepEqual(reward(c,"blade","classic"),["cursed"]);
 assert.equal(c.isUnlocked("sentinel"),false);
 assert.deepEqual(reward(c,"hammer","sky",true),["sentinel"]);
 assert.equal(c.getView().wins,6);
 assert.equal(c.getView().arenasWon.length,4);
 assert.equal(mummySkinProgress(c.getView(),"desert").current,3);
});
test("unlock progress survives reopening, duplicate maps do not add progress, and saved data is bounded",()=>{
 const storage=store(),c=new SkinUnlocks(storage);
 reward(c,"blade","classic");
 reward(c,"blade","classic");
 assert.equal(c.getView().arenasWon.length,1);
 const restored=new SkinUnlocks(storage);
 assert.equal(restored.getView().wins,2);
 assert.equal(restored.isUnlocked("royal"),true);
 assert.equal(restored.isUnlocked("cursed"),false);
 assert.equal(storage.values.get(SKIN_UNLOCK_STORAGE_KEY).version,1);
 storage.values.set(SKIN_UNLOCK_STORAGE_KEY,{version:1,wins:7,bowWins:999,
  arenasWon:["classic","classic","../unsafe","bridge",42],completedRuns:-1});
 const validated=new SkinUnlocks(storage).getView();
 assert.equal(validated.bowWins,7);
 assert.deepEqual(validated.arenasWon,["classic","bridge"]);
 assert.equal(validated.completedRuns,0);
 storage.values.set(SKIN_UNLOCK_STORAGE_KEY,{version:99,wins:5000});
 assert.equal(new SkinUnlocks(storage).getView().wins,0);
});
test("cosmetic storage failure still keeps in-session rewards",()=>{
 const c=new SkinUnlocks({get(){throw Error("unavailable")},set(){throw Error("full")},remove(){},has(){return false}});
 reward(c);assert.equal(c.isUnlocked("royal"),true);
});
test("Game blocks locked Mummy selections and grants a solo win once, never local PvP",()=>{
 const rewards=new SkinUnlocks(store());
 const session=new GameSession(input());
 const renderer={resize(){},render(){},dispose(){}};
 const scheduler={request(){return 1},cancel(){}};
 const game=new Game(renderer,session,scheduler,error=>{throw error},undefined,rewards);
 game.initialize();
 game.selectCharacter("mummy");
 assert.equal(game.selectMummyStyle(1,"royal"),false);
 assert.equal(game.selectMummyStyle(1,"classic"),true);
 game.selectStartingWeapon("blade");
 assert.equal(game.start(),true);
 // Simulate a legitimate resolved solo match at the Game session boundary.
 session.opponent.health=0;
 session.update(1/60);
 assert.equal(session.getHudState().winner,"player");
 game.endGame();
 assert.equal(game.getState(),GameState.GAME_OVER);
 assert.equal(rewards.getView().wins,1);
 game.endGame();
 assert.equal(rewards.getView().wins,1,"duplicate resolution does not grant extra progress");
 game.stop();
 game.selectCharacter("mummy");
 assert.equal(game.selectMummyStyle(1,"royal"),true);
 assert.equal(game.selectMummyStyle(1,"sentinel"),false);
 game.selectPlayerCount(2);
 game.selectCharacter("mummy");
 game.selectPlayer2Character("mummy");
 assert.equal(game.selectMummyStyle(2,"sentinel"),false);
 game.selectStartingWeapon("blade");game.selectPlayer2StartingWeapon("blade");
 assert.equal(game.start(),true);
 session.opponent.health=0;
 session.update(1/60);
 game.endGame();
 assert.equal(rewards.getView().wins,1,"same-device PvP results must never farm unlocks");
 game.dispose();
});
