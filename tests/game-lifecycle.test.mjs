import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../.test-build/core/Game.js';
import {GameSession} from '../.test-build/gameplay/GameSession.js';

const idle={moveX:0,moveY:0,pointerX:0,pointerY:0,pointerDown:false,pointerPressed:false,pointerReleased:false,attackHeld:false,jumpPressed:false,dashPressed:false,attackPressed:false,weaponNextPressed:false,weaponPreviousPressed:false};

function setup(){
 const input={state:{...idle},start(){},stop(){},dispose(){},getState(){return this.state},endFrame(){this.state={...this.state,jumpPressed:false,dashPressed:false,attackPressed:false,weaponNextPressed:false,weaponPreviousPressed:false}}};
 const session=new GameSession(input);
 const renderer={resize(){},render(){},dispose(){}};
 let nextHandle=0;
 const scheduled=new Set();
 const scheduler={request(){const handle=++nextHandle;scheduled.add(handle);return handle;},cancel(handle){scheduled.delete(handle);}};
 const game=new Game(renderer,session,scheduler,error=>{throw error;});
 game.initialize();
 return {game,session};
}

test('restart advances the enemy sequence exactly once',()=>{
 const {game,session}=setup();
 game.start();
 assert.equal(session.getRenderState().opponent.enemyType,'runner');
 game.restart();
 assert.equal(session.getRenderState().opponent.enemyType,'tank');
 game.restart();
 assert.equal(session.getRenderState().opponent.enemyType,'shooter');
 game.dispose();
});

test('arena and mode selection do not consume enemy rounds',()=>{
 const {game,session}=setup();
 game.selectArena('towers');
 game.selectMode('low-gravity');
 assert.equal(session.getRenderState().opponent.enemyType,'runner');
 game.start();
 assert.equal(session.getRenderState().opponent.enemyType,'runner');
 game.stop();
 game.selectArena('classic');
 game.selectMode('duel');
 game.start();
 assert.equal(session.getRenderState().opponent.enemyType,'tank');
 game.dispose();
});

test('HUD exposes the actual enemy maximum health',()=>{
 const {game}=setup();
 game.start();
 game.restart();
 const hud=game.getHudState();
 assert.equal(hud.opponentHealth,170);
 assert.equal(hud.opponentMaxHealth,170);
 assert.equal(hud.playerHealth,100);
 assert.equal(hud.playerMaxHealth,100);
 game.dispose();
});
