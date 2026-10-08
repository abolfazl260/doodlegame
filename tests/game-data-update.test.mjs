import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {parseLiveGameData,downloadLatestGameData,GITHUB_GAME_DATA_URL,GAME_DATA_STORAGE_KEY} from "../.test-build/gameplay/LiveGameData.js";
import {GameSession} from "../.test-build/gameplay/GameSession.js";

const bundled=JSON.parse(readFileSync("public/game-data.json","utf8"));
const idle={moveX:0,moveY:0,pointerX:0,pointerY:0,pointerDown:false,pointerPressed:false,pointerReleased:false,attackHeld:false,jumpPressed:false,dashPressed:false,attackPressed:false,weaponNextPressed:false,weaponPreviousPressed:false};
function make(){return new GameSession({getState:()=>idle,endFrame(){}});}
test("GitHub update file is valid, versioned, and covers all eight weapons and sixteen arenas",()=>{
 const value=parseLiveGameData(bundled);
 assert.ok(value);
 assert.equal(value.dataVersion,1);
 assert.equal(Object.keys(value.weapons).length,8);
 assert.equal(Object.keys(value.arenas).length,16);
 assert.equal(GITHUB_GAME_DATA_URL,"https://raw.githubusercontent.com/abolfazl260/doodlegame/main/public/game-data.json");
 assert.equal(GAME_DATA_STORAGE_KEY,"doodlegame.gameData.v1");
});
test("reject incompatible schema, prototype pollution, unauthorized keys and dangerous physics values",()=>{
 const valid={schemaVersion:1,dataVersion:2,weapons:{blade:{damage:12}},arenas:{classic:{speedMultiplier:1.12}}};
 assert.ok(parseLiveGameData(valid));
 for(const invalid of [
  {...valid,schemaVersion:2},{...valid,dataVersion:-2},{...valid,dataVersion:1.5},
  {...valid,weapons:{blade:{damage:Infinity}}},{...valid,weapons:{blade:{damage:-3}}},
  {...valid,weapons:{blade:{cooldown:0}}},{...valid,weapons:{blade:{damage:8,script:"alert(1)"}}},
  {...valid,arenas:{classic:{jumpMultiplier:100}}},
  {...valid,arenas:{unknown:{speedMultiplier:1}}},
  {...valid,weapons:JSON.parse('{"__proto__":{"damage":9}}')},
  {...valid,weapons:{} ,arenas:{}},
  {...valid,eval:"code"}
 ])assert.equal(parseLiveGameData(invalid),null);
});
test("network request is click-triggered, no-store, and parses data without executing code",async()=>{
 const seen=[];
 const fetcher=async(url,init)=>{
  seen.push({url,init});return{ok:true,headers:new Headers(),text:async()=>JSON.stringify(bundled)};
 };
 const result=await downloadLatestGameData(fetcher);
 assert.equal(result.dataVersion,1);
 assert.deepEqual(Object.keys(result.weapons).length,8);
 assert.equal(seen.length,1);
 assert.equal(seen[0].url,GITHUB_GAME_DATA_URL);
 assert.equal(seen[0].init.cache,"no-store");
 assert.equal(seen[0].init.headers.Accept,"application/json");
 assert.ok(seen[0].init.signal);
});
test("failed HTTP, oversized or invalid server response never returns data",async()=>{
 const response=(ok,body,len="0")=>async()=>({ok,headers:new Headers({"content-length":len}),text:async()=>body});
 await assert.rejects(downloadLatestGameData(response(false,"{}")));
 await assert.rejects(downloadLatestGameData(response(true,"bad-json")));
 await assert.rejects(downloadLatestGameData(response(true,JSON.stringify(bundled),"500000")));
 await assert.rejects(downloadLatestGameData(response(true,"x".repeat(32769))));
});
test("live data changes real game weapon stats and arena movement while defaults remain recoverable",()=>{
 const game=make();
 const startDamage=game.weaponStats.blade.damage;
 const startCooldown=game.weaponStats.bow.cooldown;
 const startSpeed=game.arena.speedMultiplier;
 const changed=parseLiveGameData({schemaVersion:1,dataVersion:3,weapons:{blade:{damage:23},bow:{cooldown:.3}},arenas:{classic:{speedMultiplier:1.4}}});
 assert.ok(changed);
 game.setLiveGameData(changed);
 assert.equal(game.weaponStats.blade.damage,23);
 assert.equal(game.weaponStats.bow.cooldown,.3);
 assert.equal(game.arena.speedMultiplier,1.4);
 assert.equal(game.weaponStats.hammer.damage,14,"unspecified weapons remain on bundled defaults");
 game.setArena("towers");
 assert.equal(game.arena.speedMultiplier,1);
 game.setLiveGameData(null);
 game.setArena("classic");
 assert.equal(game.weaponStats.blade.damage,startDamage);
 assert.equal(game.weaponStats.bow.cooldown,startCooldown);
 assert.equal(game.arena.speedMultiplier,startSpeed);
 game.dispose();
});
test("Android-only update button has no explanatory copy and language control stays compact",()=>{
 const ui=readFileSync("src/ui/GameUI.ts","utf8"),css=readFileSync("src/styles.css","utf8");
 const main=readFileSync("src/main.ts","utf8");
 assert.match(ui,/this\.updateButton\.hidden=true/);
 assert.match(ui,/this\.updateButton\.textContent=messages\.buttons\.update/);
 assert.match(main,/Capacitor\.getPlatform\(\)==="android"/);
 assert.match(main,/downloadLatestGameData\(\)/);
 assert.match(main,/storage\.set\(GAME_DATA_STORAGE_KEY,latest\)/);
 assert.match(css,/\.game-ui__update-button\[hidden\]/);
 assert.match(css,/min-height:28px;height:28px/);
});
