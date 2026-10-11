import test from "node:test";
import assert from "node:assert/strict";
import {GameState} from "../.test-build/core/GameState.js";
import {pausePlayingMatch} from "../.test-build/platform/mobile/NativePausePolicy.js";

test("native background event pauses an active match once",()=>{
 let state=GameState.PLAYING;
 let calls=0;
 const actions={getState:()=>state,pause:()=>{calls++;state=GameState.PAUSED;}};
 assert.equal(pausePlayingMatch(actions),true);
 assert.equal(state,GameState.PAUSED);
 assert.equal(pausePlayingMatch(actions),false);
 assert.equal(calls,1);
});

test("native foreground event can pause a match when background callback was missed",()=>{
 let state=GameState.PLAYING;
 let calls=0;
 // On Android a suspended WebView may miss appStateChange(false). Applying
 // the same idempotent guard on appStateChange(true) must still pause safely.
 const actions={getState:()=>state,pause:()=>{calls++;state=GameState.PAUSED;}};
 assert.equal(pausePlayingMatch(actions),true);
 assert.equal(calls,1);
 assert.equal(state,GameState.PAUSED);
});

test("native lifecycle does not pause menu, results or an already paused match",()=>{
 for(const state of [GameState.MENU,GameState.GAME_OVER,GameState.PAUSED]){
  let called=0;
  assert.equal(pausePlayingMatch({getState:()=>state,pause:()=>{called++;}}),false);
  assert.equal(called,0);
 }
});
