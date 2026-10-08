import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const states={MENU:"MENU",PLAYING:"PLAYING",PAUSED:"PAUSED",GAME_OVER:"GAME_OVER"};
const compiled=readFileSync(".test-build/ui/GameUI.js","utf8");
const gameStateImport=compiled.split("\n").find(line=>line.startsWith("import ")&&line.includes("GameState"));
assert.ok(gameStateImport,"compiled UI imports GameState");
const runnable=compiled.replace(gameStateImport,"const GameState=states;").replace("export class GameUI","class GameUI");
assert.equal(runnable.includes("export class GameUI"),false);
const {GameUI}=new Function("states",runnable+";return {GameUI};")(states);

const arenas=["classic","towers","pit","steps","zigzag","sky","moving","fortress","bridge","crater","vertical","ruins","conveyor","collapse","storm","reactor"];
const modes=["duel","missile-duel","melee-only","random-weapons","sudden-death","low-gravity","king-of-hill"];
const weapons=["blade","hammer","blaster","uzi","boomerang","bow","bomb","missile"];

class FakeNode{
 constructor(tag="div"){
  this.tag=tag;this.children=[];this.dataset={};this.attributes={};
  this.style={setProperty(){}};
  this.hidden=false;this.disabled=false;this.value="";this.textContent="";this.innerHTML="";
  this.classList={toggle(){},add(){},remove(){}};
 }
 append(...children){this.children.push(...children);}
 setAttribute(key,value){this.attributes[key]=value;}
 getAttribute(key){return this.attributes[key];}
 addEventListener(){}
 focus(){this.focused=true;}
 click(){this.onclick?.();}
 remove(){}
 get options(){return this.children.filter(child=>typeof child==="object"&&child.tag==="option");}
 get firstElementChild(){return this.children.find(child=>typeof child==="object")??null;}
 querySelector(selector){
  const prefix='option[value="';
  if(selector.startsWith(prefix)&&selector.endsWith('"]')){
   const id=selector.slice(prefix.length,-2);
   return this.options.find(option=>option.value===id)??null;
  }
  return null;
 }
}
globalThis.document={createElement:tag=>new FakeNode(tag)};
const messages={
 title:"DOODLEGAME DUEL",rotateHint:"ROTATE",
 language:{label:"Language",english:"English",persian:"فارسی"},
 buttons:{start:"Start",pause:"Pause",resume:"Resume",restart:"Restart",help:"Help",attack:"Attack",previousWeapon:"Prev",nextWeapon:"Next",fireMissile:"Fire"},
 privacy:{button:"Privacy",title:"Privacy",close:"Close",web:"Web",networkNote:"Offline",html:"<p>Privacy</p>"},
 status:{win:"WIN",lose:"LOSE",hill:"HILL"},
 details:{equipped:"EQUIPPED",angle:"ANGLE",power:"POWER"},
 sections:{gameMode:"MODE",arena:"ARENA",weapon:"WEAPON"},
 panels:{weaponUpgrades:"UPGRADES",missileControl:"MISSILE",bowDraw:"BOW",releaseToFire:"RELEASE"},
 upgrade:{points:"POINTS",choose:"Choose",earn:"Earn",upgraded:"UPGRADED",upgrade:"Upgrade",locked:"Locked"},
 helpHtml:"<strong>How to play</strong>",
 arenas:Object.fromEntries(arenas.map(key=>[key,key])),
 modes:Object.fromEntries(modes.map(key=>[key,key])),
 weapons:Object.fromEntries(weapons.map(key=>[key,key])),
 upgrades:Object.fromEntries(weapons.map(key=>[key,{name:key+"+",description:"Improves "+key}]))
};
function setup(hudOverride={}){
 const calls=[];
 const actions={
  start:()=>calls.push(["start"]),pause(){},resume(){},restart(){},
  weaponNext(){},weaponPrevious(){},weaponSelect(){},
  selectStartingWeapon:id=>calls.push(["startingWeapon",id]),
  upgradeWeapon:id=>calls.push(["upgrade",id]),
  arenaSelect:id=>calls.push(["arena",id]),
  modeSelect:id=>calls.push(["mode",id]),
  updateData:async()=>{calls.push(["update"]);},
  setMissileAngle(){},setMissilePower(){},fireWeapon(){},
  setTouchMove(){},touchAttackStart(){},touchAttackEnd(){}
 };
 const listeners=new Set();
 const persianMessages={...messages,title:"دوئل دودل",language:{label:"زبان",english:"English",persian:"فارسی"},buttons:{...messages.buttons,start:"شروع"}};
 const i18n={
  messages,locale:"en",
  setLocale(locale){
   if(locale===this.locale)return;
   this.locale=locale;
   this.messages=locale==="fa"?persianMessages:messages;
   for(const listener of listeners)listener(locale);
  },
  subscribe(listener){listeners.add(listener);return ()=>listeners.delete(listener);}
 };
 const hud={playerHealth:100,playerMaxHealth:100,opponentHealth:100,opponentMaxHealth:100,
  weapon:"blade",winner:null,arena:"classic",mode:"duel",hill:{player:0,opponent:0,target:8},
  bowCharge:0,missileAngle:40,missilePower:12,upgradePoints:0,upgradedWeapons:[],...hudOverride};
 const container=new FakeNode("root");
 const ui=new GameUI(container,actions,i18n);
 ui.bind(()=>()=>{},()=>hud);
 return {ui,calls,hud,container};
}

test("menu uses localized native selectors for all 16 arenas and 7 modes",()=>{
 const {ui,calls}=setup();
 assert.equal(ui.arenaSelect.options.length,16);
 assert.equal(ui.modeSelect.options.length,7);
 assert.equal(ui.startingWeaponSelect.options.length,8);
 assert.equal(ui.arenaSelect.value,"classic");
 assert.equal(ui.modeSelect.value,"duel");
 assert.equal(ui.menuSettings.hidden,false);
 ui.arenaSelect.value="reactor";ui.arenaSelect.onchange();
 ui.modeSelect.value="low-gravity";ui.modeSelect.onchange();
 ui.startingWeaponSelect.value="bow";ui.startingWeaponSelect.onchange();
 assert.deepEqual(calls,[["arena","reactor"],["mode","low-gravity"],["startingWeapon","bow"]]);
 assert.equal(ui.title.textContent,"DOODLEGAME DUEL");
 assert.equal(ui.menu.children.includes(ui.buttons),true,"primary action stays in menu");
 ui.buttons.children.find(button=>button.dataset.action==="start").click();
 assert.deepEqual(calls.at(-1),["start"]);
});

test("clicking the language button immediately switches both directions without a dropdown",()=>{
 const {ui,hud}=setup();
 assert.equal(ui.languageControl.tag,"div");
 assert.equal(ui.languageControl.children.some(child=>child.tag==="select"),false);
 assert.equal(ui.languageButton.tag,"button");
 assert.equal(ui.languageButton.type,"button");
 assert.equal(ui.languageButton.textContent,"EN");
 assert.equal(ui.languageButton.getAttribute("aria-label"),"Language: English");
 ui.languageButton.click();
 assert.equal(ui.i18n.locale,"fa");
 assert.equal(ui.languageButton.textContent,"فا");
 assert.equal(ui.languageButton.getAttribute("aria-label"),"زبان: فارسی");
 assert.equal(ui.languageLabel.textContent,"زبان");
 assert.equal(ui.title.textContent,"دوئل دودل");
 assert.equal(ui.buttons.children.find(button=>button.dataset.action==="start").textContent,"شروع");
 assert.equal(ui.modeSelect.value,hud.mode,"switching language must not reset the selected mode");
 ui.languageButton.click();
 assert.equal(ui.i18n.locale,"en");
 assert.equal(ui.languageButton.textContent,"English");
 assert.equal(ui.languageLabel.textContent,"Language");
 assert.equal(ui.title.textContent,"DOODLEGAME DUEL");
 assert.equal(ui.modeSelect.value,hud.mode);
});

test("compact upgrade selector preserves purchase and availability rules",()=>{
 const {ui,calls,hud}=setup({upgradePoints:1,upgradedWeapons:["blade"]});
 assert.equal(ui.upgradePanel.hidden,false);
 assert.equal(ui.upgradeSelect.options.length,8);
 assert.equal(ui.upgradeSelect.options[0].disabled,true);
 assert.equal(ui.upgradeSelect.value,"hammer");
 assert.equal(ui.upgradeButton.disabled,false);
 ui.upgradeSelect.value="bomb";ui.upgradeSelect.onchange();
 ui.upgradeButton.click();
 assert.deepEqual(calls.at(-1),["upgrade","bomb"]);
 hud.upgradePoints=0;
 ui.render(states.MENU,hud);
 assert.equal(ui.upgradeChoices.hidden,true);
 assert.equal(ui.upgradeSummary.hidden,false);
});

test("menu help and privacy overlays can be closed without hiding primary actions",()=>{
 const {ui}=setup();
 ui.helpButton.click();
 assert.equal(ui.help.hidden,false);
 assert.equal(ui.privacy.hidden,true);
 assert.equal(ui.helpCloseButton.focused,true);
 ui.helpCloseButton.click();
 assert.equal(ui.help.hidden,true);
 assert.equal(ui.helpButton.focused,true);
 ui.privacyButton.click();
 assert.equal(ui.privacy.hidden,false);
 ui.privacyCloseButton.click();
 assert.equal(ui.privacy.hidden,true);
 assert.equal(ui.privacyButton.focused,true);
});

test("game-over menu retains mode/arena selection and win message",()=>{
 const {ui,hud}=setup();
 hud.winner="player";
 ui.render(states.GAME_OVER,hud);
 assert.equal(ui.menuResult.hidden,false);
 assert.equal(ui.menuResult.textContent,"WIN");
 assert.equal(ui.menuSettings.hidden,false);
 ui.render(states.PAUSED,hud);
 assert.equal(ui.menuSettings.hidden,true);
});

test("menu CSS has no scroll container and applies compact safe-area layout",()=>{
 const css=readFileSync("src/styles.css","utf8");
 const menu=css.slice(css.indexOf("/* Issue #37: viewport-fitting menu."));
 assert.ok(menu.includes("overflow:visible"));
 assert.ok(menu.includes("max-height:calc(100dvh - var(--safe-top) - var(--safe-bottom)"));
 assert.ok(menu.includes("grid-template-columns:repeat(2,minmax(0,1fr))"));
 assert.ok(menu.includes("@media (max-height:520px)"));
 assert.ok(menu.includes("@media (max-height:360px)"));
 assert.ok(menu.includes("min-height:44px"));
});

test("starting weapon selector honors missile, melee, and random mode restrictions",()=>{
 const {ui,hud}=setup();
 assert.equal(ui.startingWeaponSelect.disabled,false);
 assert.equal(ui.startingWeaponSelect.options.find(option=>option.value==="missile").disabled,true);
 hud.mode="melee-only";ui.render(states.MENU,hud);
 assert.equal(ui.startingWeaponSelect.options.find(option=>option.value==="blaster").disabled,true);
 assert.equal(ui.startingWeaponSelect.options.find(option=>option.value==="hammer").disabled,false);
 hud.mode="missile-duel";hud.weapon="missile";ui.render(states.MENU,hud);
 assert.equal(ui.startingWeaponSelect.disabled,true);
 assert.equal(ui.startingWeaponSelect.value,"missile");
 hud.mode="random-weapons";hud.weapon="bow";ui.render(states.MENU,hud);
 assert.equal(ui.startingWeaponSelect.disabled,true);
});

test("health display is a single number from 100 to 0 in either locale",()=>{
 const {ui,hud}=setup({playerHealth:45,opponentHealth:100});
 assert.equal(ui.playerHealthCurrent.textContent,"45");
 assert.equal(ui.opponentHealthCurrent.textContent,"100");
 assert.equal(ui.playerHealthLabel.children.length,1);
 assert.equal(ui.opponentHealthLabel.children.length,1);
 hud.playerHealth=0;
 hud.opponentHealth=45;
 ui.render(states.PLAYING,hud);
 assert.equal(ui.playerHealthCurrent.textContent,"0");
 assert.equal(ui.opponentHealthCurrent.textContent,"45");
 ui.i18n.locale="fa";
 ui.render(states.PLAYING,hud);
 assert.equal(ui.opponentHealthCurrent.textContent,"۴۵");
 assert.equal(ui.playerHealthCurrent.textContent,"۰");
});

test("Android update control is a single hidden-by-default action with no extra menu text",async()=>{
 const {ui,calls}=setup();
 assert.equal(ui.updateButton.hidden,true);
 ui.setUpdateVisible(true);
 assert.equal(ui.updateButton.hidden,false);
 assert.equal(ui.updateButton.type,"button");
 assert.equal(ui.updateButton.className,"game-ui__update-button");
 await ui.updateButton.onclick();
 assert.deepEqual(calls.at(-1),["update"]);
 assert.equal(ui.updateButton.disabled,false);
 assert.equal(ui.updateButton.getAttribute("aria-busy"),undefined);
 ui.setUpdateOutcome("success");
 assert.equal(ui.updateButton.dataset.result,"success");
 ui.setUpdateVisible(false);
 assert.equal(ui.updateButton.hidden,true);
});
