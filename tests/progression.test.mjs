import {test} from "node:test";
import assert from "node:assert/strict";
import {Progression,PROGRESSION_STORAGE_KEY} from "../.test-build/progression/Progression.js";
import {GameSession} from "../.test-build/gameplay/GameSession.js";

const makeStore=()=>{
 const values=new Map();
 return{
  values,
  get(key){const raw=values.get(key);if(raw===undefined)return null;return JSON.parse(raw);},
  set(key,value){values.set(key,JSON.stringify(value));},
  remove(key){values.delete(key);},
  has(key){return values.has(key);}
 };
};
const nextFight=(p)=>{
 if(p.getView().run?.status==="victory"){
  assert.equal(p.canAdvance(),true);
  assert.equal(p.advance(),true);
 }
 assert.equal(p.launch(),true);
};
const winWithChoice=(p)=>{
 assert.equal(p.result("player",{points:1,upgradedWeapons:p.getView().run.upgradedWeapons}),true);
 const view=p.getView();
 if(view.run.status==="complete")return;
 assert.equal(view.choices.length,3);
 assert.equal(p.canAdvance(),false,"cannot skip the between-wave upgrade");
 const choice=view.choices[0];
 assert.equal(p.purchase(choice,{points:0,upgradedWeapons:[...view.run.upgradedWeapons,choice]}),true);
 assert.equal(p.purchase(choice,{points:0,upgradedWeapons:[...view.run.upgradedWeapons,choice]}),false);
 assert.equal(p.getView().run.points,0);
};
test("first launch starts without an active Run or permanent medals",()=>{
 const store=makeStore(),p=new Progression(store),view=p.getView();
 assert.equal(view.run,null);
 assert.deepEqual(view.medals,[]);
 assert.equal(view.totalWins,0);
 assert.equal(store.values.size,0);
});
test("Run requires an intermission choice and awards once per victory",()=>{
 const p=new Progression(makeStore());
 p.begin();nextFight(p);
 winWithChoice(p);
 assert.equal(p.result("player",{points:1,upgradedWeapons:[]}),false,"duplicate winner event must not award twice");
 assert.equal(p.getView().totalWins,1);
 assert.deepEqual(p.getView().medals,["rookie"]);
 nextFight(p);
 assert.equal(p.getView().run.stage,2);
 assert.equal(p.getView().run.status,"fighting");
 assert.equal(p.getView().run.points,0);
});
test("four-match Run completes with a Boss, unlocks achievements and preserves normal combat",()=>{
 const p=new Progression(makeStore());
 p.begin();
 for(let stage=1;stage<=4;stage++){
  nextFight(p);
  assert.equal(p.getView().run.stage,stage);
  winWithChoice(p);
 }
 const done=p.getView();
 assert.equal(done.run.status,"complete");
 assert.equal(done.bestStage,4);
 assert.equal(done.completedRuns,1);
 assert.equal(done.totalWins,4);
 assert.deepEqual(done.medals,["rookie","veteran","champion"]);
 assert.equal(p.canLaunch(),false);
 assert.equal(p.advance(),false);
 p.clear();
 assert.equal(p.getView().run,null);
 assert.equal(p.getView().completedRuns,1,"permanent milestones remain after Run exit");
});
test("loss and reload retry the same encounter without duplicated rewards",()=>{
 const store=makeStore(),p=new Progression(store);
 p.begin();nextFight(p);
 assert.equal(p.result("opponent",{points:0,upgradedWeapons:[]}),true);
 assert.equal(p.getView().totalWins,0);
 const restored=new Progression(store);
 assert.equal(restored.getView().run.status,"defeat");
 assert.equal(restored.getView().run.stage,1);
 assert.equal(restored.launch(),true);
 assert.equal(restored.getView().run.status,"fighting");
 const restart=new Progression(store);
 assert.equal(restart.getView().run.status,"ready","mid-fight restarts at the start of the same wave");
 assert.equal(restart.launch(),true);
 assert.equal(restart.result("player",{points:1,upgradedWeapons:[]}),true);
 assert.equal(new Progression(store).getView().run.status,"victory");
 assert.equal(new Progression(store).getView().run.points,1);
});
test("checkpoint upgrades persist across reloads and corrupted data recovers safely",()=>{
 const store=makeStore(),p=new Progression(store);
 p.begin();nextFight(p);winWithChoice(p);nextFight(p);
 assert.equal(p.result("player",{points:1,upgradedWeapons:p.getView().run.upgradedWeapons}),true);
 const restored=new Progression(store),old=restored.getView();
 assert.equal(old.run.stage,2);
 assert.equal(old.run.status,"victory");
 assert.deepEqual(old.run.upgradedWeapons,p.getView().run.upgradedWeapons);
 const id=old.choices[0];
 assert.equal(restored.purchase(id,{points:0,upgradedWeapons:[...old.run.upgradedWeapons,id]}),true);
 assert.equal(new Progression(store).getView().run.points,0);
 store.values.set(PROGRESSION_STORAGE_KEY,"NOT JSON");
 assert.equal(new Progression(store).getView().run,null);
 store.values.set(PROGRESSION_STORAGE_KEY,JSON.stringify({version:999,run:{stage:4,status:"complete"},totalWins:999}));
 assert.equal(new Progression(store).getView().totalWins,0);
});
test("version 0 legacy counters migrate to v1 without fabricating a Run",()=>{
 const store=makeStore();
 store.values.set(PROGRESSION_STORAGE_KEY,JSON.stringify({version:0,totalWins:3,completedRuns:1,bestStage:4,run:{stage:3,status:"victory",points:1}}));
 const p=new Progression(store);
 assert.equal(p.getView().run,null);
 assert.deepEqual(p.getView().medals,["rookie","veteran","champion"]);
 assert.equal(store.get(PROGRESSION_STORAGE_KEY).version,1);
});
test("a complete run maps to runner, tank, shooter and a strong boss without changing regular modes",()=>{
 const input={getState(){return{};},endFrame(){}};
 const session=new GameSession(input);
 const original=session.getUpgradeSnapshot();
 for(const [i,enemy,hp] of [[1,"runner",100],[2,"tank",115],[3,"shooter",130],[4,"boss",175]]){
  session.startRunEncounter(i);
  assert.equal(session.getRenderState().opponent.enemyType,enemy);
  assert.equal(session.getHudState().opponentMaxHealth,hp);
 }
 session.setUpgradeSnapshot({points:2,upgradedWeapons:["hammer"]});
 assert.equal(session.upgradeWeapon("hammer"),false);
 assert.equal(session.upgradeWeapon("bow"),true);
 session.leaveRun();
 session.setMode("low-gravity");
 session.setArena("classic");
 session.setUpgradeSnapshot(original);
 assert.deepEqual(session.getUpgradeSnapshot(),original);
 session.reset(false);
 assert.equal(session.getRenderState().opponent.enemyType,"runner");
});
