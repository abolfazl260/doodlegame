import test from "node:test";
import assert from "node:assert/strict";
import {WebInput} from "../.test-build/platform/web/WebInput.js";
import {GameSession} from "../.test-build/gameplay/GameSession.js";
import {Game} from "../.test-build/core/Game.js";
import {GameState} from "../.test-build/core/GameState.js";

const createSession=()=>{
 const input=new WebInput({});
 const session=new GameSession(input);
 session.setLocalPvP(true);
 session.setStartingWeapon("bow");
 session.setPlayer2StartingWeapon("hammer");
 return {input,session};
};
const win=(session,winner)=>{
 for(let i=0;i<31;i++)session.update(.1);
 session.damage(winner==="player"?session.opponent:session.player,200,0);
 session.update(1/60);
 assert.equal(session.getHudState().winner,winner);
 assert.equal(session.recordPvpRound(),true);
 assert.equal(session.recordPvpRound(),false,"a finished round cannot award points twice");
};

test("best-of-three counts decisive rounds, swaps spawn sides and preserves equipment",()=>{
 const {session}=createSession();
 session.startPvpSeries();
 assert.deepEqual(session.getPvpSeries(),{
  round:1,playerWins:0,opponentWins:0,complete:false,countdown:3,swapped:false
 });
 const first=session.getRenderState();
 assert.ok(first.player.x<first.opponent.x);
 assert.equal(first.player.weapon,"bow");
 assert.equal(first.opponent.weapon,"hammer");
 win(session,"player");
 assert.equal(session.getPvpSeries().playerWins,1);
 assert.equal(session.nextPvpRound(),true);
 const second=session.getRenderState();
 assert.ok(second.player.x>second.opponent.x,"each subsequent round should swap spawn positions");
 assert.equal(second.player.facing,-1);
 assert.equal(second.opponent.facing,1);
 assert.equal(second.player.weapon,"bow");
 assert.equal(second.opponent.weapon,"hammer");
 assert.equal(session.getPvpSeries().round,2);
 win(session,"opponent");
 assert.equal(session.nextPvpRound(),true);
 const third=session.getRenderState();
 assert.ok(third.player.x<third.opponent.x,"third round returns fighters to original spawns");
 win(session,"player");
 assert.deepEqual([session.getPvpSeries().playerWins,session.getPvpSeries().opponentWins],[2,1]);
 assert.equal(session.getPvpSeries().complete,true);
 assert.equal(session.nextPvpRound(),false,"match ends once a fighter has won two rounds");
 session.startPvpSeries();
 assert.equal(session.getPvpSeries().playerWins,0);
 assert.equal(session.getPvpSeries().round,1);
 session.dispose();
});

test("draws award no points; next round remains available",()=>{
 const {session}=createSession();
 session.startPvpSeries();
 for(let i=0;i<31;i++)session.update(.1);
 session.damage(session.player,200,0);
 session.damage(session.opponent,200,0);
 session.update(1/60);
 assert.equal(session.getHudState().winner,"draw");
 assert.equal(session.recordPvpRound(),true);
 assert.deepEqual([session.getPvpSeries().playerWins,session.getPvpSeries().opponentWins],[0,0]);
 assert.equal(session.nextPvpRound(),true);
 assert.equal(session.getHudState().winner,null);
 assert.equal(session.getPvpSeries().round,2);
 session.dispose();
});

test("three-second countdown blocks both combat and movement, including held attacks",()=>{
 const {input,session}=createSession();
 session.startPvpSeries();
 const {player,opponent}=session.getRenderState();
 input.setTouchMove(1,0);
 input.player2TouchAttackStart();
 for(let i=0;i<29;i++)session.update(.1);
 assert.equal(session.getRenderState().player.x,player.x);
 assert.equal(session.getRenderState().opponent.x,opponent.x);
 assert.equal(session.projectiles.length,0);
 assert.ok(session.getPvpSeries().countdown>0);
 session.update(.1);
 assert.ok(session.getPvpSeries().countdown<.00001);
 input.setTouchMove(0,0);
 input.player2TouchAttackCancel();
 session.update(1/60);
 assert.equal(session.getRenderState().winner,null);
 session.dispose();
});

test("Game lifecycle offers next round before final and restarts a clean series",()=>{
 const {session}=createSession();
 const callbacks=new Map();let sequence=0;
 const scheduler={request(callback){const id=++sequence;callbacks.set(id,callback);return id;},cancel(id){callbacks.delete(id);}};
 const renderer={resize(){},render(){},dispose(){}};
 const game=new Game(renderer,session,scheduler,error=>{throw error;});
 game.initialize();
 assert.equal(game.start(),true);
 assert.equal(game.getState(),GameState.PLAYING);
 winWithoutRecording("player");
 assert.equal(game.getState(),GameState.GAME_OVER);
 assert.equal(session.getPvpSeries().playerWins,1);
 assert.equal(game.nextPvpRound(),true);
 assert.equal(game.getState(),GameState.PLAYING);
 winWithoutRecording("player");
 assert.equal(session.getPvpSeries().complete,true);
 assert.equal(game.nextPvpRound(),false);
 game.restart();
 assert.equal(game.getState(),GameState.PLAYING);
 assert.equal(session.getPvpSeries().playerWins,0);
 assert.equal(session.getPvpSeries().round,1);
 game.stop();
 assert.equal(game.getState(),GameState.MENU);
 game.dispose();

 function winWithoutRecording(winner){
  for(let i=0;i<31;i++)session.update(.1);
  session.damage(winner==="player"?session.opponent:session.player,200,0);
  session.update(1/60);
  game.endGame();
  assert.equal(game.getState(),GameState.GAME_OVER);
 }
});

test("solo matches do not enter a PvP series",()=>{
 const {session}=createSession();
 session.setLocalPvP(false);
 session.startPvpSeries();
 assert.equal(session.getPvpSeries(),undefined);
 session.reset(false);
 assert.equal(session.getHudState().pvpSeries,undefined);
 session.dispose();
});
