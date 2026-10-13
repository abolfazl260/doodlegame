import test from 'node:test';import assert from 'node:assert/strict';
import {Game} from '../.test-build/core/Game.js';import {GameSession} from '../.test-build/gameplay/GameSession.js';import {Progression} from '../.test-build/progression/Progression.js';
const memory=()=>{const m=new Map();return {get:k=>m.get(k)??null,set:(k,v)=>m.set(k,structuredClone(v)),remove:k=>m.delete(k),has:k=>m.has(k)};};
function setup(progression){const input={getState:()=>({moveX:0,moveY:0,attackHeld:false}),endFrame(){},start(){},stop(){},dispose(){}};const session=new GameSession(input);let requests=0;const scheduler={request:()=>++requests,cancel(){}};const renderer={resize(){},render(){},dispose(){}};const game=new Game(renderer,session,scheduler,e=>{throw e},progression);game.initialize();return {game,session,requests:()=>requests};}
test('Quick Play is one legal solo default and restores the full custom setup after menu return',()=>{
 const {game,session,requests}=setup();game.selectPlayerCount(2);game.selectMode('low-gravity');game.selectArena('pit');game.selectStartingWeapon('bow');const custom=session.getMatchSetup();
 assert.equal(game.quickPlay(),true);assert.equal(game.getState(),'PLAYING');assert.deepEqual(session.getMatchSetup(),{arena:'classic',mode:'duel',localPvP:false,startingWeapon:'blade'});
 assert.equal(game.quickPlay(),false);assert.equal(requests(),1);game.pause();game.resume();game.restart();assert.equal(session.getHudState().weapon,'blade');
 game.stop();assert.deepEqual(session.getMatchSetup(),custom);assert.equal(game.getState(),'MENU');game.dispose();
});
test('Quick Play cannot consume a pending Run reward or change saved career/Run progress',()=>{
 const progression=new Progression(memory());progression.begin();progression.launch();progression.result('player',{points:1,upgradedWeapons:[]});
 const saved=structuredClone(progression.getView()),{game}=setup(progression);
 assert.equal(game.quickPlay(),true);assert.equal(game.getHudState().inRun,false);assert.deepEqual(progression.getView(),saved);
 game.stop();assert.deepEqual(progression.getView(),saved);game.continueRun();assert.equal(game.getState(),'MENU');assert.equal(game.getHudState().inRun,true);assert.equal(progression.getView().run.status,'victory');game.dispose();
});
test('random mode restores its preferred starting weapon even while selection is locked',()=>{
 const {game,session}=setup();game.selectStartingWeapon('uzi');game.selectMode('random-weapons');const custom=session.getMatchSetup();game.quickPlay();game.stop();assert.deepEqual(session.getMatchSetup(),custom);game.selectMode('duel');assert.equal(game.getHudState().weapon,'uzi');game.dispose();
});
