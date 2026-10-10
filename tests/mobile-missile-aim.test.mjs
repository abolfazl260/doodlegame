import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {getArenaTheme} from "../.test-build/themes/ArenaThemes.js";
import {WebInput} from "../.test-build/platform/web/WebInput.js";
import {GameSession} from "../.test-build/gameplay/GameSession.js";

const states={MENU:"MENU",PLAYING:"PLAYING",PAUSED:"PAUSED",GAME_OVER:"GAME_OVER"};
const compiled=readFileSync(".test-build/ui/GameUI.js","utf8");
const gameStateImport=compiled.split("\n").find(line=>line.startsWith("import ")&&line.includes("GameState"));
assert.ok(gameStateImport);
const themeImport=compiled.split("\n").find(line=>line.startsWith("import ")&&line.includes("ArenaThemes"));
assert.ok(themeImport,"compiled UI imports arena themes");
const runnable=compiled.replace(gameStateImport,"const GameState=states;").replace(themeImport,"").replace("export class GameUI","class GameUI");
const {GameUI}=new Function("states","getArenaTheme",runnable+";return {GameUI};")(states,getArenaTheme);

class Node{
 constructor(tag="div"){
  this.tag=tag;this.children=[];this.dataset={};this.attributes={};
  this.hidden=false;this.disabled=false;this.value="";this.textContent="";this.innerHTML="";
  this.style={setProperty(){}};
  this.classList={add(){},remove(){},toggle(){}};
  this.listeners=new Map();this.capture=new Set();
 }
 append(...nodes){this.children.push(...nodes);}
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
const weapons=["blade","hammer","blaster","uzi","boomerang","bow","bomb","missile"];
const messages={
 title:"DoodleGame",rotateHint:"Rotate",language:{label:"Language",english:"English",persian:"Farsi"},
 buttons:{start:"Start",pause:"Pause",resume:"Resume",restart:"Restart",help:"Help",attack:"Attack",previousWeapon:"Prev",nextWeapon:"Next",fireMissile:"Fire"},
 privacy:{button:"Privacy",title:"Privacy",close:"Close",web:"Web",networkNote:"Offline",html:""},
 status:{win:"Win",lose:"Lose",hill:"Hill"},details:{equipped:"Equipped",angle:"Angle",power:"Power"},
 sections:{gameMode:"Mode",arena:"Arena",weapon:"Weapon"},
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
  touchAttackCancel(){calls.push(["cancel"]);}
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

test("missile drag updates aim and fires once on pointerup",()=>{
 const {ui,calls}=setup();
 ui.mobileAttackButton.emit("pointerdown",{pointerId:7});
 assert.equal(ui.mobileAttackButton.hasPointerCapture(7),true);
 assert.equal(ui.missileAimGuide.hidden,false);
 ui.mobileAttackButton.emit("pointermove",{pointerId:7,clientX:440,clientY:140});
 assert.ok(calls.some(([name])=>name==="angle"));
 assert.ok(calls.some(([name])=>name==="power"));
 assert.ok(ui.missileAimPath.getAttribute("d").startsWith("M"));
 ui.mobileAttackButton.emit("pointerup",{pointerId:7,clientX:440,clientY:140});
 assert.equal(calls.filter(([name])=>name==="fire").length,1);
 assert.equal(calls.some(([name])=>name==="start"),false);
 assert.equal(ui.missileAimGuide.hidden,true);
 ui.mobileAttackButton.emit("lostpointercapture",{pointerId:7});
 assert.equal(calls.filter(([name])=>name==="fire").length,1);
 ui.dispose();
});

test("short missile tap retains aim; other pointer cannot fire; cancellation never fires",()=>{
 const {ui,calls,hud}=setup();
 ui.mobileAttackButton.emit("pointerdown",{pointerId:5});
 ui.mobileAttackButton.emit("pointerdown",{pointerId:6});
 ui.mobileAttackButton.emit("pointermove",{pointerId:5,clientX:498,clientY:198});
 ui.mobileAttackButton.emit("pointerup",{pointerId:6});
 assert.equal(calls.some(([name])=>name==="fire"),false);
 ui.mobileAttackButton.emit("pointercancel",{pointerId:5});
 ui.mobileAttackButton.emit("pointerup",{pointerId:5});
 assert.equal(calls.some(([name])=>name==="fire"),false);
 assert.equal(hud.missileAngle,45);
 assert.equal(hud.missilePower,13);
 ui.mobileAttackButton.emit("pointerdown",{pointerId:8});
 ui.mobileAttackButton.emit("pointerup",{pointerId:8});
 assert.equal(calls.filter(([name])=>name==="fire").length,1);
 ui.dispose();
});

test("pausing, blur and capture loss cancel missile aim safely",()=>{
 const {ui,calls,hud}=setup();
 ui.mobileAttackButton.emit("pointerdown",{pointerId:9});
 globalListeners.get("blur")();
 ui.mobileAttackButton.emit("pointerup",{pointerId:9});
 assert.equal(calls.some(([name])=>name==="fire"),false);
 ui.mobileAttackButton.emit("pointerdown",{pointerId:11});
 ui.mobileAttackButton.emit("lostpointercapture",{pointerId:11});
 ui.mobileAttackButton.emit("pointerup",{pointerId:11});
 assert.equal(calls.some(([name])=>name==="fire"),false);
 ui.mobileAttackButton.emit("pointerdown",{pointerId:12});
 ui.render(states.PAUSED,hud);
 ui.mobileAttackButton.emit("pointerup",{pointerId:12});
 assert.equal(calls.some(([name])=>name==="fire"),false);
 ui.dispose();
});

test("joystick can move simultaneously with missile gesture; other weapons preserve hold/release",()=>{
 const {ui,calls,hud}=setup();
 ui.joystick.emit("pointerdown",{pointerId:1,clientX:85,clientY:45});
 ui.mobileAttackButton.emit("pointerdown",{pointerId:2});
 ui.mobileAttackButton.emit("pointermove",{pointerId:2,clientX:425,clientY:135});
 ui.mobileAttackButton.emit("pointerup",{pointerId:2});
 assert.ok(calls.some(([name,x])=>name==="move"&&x>0));
 assert.equal(calls.filter(([name])=>name==="fire").length,1);
 ui.joystick.emit("pointerup",{pointerId:1});
 hud.weapon="bow";
 ui.render(states.PLAYING,hud);
 ui.mobileAttackButton.emit("pointerdown",{pointerId:3});
 ui.mobileAttackButton.emit("pointerup",{pointerId:3});
 assert.deepEqual(calls.slice(-2).map(([name])=>name),["start","end"]);
 ui.mobileAttackButton.emit("pointerdown",{pointerId:4});
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

test("touch layout removes missile sliders but preserves desktop range controls",()=>{
 const css=readFileSync("src/styles.css","utf8");
 assert.match(css,/@media \(pointer:coarse\)\{\s*\.game-ui\.playing \.game-ui__missile-panel\{display:none!important\}/);
 assert.match(css,/\.game-ui\.playing \.game-ui__missile-aim-guide:not\(\[hidden\]\)/);
 assert.match(css,/var\(--safe-right\)/);
 assert.match(css,/var\(--safe-bottom\)/);
 assert.match(readFileSync("src/ui/GameUI.ts","utf8"),/angleInput\.type="range"/);
});

function previewXs(d){
 return [...d.matchAll(/[ML]([0-9.]+) ([0-9.]+)/g)].map(m=>Number(m[1]));
}

test("HUD facing agrees with actual missile launch direction and preview SVG",()=>{
 const input=new WebInput({});
 const session=new GameSession(input);
 try{
  session.setMode("missile-duel");
  for(const facing of [1,-1]){
   session.reset(false);
   session.player.facing=facing;
   const hud=session.getHudState();
   assert.equal(hud.playerFacing,facing);
   session.fireWeapon();
   const projectile=session.getRenderState().projectiles.at(-1);
   assert.equal(Math.sign(projectile.vx),facing);
   const {ui,hud:fake}=setup();
   fake.playerFacing=hud.playerFacing;
   ui.mobileAttackButton.emit("pointerdown",{pointerId:71});
   const xs=previewXs(ui.missileAimPath.getAttribute("d"));
   assert.ok(xs.length>2);
   assert.equal(Math.sign(xs.at(-1)-xs[0]),facing);
   ui.mobileAttackButton.emit("pointercancel",{pointerId:71});
   ui.dispose();
  }
 }finally{session.dispose();}
});

test("missile guide updates when joystick changes facing during a held aim",()=>{
 const {ui,hud}=setup();
 ui.mobileAttackButton.emit("pointerdown",{pointerId:81});
 const right=ui.missileAimPath.getAttribute("d");
 assert.equal(Math.sign(previewXs(right).at(-1)-previewXs(right)[0]),1);
 hud.playerFacing=-1;
 ui.render(states.PLAYING,hud);
 const left=ui.missileAimPath.getAttribute("d");
 assert.notEqual(left,right);
 assert.equal(Math.sign(previewXs(left).at(-1)-previewXs(left)[0]),-1);
 hud.playerFacing=1;
 ui.render(states.PLAYING,hud);
 assert.equal(ui.missileAimPath.getAttribute("d"),right);
 ui.mobileAttackButton.emit("pointerup",{pointerId:81});
 ui.dispose();
});

test("mobile pause button has an accessible name, pauses once, and is not active while paused",()=>{
 const {ui,hud,calls}=setup("blade");
 assert.equal(ui.mobilePauseButton.type,"button");
 assert.equal(ui.mobilePauseButton.textContent,"Ⅱ");
 assert.equal(ui.mobilePauseButton.getAttribute("aria-label"),"Pause");
 assert.ok(ui.mobileControls.children.includes(ui.mobilePauseButton));
 ui.mobilePauseButton.click();
 assert.deepEqual(calls.filter(([name])=>name==="pause"),[["pause"]]);
 ui.render(states.PAUSED,hud);
 assert.equal(ui.mobileControls.hidden,true);
 ui.mobilePauseButton.click();
 assert.equal(calls.filter(([name])=>name==="pause").length,1);
 ui.dispose();
});


test("ATTACK owns only the first active pointer for automatic, Bow and tap weapons",()=>{
 for(const weapon of ["uzi","bow","blade"]){
  const {ui,calls}=setup(weapon);
  ui.mobileAttackButton.emit("pointerdown",{pointerId:21});
  ui.mobileAttackButton.emit("pointerdown",{pointerId:22});
  ui.mobileAttackButton.emit("pointerup",{pointerId:22});
  ui.mobileAttackButton.emit("pointercancel",{pointerId:22});
  ui.mobileAttackButton.emit("lostpointercapture",{pointerId:22});
  assert.equal(ui.mobileAttackButton.hasPointerCapture(21),true,weapon+" owner remains captured");
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

test("owner cancellation and capture loss cannot fire phantom attacks or leave a held pointer",()=>{
 for(const kind of ["pointercancel","lostpointercapture"]){
  const {ui,calls}=setup("bow");
  ui.mobileAttackButton.emit("pointerdown",{pointerId:51});
  ui.mobileAttackButton.emit("pointerdown",{pointerId:52});
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

test("weapon switching cancels an owned held attack without cancelling joystick movement",()=>{
 const {ui,hud,calls}=setup("uzi");
 ui.joystick.emit("pointerdown",{pointerId:11,clientX:82,clientY:48});
 ui.mobileAttackButton.emit("pointerdown",{pointerId:12});
 assert.equal(ui.mobileAttackButton.hasPointerCapture(12),true);
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
