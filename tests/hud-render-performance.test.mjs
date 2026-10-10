import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {getArenaTheme} from "../.test-build/themes/ArenaThemes.js";

const states={MENU:"MENU",PLAYING:"PLAYING",PAUSED:"PAUSED",GAME_OVER:"GAME_OVER"};
const compiled=readFileSync(".test-build/ui/GameUI.js","utf8");
const gameStateImport=compiled.split("\n").find(line=>line.startsWith("import ")&&line.includes("GameState"));
const themeImport=compiled.split("\n").find(line=>line.startsWith("import ")&&line.includes("ArenaThemes"));
assert.ok(gameStateImport&&themeImport);
const runnable=compiled.replace(gameStateImport,"const GameState=states;").replace(themeImport,"").replace("export class GameUI","class GameUI");
const {GameUI}=new Function("states","getArenaTheme",runnable+";return {GameUI};")(states,getArenaTheme);

const counters={writes:0,optionReads:0};
class SpyNode{
 constructor(tag="div"){
  this.tag=tag;this.children=[];this.dataset={};this.attributes={};
  this.style={setProperty(){counters.writes++;}};
  this.classList={toggle(){counters.writes++;},add(){counters.writes++;},remove(){counters.writes++;}};
  this._text="";this._value="";this._hidden=false;this._disabled=false;
 }
 set textContent(value){counters.writes++;this._text=value;}
 get textContent(){return this._text;}
 set value(value){counters.writes++;this._value=value;}
 get value(){return this._value;}
 set hidden(value){counters.writes++;this._hidden=value;}
 get hidden(){return this._hidden;}
 set disabled(value){counters.writes++;this._disabled=value;}
 get disabled(){return this._disabled;}
 set innerHTML(value){counters.writes++;this._html=value;if(value==="<span></span>")this.children.push(new SpyNode("span"));}
 get innerHTML(){return this._html??"";}
 append(...children){this.children.push(...children);}
 setAttribute(name,value){counters.writes++;this.attributes[name]=value;}
 getAttribute(name){return this.attributes[name];}
 removeAttribute(name){counters.writes++;delete this.attributes[name];}
 addEventListener(){}
 focus(){}
 remove(){}
 get options(){counters.optionReads++;return this.children.filter(child=>child.tag==="option");}
 get firstElementChild(){return this.children.find(child=>typeof child==="object")??null;}
}
globalThis.document={
 createElement:tag=>new SpyNode(tag),
 createElementNS:(_namespace,tag)=>new SpyNode(tag),
 addEventListener(){},removeEventListener(){},visibilityState:"visible"
};
globalThis.window={addEventListener(){},removeEventListener(){},requestAnimationFrame(){return 1;},cancelAnimationFrame(){}};

const arenas=["classic","towers","pit","steps","zigzag","sky","moving","fortress","bridge","crater","vertical","ruins","conveyor","collapse","storm","reactor"];
const modes=["duel","missile-duel","melee-only","random-weapons","sudden-death","low-gravity","king-of-hill"];
const weapons=["blade","hammer","blaster","uzi","boomerang","bow","bomb","missile"];
function getMessages(fa=false){
 return {
  title:fa?"بازی":"GAME",rotateHint:"ROTATE",
  language:{label:"Language",english:"English",persian:"فارسی"},
  buttons:{start:"Start",pause:"Pause",resume:"Resume",restart:"Restart",help:"Help",
   attack:"Attack",previousWeapon:"Previous",nextWeapon:"Next",fireMissile:"Fire",update:"Update"},
  privacy:{button:"Privacy",title:"Privacy",close:"Close",web:"Web",networkNote:"Offline",html:""},
  status:{win:"WIN",lose:"LOSE",hill:"HILL"},
  details:{equipped:fa?"سلاح":"EQUIPPED",angle:"Angle",power:"Power"},
  sections:{gameMode:"MODE",arena:"ARENA",weapon:"WEAPON"},
  panels:{weaponUpgrades:"UPGRADES",missileControl:"MISSILE",bowDraw:"BOW",releaseToFire:"RELEASE"},
  upgrade:{points:"POINTS",choose:"Choose",earn:"Earn",upgraded:"Upgraded",upgrade:"Upgrade",locked:"Locked"},
  helpHtml:"",
  arenas:Object.fromEntries(arenas.map(id=>[id,id])),
  modes:Object.fromEntries(modes.map(id=>[id,id])),
  weapons:Object.fromEntries(weapons.map(id=>[id,fa?"فا-"+id:id])),
  upgrades:Object.fromEntries(weapons.map(id=>[id,{name:id+"+",description:"Upgrade "+id}]))
 };
}
function setup(){
 const listeners=[];
 const i18n={
  locale:"en",messages:getMessages(),
  subscribe(fn){listeners.push(fn);return ()=>{};},
  setLocale(locale){this.locale=locale;this.messages=getMessages(locale==="fa");listeners.forEach(fn=>fn());}
 };
 const actions=Object.fromEntries(["start","pause","resume","restart","weaponNext","weaponPrevious",
  "weaponSelect","selectStartingWeapon","upgradeWeapon","arenaSelect","modeSelect",
  "setMissileAngle","setMissilePower","fireWeapon","setTouchMove",
  "touchAttackStart","touchAttackEnd","touchAttackCancel","toggleCombatSound","toggleCameraShake"
 ].map(name=>[name,()=>{}]));
 actions.updateData=async()=>{};
 const hud={playerHealth:100,playerMaxHealth:100,opponentHealth:100,opponentMaxHealth:100,
  weapon:"blade",winner:null,arena:"classic",mode:"duel",hill:{player:0,opponent:0,target:8},
  bowCharge:0,missileAngle:45,missilePower:13,upgradePoints:0,upgradedWeapons:[]};
 const ui=new GameUI(new SpyNode("root"),actions,i18n);
 ui.bind(()=>()=>{},()=>hud);
 ui.render(states.PLAYING,hud);
 counters.writes=0;counters.optionReads=0;
 return {ui,hud,i18n};
}

test("steady 120-frame HUD loop produces zero DOM writes or option-list scans",()=>{
 const {ui,hud}=setup();
 const originalFormatter=ui.hpFormatter;
 for(let i=0;i<120;i++){
  ui.render(states.PLAYING,{...hud,hill:{...hud.hill},upgradedWeapons:[...hud.upgradedWeapons]});
 }
 assert.equal(counters.writes,0,"unchanged playing HUD must not mutate DOM");
 assert.equal(counters.optionReads,0,"menu option lists must stay off the hot path");
 assert.equal(ui.hpFormatter,originalFormatter,"number formatter must be reused");
 ui.dispose();
});

test("health/aim/bow changes update only dynamic HUD, never menu option lists",()=>{
 const {ui,hud}=setup();
 hud.playerHealth=63;
 ui.render(states.PLAYING,hud);
 assert.equal(ui.playerHealthCurrent.textContent,"63");
 assert.ok(counters.writes>0);
 assert.equal(counters.optionReads,0);
 counters.writes=0;
 ui.render(states.PLAYING,hud);
 assert.equal(counters.writes,0);
 hud.missileAngle=64;hud.missilePower=16;
 ui.render(states.PLAYING,hud);
 assert.equal(ui.angleInput.value,"64");
 assert.equal(ui.powerInput.value,"16");
 assert.equal(counters.optionReads,0);
 hud.bowCharge=.5;
 ui.render(states.PLAYING,hud);
 assert.equal(ui.bowMeter.firstElementChild.getAttribute("style"),"width:50%");
 counters.writes=0;
 hud.bowCharge=.501;
 ui.render(states.PLAYING,hud);
 assert.equal(counters.writes,0,"sub-percent bow charge changes should not rewrite the meter");
 ui.dispose();
});

test("menu state, locale, upgrades and game-over updates retain their behavior",()=>{
 const {ui,hud,i18n}=setup();
 hud.mode="melee-only";hud.weapon="hammer";hud.arena="towers";
 ui.render(states.MENU,hud);
 assert.equal(ui.arenaSelect.value,"towers");
 assert.equal(ui.modeSelect.value,"melee-only");
 assert.equal(ui.startingWeaponSelect.value,"hammer");
 assert.equal(ui.startingWeaponSelect.options.find(option=>option.value==="bow").disabled,true);
 hud.upgradePoints=1;
 hud.upgradedWeapons=["blade"];
 ui.render(states.MENU,hud);
 assert.equal(ui.upgradeSelect.value,"hammer");
 assert.equal(ui.upgradePanel.hidden,false);
 assert.equal(ui.upgradeSelect.options.find(option=>option.value==="blade").disabled,true);
 const oldFormatter=ui.hpFormatter;
 i18n.setLocale("fa");
 assert.notEqual(ui.hpFormatter,oldFormatter);
 assert.equal(ui.playerHealthCurrent.textContent,"۱۰۰");
 assert.match(ui.mobileWeaponName.textContent,/فا-/);
 hud.winner="player";
 ui.render(states.GAME_OVER,hud);
 assert.equal(ui.menuResult.hidden,false);
 assert.equal(ui.menuResult.textContent,"WIN");
 assert.equal(ui.menuSettings.hidden,false);
 ui.render(states.PAUSED,hud);
 assert.equal(ui.menuSettings.hidden,true);
 ui.dispose();
});

test("king-of-hill score updates without scanning menu settings",()=>{
 const {ui,hud}=setup();
 hud.mode="king-of-hill";
 ui.render(states.PLAYING,hud);
 counters.optionReads=0;
 hud.hill.player=2.4;
 ui.render(states.PLAYING,hud);
 assert.match(ui.status.textContent,/2\.4/);
 assert.equal(counters.optionReads,0);
 counters.writes=0;
 ui.render(states.PLAYING,hud);
 assert.equal(counters.writes,0);
 ui.dispose();
});
