import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {getArenaTheme} from "../.test-build/themes/ArenaThemes.js";
import {getDownloadedArena,installedArenas,arenaImageDataUrl} from "../.test-build/gameplay/DownloadableArenas.js";
import {WebInput} from "../.test-build/platform/web/WebInput.js";
import {GameSession} from "../.test-build/gameplay/GameSession.js";
import {fighterVisual} from "../.test-build/rendering/FighterVisual.js";

import {ARENA_CATEGORY_IDS,arenaCategories,arenaPreviewUrl} from "../.test-build/ui/ArenaPreviews.js";
import {MobileOnboarding} from "../.test-build/ui/MobileOnboarding.js";
import {touchActionGuide,touchActionStatus,WeaponTipTracker} from "../.test-build/ui/TouchWeaponGuide.js";
const states={MENU:"MENU",PLAYING:"PLAYING",PAUSED:"PAUSED",GAME_OVER:"GAME_OVER"};
const compiled=readFileSync(".test-build/ui/GameUI.js","utf8");
const gameStateImport=compiled.split("\n").find(line=>line.startsWith("import ")&&line.includes("GameState"));
assert.ok(gameStateImport);
const themeImport=compiled.split("\n").find(line=>line.startsWith("import ")&&line.includes("ArenaThemes"));
assert.ok(themeImport,"compiled UI imports arena themes");
const extraImport=compiled.split("\n").find(line=>line.startsWith("import ")&&line.includes("DownloadableArenas"));
assert.ok(extraImport,"compiled UI imports downloaded arenas");
const runnable=compiled.replace(/^import .*ArenaPreviews.*$/m,"").replace(/^import .*MobileOnboarding.*$/m,"").replace(/^import .*TouchWeaponGuide.*$/m,"").replace(gameStateImport,"const GameState=states;").replace(themeImport,"").replace(extraImport,"").replace("export class GameUI","class GameUI");
const {GameUI}=new Function("states","getArenaTheme","getDownloadedArena","installedArenas","arenaImageDataUrl","MobileOnboarding","touchActionGuide","touchActionStatus","WeaponTipTracker","ARENA_CATEGORY_IDS","arenaCategories","arenaPreviewUrl",runnable+";return {GameUI};")(states,getArenaTheme,getDownloadedArena,installedArenas,arenaImageDataUrl,MobileOnboarding,touchActionGuide,touchActionStatus,WeaponTipTracker,ARENA_CATEGORY_IDS,arenaCategories,arenaPreviewUrl);

class Node{
 constructor(tag="div"){
  this.tag=tag;this.children=[];this.dataset={};this.attributes={};
  this.hidden=false;this.disabled=false;this.value="";this.textContent="";this.innerHTML="";
  this.style={setProperty(){}};
  this.classList={add(){},remove(){},toggle(){}};
  this.listeners=new Map();this.capture=new Set();
 }
 append(...nodes){this.children.push(...nodes);}
 replaceChildren(...nodes){this.children=[...nodes];}
 addEventListener(type,fn){const listeners=this.listeners.get(type)??[];listeners.push(fn);this.listeners.set(type,listeners);}
 emit(type,data={}){for(const fn of this.listeners.get(type)??[])fn({pointerId:3,clientX:500,clientY:200,preventDefault(){},...data});}
 setPointerCapture(id){this.capture.add(id);}
 hasPointerCapture(id){return this.capture.has(id);}
 releasePointerCapture(id){this.capture.delete(id);this.emit("lostpointercapture",{pointerId:id});}
 getBoundingClientRect(){return {left:0,top:0,width:112,height:112};}
 setAttribute(name,value){this.attributes[name]=value;}
 getAttribute(name){return this.attributes[name];}
 get firstElementChild(){return this.children.find(child=>typeof child==="object")??null;}
 get options(){return this.children.filter(child=>child?.tag==="option");}
 focus(){}
 remove(){}
 click(){this.onclick?.();}
}
const globalListeners=new Map();
globalThis.window={
 addEventListener(type,fn){globalListeners.set(type,fn);},
 removeEventListener(type,fn){if(globalListeners.get(type)===fn)globalListeners.delete(type);},
 requestAnimationFrame(){return 1;},cancelAnimationFrame(){}
};
globalThis.document={
 createElement:tag=>new Node(tag),
 createElementNS:(_ns,tag)=>new Node(tag),
 addEventListener(){},removeEventListener(){},visibilityState:"visible"
};

const arenas=["classic","towers","pit","steps","zigzag","sky","moving","fortress","bridge","crater","vertical","ruins","conveyor","collapse","storm","reactor"];
const modes=["duel","missile-duel","melee-only","random-weapons","sudden-death","low-gravity","king-of-hill"];
const weapons=["blade","hammer","blaster","uzi","boomerang","bow","bomb","missile","spear"];
const messages={
 title:"DoodleGame",rotateHint:"Rotate",language:{label:"Language",english:"English",persian:"Farsi"},
 buttons:{start:"Start",pause:"Pause",resume:"Resume",restart:"Restart",help:"Help",attack:"Attack",previousWeapon:"Prev",nextWeapon:"Next",fireMissile:"Fire"},
 privacy:{button:"Privacy",title:"Privacy",close:"Close",web:"Web",networkNote:"Offline",html:""},
 status:{win:"Win",lose:"Lose",hill:"Hill"},details:{equipped:"Equipped",angle:"Angle",power:"Power"},
 sections:{gameMode:"Mode",arena:"Arena",weapon:"Weapon"},
 characterNames:{playerOne:"PLAYER 1",playerTwo:"PLAYER 2",opponent:"OPPONENT",optional:"Optional name",wins:"WINS"},
 panels:{weaponUpgrades:"Upgrades",missileControl:"Missile",bowDraw:"Bow",releaseToFire:"Release"},
 upgrade:{points:"Points",choose:"Choose",earn:"Earn",upgraded:"Upgraded",upgrade:"Upgrade",locked:"Locked"},
 helpHtml:"",arenas:Object.fromEntries(arenas.map(x=>[x,x])),
 modes:Object.fromEntries(modes.map(x=>[x,x])),weapons:Object.fromEntries(weapons.map(x=>[x,x])),
 upgrades:Object.fromEntries(weapons.map(x=>[x,{name:x+"+",description:x}]))
};
function setup(weapon="missile"){
 const calls=[];
 const actions=Object.fromEntries(["start","pause","resume","restart","weaponNext","weaponPrevious"].map(x=>[x,()=>calls.push([x])]));
 Object.assign(actions,{
  weaponSelect(){},selectStartingWeapon(){},upgradeWeapon(){},arenaSelect(){},modeSelect(){},
  setMissileAngle(value){calls.push(["angle",value]);hud.missileAngle=value;},
  setMissilePower(value){calls.push(["power",value]);hud.missilePower=value;},
  fireWeapon(){calls.push(["fire"]);},
  setTouchMove(x,y){calls.push(["move",x,y]);},
  touchAttackStart(){calls.push(["start"]);},
  touchAttackEnd(){calls.push(["end"]);},
  touchAttackCancel(){calls.push(["cancel"]);},
  touchGrab(){calls.push(["grab"]);}
 });
 const i18n={messages,locale:"en",setLocale(){},subscribe(){return ()=>{}}};
 const hud={playerHealth:100,playerMaxHealth:100,opponentHealth:100,opponentMaxHealth:100,
  weapon,winner:null,arena:"fortress",mode:"duel",hill:{player:0,opponent:0,target:8},
  bowCharge:0,missileAngle:45,missilePower:13,playerFacing:1,upgradePoints:0,upgradedWeapons:[]};
 const ui=new GameUI(new Node("root"),actions,i18n);
 ui.bind(()=>()=>{},()=>hud);
 ui.currentState=states.PLAYING;
 ui.render(states.PLAYING,hud);
 return {ui,hud,calls};
}

test("dragging the attack button fires once; the separate aim pad controls direction",()=>{
 const {ui,calls}=setup();ui.mobileAttackButton.emit("pointerdown",{pointerId:7});
 ui.mobileAttackButton.emit("pointermove",{pointerId:7,clientX:420,clientY:180});
 assert.equal(calls.some(([name])=>name==="angle"||name==="power"),false);
 ui.mobileAttackButton.emit("pointerup",{pointerId:7,clientX:420,clientY:180});
 assert.deepEqual(calls.filter(([name])=>name==="start"||name==="end").map(([name])=>name),["start","end"]);
 ui.mobileAttackButton.emit("lostpointercapture",{pointerId:7});
 assert.equal(calls.filter(([name])=>name==="start").length,1);ui.dispose();
});

test("short missile tap retains aim; other pointer cannot fire; cancellation never fires",()=>{
 const {ui,calls,hud}=setup();
 ui.mobileAttackButton.emit("pointerdown",{pointerId:5});
 ui.mobileAttackButton.emit("pointerdown",{pointerId:6});
 ui.mobileAttackButton.emit("pointermove",{pointerId:5,clientX:498,clientY:198});
 ui.mobileAttackButton.emit("pointerup",{pointerId:6});
 assert.equal(calls.some(([name])=>name==="start"),false);
 ui.mobileAttackButton.emit("pointercancel",{pointerId:5});
 ui.mobileAttackButton.emit("pointerup",{pointerId:5});
 assert.equal(calls.some(([name])=>name==="start"),false);
 assert.equal(hud.missileAngle,45);
 assert.equal(hud.missilePower,13);
 ui.mobileAttackButton.emit("pointerdown",{pointerId:8});
 ui.mobileAttackButton.emit("pointerup",{pointerId:8});
 assert.equal(calls.filter(([name])=>name==="start").length,1);
 ui.dispose();
});

test("pausing, blur and capture loss cancel missile aim safely",()=>{
 const {ui,calls,hud}=setup();
 ui.mobileAttackButton.emit("pointerdown",{pointerId:9});
 globalListeners.get("blur")();
 ui.mobileAttackButton.emit("pointerup",{pointerId:9});
 assert.equal(calls.some(([name])=>name==="start"),false);
 ui.mobileAttackButton.emit("pointerdown",{pointerId:11});
 ui.mobileAttackButton.emit("lostpointercapture",{pointerId:11});
 ui.mobileAttackButton.emit("pointerup",{pointerId:11});
 assert.equal(calls.some(([name])=>name==="start"),false);
 ui.mobileAttackButton.emit("pointerdown",{pointerId:12});
 ui.render(states.PAUSED,hud);
 ui.mobileAttackButton.emit("pointerup",{pointerId:12});
 assert.equal(calls.some(([name])=>name==="start"),false);
 ui.dispose();
});

test("joystick can move simultaneously with missile gesture; other weapons preserve hold/release",async()=>{
 const {ui,calls,hud}=setup();
 ui.joystick.emit("pointerdown",{pointerId:1,clientX:85,clientY:45});
 ui.mobileAttackButton.emit("pointerdown",{pointerId:2});
 ui.mobileAttackButton.emit("pointermove",{pointerId:2,clientX:425,clientY:135});
 ui.mobileAttackButton.emit("pointerup",{pointerId:2});
 assert.ok(calls.some(([name,x])=>name==="move"&&x>0));
 assert.equal(calls.filter(([name])=>name==="start").length,1);
 ui.joystick.emit("pointerup",{pointerId:1});
 hud.weapon="bow";
 ui.render(states.PLAYING,hud);
 ui.mobileAttackButton.emit("pointerdown",{pointerId:3});
 ui.mobileAttackButton.emit("pointerup",{pointerId:3});
 assert.deepEqual(calls.slice(-2).map(([name])=>name),["start","end"]);
 ui.mobileAttackButton.emit("pointerdown",{pointerId:4});
 await new Promise(resolve=>setTimeout(resolve,175));
 ui.mobileAttackButton.emit("pointercancel",{pointerId:4});
 assert.equal(calls.at(-1)[0],"cancel");
 ui.dispose();
});

test("input and session cancel a charged bow without launching it",()=>{
 const input=new WebInput({});
 input.touchAttack();
 assert.equal(input.getState().attackPressed,true);
 input.touchAttackCancel();
 assert.equal(input.getState().attackPressed,false);
 assert.equal(input.getState().attackHeld,false);
 const session=new GameSession(input);
 session.player.bowCharging=true;
 session.player.bowCharge=.8;
 session.cancelTouchAttack();
 assert.equal(session.player.bowCharging,false);
 assert.equal(session.player.bowCharge,0);
 session.dispose();
});

test("missile shows the shared aim pad without restoring legacy sliders or trajectory clutter",()=>{
 const css=readFileSync("src/styles.css","utf8"),source=readFileSync("src/ui/GameUI.ts","utf8");
 assert.doesNotMatch(source,/missileAim|setMissileAngle|setMissilePower|this\.details/);
 assert.doesNotMatch(css,/game-ui__missile-aim|game-ui__details/);
 const {ui,hud,calls}=setup();assert.equal(ui.topHud.children.length,3);
 assert.equal(ui.aimPads[0].hidden,false,"first player can aim missile");
 assert.equal(ui.aimPads[1].hidden,true,"second player pad hidden for solo duel");
 ui.aimPads[0].emit("pointerdown",{pointerId:17,clientX:98,clientY:8});
 ui.aimPads[0].emit("pointermove",{pointerId:17,clientX:90,clientY:80});
 ui.aimPads[0].emit("pointerup",{pointerId:17});
 assert.ok(ui.aimPads[0].getAttribute("aria-label").includes("Weapon direction"));
 assert.equal(calls.filter(([key])=>key==="fire").length,0,"aiming does not fire automatically");
 ui.dispose();
});

test("missile retains familiar 45-degree default until player selects a direction",()=>{
 const input=new WebInput({}),session=new GameSession(input);
 session.setMode("missile-duel");
 for(const facing of [-1,1]){
  session.reset(false);session.player.facing=facing;
  const hud=session.getHudState();
  const defaultAngle=facing<0?Math.PI*3/4:Math.PI/4;
  assert.ok(Math.abs(hud.weaponAimAngle-defaultAngle)<1e-6);
  session.fireWeapon();
  const missile=session.getRenderState().projectiles.find(p=>p.owner==="player");
  assert.ok(missile);
  assert.ok(Math.abs(missile.vx-Math.cos(defaultAngle)*13)<.001);
  assert.ok(Math.abs(missile.vy-Math.sin(defaultAngle)*13)<.001);
 }
 session.dispose();
});

test("both humans aim missiles in all directions with the normal mobile aim interface",()=>{
 const input=new WebInput({}),session=new GameSession(input);
 session.setLocalPvP(true);session.setMode("missile-duel");
 const cases=[[1,.6,.8],[1,-.6,.8],[1,0,-1],[2,-.8,-.6],[2,.8,-.6],[2,0,1]];
 for(const [who,x,y] of cases){
  session.reset(false);
  const f=who===1?session.player:session.opponent;
  const other=who===1?session.opponent:session.player;
  const before=other.aimAngle;
  session.setWeaponAim(who,x,y);
  const angle=Math.atan2(y,x);
  assert.ok(Math.abs(f.aimAngle-angle)<1e-8);
  assert.equal(f.facing,Math.sign(x)||f.facing);
  assert.equal(other.aimAngle,before);
  const hud=session.getHudState();
  assert.ok(Math.abs((who===1?hud.weaponAimAngle:hud.secondAimAngle)-angle)<1e-8);
  const pose=fighterVisual(who===1?session.getRenderState().player:session.getRenderState().opponent);
  assert.ok(Math.abs(pose.toolAngle-Math.atan2(Math.sin(angle),Math.abs(Math.cos(angle))))<.02,
   "launcher follows aim direction in the shared Canvas/WebGL rig");
  if(who===1)input.touchAttack();else input.player2TouchAttackStart();
  session.update(1/60);
  const shot=session.getRenderState().projectiles.find(p=>p.owner===(who===1?"player":"opponent"));
  assert.ok(shot,"aimed missile must launch for player "+who);
  assert.ok(Math.abs(shot.vx-Math.cos(angle)*13)<.03);
  assert.ok(Math.abs(shot.vy-Math.sin(angle)*13)<.25);
  assert.ok(Math.abs(shot.rotation-angle)<.05,"missile sprite follows projectile heading");
  input.resetTransientState();
 }
 session.dispose();
});

test("keyboard missile aim rotates and non-owner player 2 cannot aim in solo mode",()=>{
 const input=new WebInput({}),session=new GameSession(input);
 session.setMode("missile-duel");
 session.setWeaponAim(2,0,1);
 assert.equal(session.opponent.aimAngle,null);
 input.getState().aimUpHeld=true;
 session.update(1/60);
 assert.ok(session.player.aimAngle>Math.PI/4);
 input.getState().aimUpHeld=false;
 input.getState().aimDownHeld=true;
 session.update(1/60);
 assert.ok(Math.abs(session.player.aimAngle-Math.PI/4)<.001);
 session.dispose();
});

test("missile hold can be cancelled without a shot and never auto-repeats",async()=>{
 const {ui,calls}=setup();ui.mobileAttackButton.emit("pointerdown",{pointerId:81});
 await new Promise(resolve=>setTimeout(resolve,180));assert.equal(calls.some(([n])=>n==="start"),false);
 ui.mobileAttackButton.emit("pointercancel",{pointerId:81});ui.mobileAttackButton.emit("pointerup",{pointerId:81});
 assert.equal(calls.some(([n])=>n==="start"),false);ui.dispose();
});

test("pause requires a full two-second pointer hold; quick taps and stray pointers do nothing",async()=>{
 const {ui,hud,calls}=setup("blade");
 const button=ui.mobilePauseButton;
 assert.equal(button.type,"button");
 assert.equal(button.textContent,"Ⅱ");
 assert.match(button.getAttribute("aria-label"),/Hold for 2 seconds/);
 assert.ok(ui.root.children.includes(button),"pause button stays accessible outside touch-only controls");
 assert.equal(ui.mobileControls.children.includes(button),false);
 button.click();
 assert.equal(calls.filter(([name])=>name==="pause").length,0);
 button.emit("pointerdown",{pointerId:71,button:0,clientX:100,clientY:70});
 button.emit("pointerup",{pointerId:71,button:0});
 assert.equal(calls.filter(([name])=>name==="pause").length,0);
 button.emit("pointerdown",{pointerId:72,button:0,clientX:100,clientY:70});
 button.emit("pointerdown",{pointerId:73,button:0,clientX:100,clientY:70});
 await new Promise(resolve=>setTimeout(resolve,2050));
 assert.equal(calls.filter(([name])=>name==="pause").length,1);
 button.emit("pointerup",{pointerId:72,button:0});
 button.click();
 assert.equal(calls.filter(([name])=>name==="pause").length,1);
 ui.render(states.PAUSED,hud);
 assert.equal(button.hidden,true);
 button.emit("pointerdown",{pointerId:74,button:0});
 assert.equal(calls.filter(([name])=>name==="pause").length,1);
 ui.dispose();
});

test("pause hold is cancelled by pointer travel, cancel, release, lost capture, and leaving gameplay",async()=>{
 const {ui,hud,calls}=setup("blade");
 const button=ui.mobilePauseButton;
 button.emit("pointerdown",{pointerId:21,button:0,clientX:100,clientY:70});
 button.emit("pointermove",{pointerId:21,clientX:125,clientY:70});
 button.emit("pointerdown",{pointerId:22,button:0,clientX:100,clientY:70});
 button.emit("pointercancel",{pointerId:22});
 button.emit("pointerdown",{pointerId:23,button:0,clientX:100,clientY:70});
 button.emit("lostpointercapture",{pointerId:23});
 button.emit("pointerdown",{pointerId:24,button:0,clientX:100,clientY:70});
 button.emit("pointerleave",{pointerId:24});
 button.emit("pointerdown",{pointerId:25,button:0,clientX:100,clientY:70});
 ui.render(states.PAUSED,hud);
 await new Promise(resolve=>setTimeout(resolve,2050));
 assert.equal(calls.filter(([name])=>name==="pause").length,0);
 assert.equal(button.hidden,true);
 ui.dispose();
});

test("ATTACK owns only the first active pointer for automatic, Bow and tap weapons",async()=>{
 for(const weapon of ["uzi","bow","blade"]){
  const {ui,calls}=setup(weapon);
  ui.mobileAttackButton.emit("pointerdown",{pointerId:21});
  ui.mobileAttackButton.emit("pointerdown",{pointerId:22});
  ui.mobileAttackButton.emit("pointerup",{pointerId:22});
  ui.mobileAttackButton.emit("pointercancel",{pointerId:22});
  ui.mobileAttackButton.emit("lostpointercapture",{pointerId:22});
  assert.equal(ui.mobileAttackButton.hasPointerCapture(21),true,weapon+" owner remains captured");
  await new Promise(resolve=>setTimeout(resolve,175));
  assert.deepEqual(calls.filter(([name])=>["start","end","cancel"].includes(name)).map(([name])=>name),
   ["start"],weapon+" ignores unrelated touches");
  ui.mobileAttackButton.emit("pointerup",{pointerId:21});
  ui.mobileAttackButton.emit("lostpointercapture",{pointerId:21});
  ui.mobileAttackButton.emit("pointercancel",{pointerId:21});
  assert.deepEqual(calls.filter(([name])=>["start","end","cancel"].includes(name)).map(([name])=>name),
   ["start","end"],weapon+" releases only once");
  ui.dispose();
 }
});

test("owner cancellation and capture loss cannot fire phantom attacks or leave a held pointer",async()=>{
 for(const kind of ["pointercancel","lostpointercapture"]){
  const {ui,calls}=setup("bow");
  ui.mobileAttackButton.emit("pointerdown",{pointerId:51});
  ui.mobileAttackButton.emit("pointerdown",{pointerId:52});
  await new Promise(resolve=>setTimeout(resolve,175));
  ui.mobileAttackButton.emit(kind,{pointerId:51});
  ui.mobileAttackButton.emit("pointerup",{pointerId:51});
  ui.mobileAttackButton.emit("pointerup",{pointerId:52});
  assert.deepEqual(calls.filter(([name])=>["start","end","cancel"].includes(name)).map(([name])=>name),
   ["start","cancel"],kind+" cancels once and does not fire");
  ui.mobileAttackButton.emit("pointerdown",{pointerId:53});
  ui.mobileAttackButton.emit("pointerup",{pointerId:53});
  assert.deepEqual(calls.filter(([name])=>["start","end","cancel"].includes(name)).map(([name])=>name),
   ["start","cancel","start","end"],"next legitimate tap works");
  ui.dispose();
 }
});

test("weapon switching cancels an owned held attack without cancelling joystick movement",async()=>{
 const {ui,hud,calls}=setup("uzi");
 ui.joystick.emit("pointerdown",{pointerId:11,clientX:82,clientY:48});
 ui.mobileAttackButton.emit("pointerdown",{pointerId:12});
 assert.equal(ui.mobileAttackButton.hasPointerCapture(12),true);
 await new Promise(resolve=>setTimeout(resolve,175));
 hud.weapon="bow";
 ui.render(states.PLAYING,hud);
 assert.equal(ui.mobileAttackButton.hasPointerCapture(12),false);
 assert.equal(calls.filter(([name])=>name==="cancel").length,1);
 assert.equal(calls.some(([name,x])=>name==="move"&&x>0),true);
 assert.equal(ui.joystick.hasPointerCapture(11),true,"movement pointer must keep ownership");
 ui.mobileAttackButton.emit("pointerup",{pointerId:12});
 assert.equal(calls.some(([name])=>name==="end"),false);
 ui.mobileAttackButton.emit("pointerdown",{pointerId:13});
 ui.mobileAttackButton.emit("pointerup",{pointerId:13});
 assert.equal(calls.filter(([name])=>name==="end").length,1);
 ui.joystick.emit("pointerup",{pointerId:11});
 ui.dispose();
});

test("upward swipe from ATTACK triggers only grab for Blade, Bow and Missile",()=>{
 for(const weapon of ["blade","bow","missile"]){
  const {ui,calls}=setup(weapon);
  ui.mobileAttackButton.emit("pointerdown",{pointerId:201,clientX:500,clientY:200});
  ui.mobileAttackButton.emit("pointermove",{pointerId:201,clientX:505,clientY:132});
  ui.mobileAttackButton.emit("pointerup",{pointerId:201,clientX:505,clientY:132});
  assert.equal(calls.filter(([name])=>name==="grab").length,1,weapon);
  assert.equal(calls.some(([name])=>["start","end","fire"].includes(name)),false,weapon);
  ui.dispose();
 }
});
test("an invalid pointer capture cannot arm an attack",()=>{
 const {ui,calls}=setup("uzi");
 const capture=ui.mobileAttackButton.setPointerCapture;
 ui.mobileAttackButton.setPointerCapture=()=>{throw new Error("stale pointer");};
 ui.mobileAttackButton.emit("pointerdown",{pointerId:91});
 ui.mobileAttackButton.emit("pointerup",{pointerId:91});
 assert.deepEqual(calls.filter(([name])=>["start","end","cancel"].includes(name)),[]);
 ui.mobileAttackButton.setPointerCapture=capture;
 ui.mobileAttackButton.emit("pointerdown",{pointerId:92});
 ui.mobileAttackButton.emit("pointerup",{pointerId:92});
 assert.deepEqual(calls.filter(([name])=>["start","end","cancel"].includes(name)).map(([name])=>name),["start","end"]);
 ui.dispose();
});

test("WebInput marks touch cancellation without disturbing a separate held attack",()=>{
 const input=new WebInput({});
 input.touchAttack(true);
 input.touchAttackCancel();
 assert.equal(input.getState().attackPressed,false);
 assert.equal(input.getState().pointerReleased,false);
 assert.equal(input.getState().attackHeld,false);
 assert.equal(input.getState().attackCancelled,true);
 input.touchAttack(true);
 assert.equal(input.getState().attackCancelled,false);
 input.touchAttackRelease();
 assert.equal(input.getState().attackHeld,false);
 assert.equal(input.getState().attackCancelled,false);
 assert.equal(input.getState().pointerReleased,true);
 input.dispose();
});
