import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {GameSession} from '../.test-build/gameplay/GameSession.js';

const idle={moveX:0,moveY:0,pointerX:0,pointerY:0,pointerDown:false,pointerPressed:false,pointerReleased:false,attackHeld:false,jumpPressed:false,dashPressed:false,attackPressed:false,weaponNextPressed:false,weaponPreviousPressed:false};

function setup(){
 const input={state:{...idle},start(){},stop(){},dispose(){},getState(){return this.state},endFrame(){this.state={...this.state,jumpPressed:false,dashPressed:false,attackPressed:false,weaponNextPressed:false,weaponPreviousPressed:false}}};
 return new GameSession(input);
}

test('restart path no longer performs a duplicate session reset',()=>{
 const source=readFileSync(new URL('../src/core/Game.ts',import.meta.url),'utf8');
 const restart=source.match(/restart\(\)\{([^}]*)\}/)?.[1]??'';
 assert.ok(restart,'restart implementation should be present');
 assert.doesNotMatch(restart,/session\.reset\(\)/);
 assert.match(restart,/state\.reset\(\);this\.start\(\)/);
});

test('arena and mode selection do not consume enemy rounds',()=>{
 const game=setup();
 assert.equal(game.getRenderState().opponent.enemyType,'runner');
 game.setArena('towers');
 assert.equal(game.getRenderState().opponent.enemyType,'runner');
 game.setMode('low-gravity');
 assert.equal(game.getRenderState().opponent.enemyType,'runner');
 game.reset();
 assert.equal(game.getRenderState().opponent.enemyType,'runner');
 game.reset();
 assert.equal(game.getRenderState().opponent.enemyType,'tank');
});

test('render state exposes the actual enemy maximum health',()=>{
 const game=setup();
 game.reset();
 game.reset();
 const state=game.getRenderState();
 assert.equal(state.opponent.enemyType,'tank');
 assert.equal(state.opponent.health,170);
 assert.equal(state.opponent.maxHealth,170);
 assert.equal(state.player.health,100);
 assert.equal(state.player.maxHealth,100);
});

test('HUD wiring uses max health instead of a hard-coded 100',()=>{
 const gameSource=readFileSync(new URL('../src/core/Game.ts',import.meta.url),'utf8');
 const uiSource=readFileSync(new URL('../src/ui/GameUI.ts',import.meta.url),'utf8');
 assert.match(gameSource,/getHudState\(\)\{return this\.session\.getHudState\(\);\}/);
 const sessionSource=readFileSync(new URL('../src/gameplay/GameSession.ts',import.meta.url),'utf8');
 assert.match(sessionSource,/opponentMaxHealth:this\.opponent\.maxHealth/);
 assert.match(sessionSource,/playerMaxHealth:this\.player\.maxHealth/);
 assert.match(uiSource,/opponentHealth\/opponentMax\*100/);
 assert.match(uiSource,/playerHealth\/playerMax\*100/);
 assert.match(uiSource,/opponentHealthLabel\.textContent=Math\.ceil\(opponentHealth\)\+"\/"\+Math\.ceil\(opponentMax\)/);
});
