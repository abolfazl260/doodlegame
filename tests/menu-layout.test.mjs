import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {getArenaTheme} from "../.test-build/themes/ArenaThemes.js";
import {getDownloadedArena,installedArenas,arenaImageDataUrl} from "../.test-build/gameplay/DownloadableArenas.js";
import {ARENA_CATEGORY_IDS,arenaCategories,arenaPreviewUrl} from "../.test-build/ui/ArenaPreviews.js";
import {MobileOnboarding} from "../.test-build/ui/MobileOnboarding.js";
const states={MENU:"MENU",PLAYING:"PLAYING",PAUSED:"PAUSED",GAME_OVER:"GAME_OVER"};
const compiled=readFileSync(".test-build/ui/GameUI.js","utf8");
const gameStateImport=compiled.split("\n").find(line=>line.startsWith("import ")&&line.includes("GameState"));
assert.ok(gameStateImport,"compiled UI imports GameState");
const themeImport=compiled.split("\n").find(line=>line.startsWith("import ")&&line.includes("ArenaThemes"));
assert.ok(themeImport,"compiled UI imports arena themes");
const extraImport=compiled.split("\n").find(line=>line.startsWith("import ")&&line.includes("DownloadableArenas"));
assert.ok(extraImport,"compiled UI imports downloaded arenas");
const runnable=compiled.replace(/^import .*ArenaPreviews.*$/m,"").replace(/^import .*MobileOnboarding.*$/m,"").replace(gameStateImport,"const GameState=states;").replace(themeImport,"").replace(extraImport,"").replace("export class GameUI","class GameUI");
assert.equal(runnable.includes("export class GameUI"),false);
const {GameUI}=new Function("states","getArenaTheme","getDownloadedArena","installedArenas","arenaImageDataUrl","MobileOnboarding","ARENA_CATEGORY_IDS","arenaCategories","arenaPreviewUrl",runnable+";return {GameUI};")(states,getArenaTheme,getDownloadedArena,installedArenas,arenaImageDataUrl,MobileOnboarding,ARENA_CATEGORY_IDS,arenaCategories,arenaPreviewUrl);

const arenas=["classic","towers","pit","steps","zigzag","sky","moving","fortress","bridge","crater","vertical","ruins","conveyor","collapse","storm","reactor"];
const modes=["duel","missile-duel","melee-only","random-weapons","sudden-death","low-gravity","king-of-hill","local-pvp"];
const weapons=["blade","hammer","blaster","uzi","boomerang","bow","bomb","missile","spear"];

class FakeNode{
 constructor(tag="div"){
  this.tag=tag;this.children=[];this.dataset={};this.attributes={};
  this.style={setProperty(){}};
  this.hidden=false;this.disabled=false;this.value="";this.textContent="";this.innerHTML="";
  this.classList={toggle(){},add(){},remove(){}};
 }
 append(...children){this.children.push(...children);}
 replaceChildren(...children){this.children=[...children];}
 setAttribute(key,value){this.attributes[key]=value;}
 getAttribute(key){return this.attributes[key];}
 removeAttribute(key){delete this.attributes[key];}
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
 menu:{onlineMode:"ONLINE",comingSoon:"COMING SOON",modeDescriptions:Object.fromEntries(modes.map(key=>[key,key]))},
 characterNames:{playerOne:"PLAYER 1",playerTwo:"PLAYER 2",leftPlayer:"LEFT CHARACTER · P1",rightPlayer:"RIGHT CHARACTER · P2",opponent:"OPPONENT",optional:"Optional name",wins:"WINS"},
 pvp:{p1:"P1",p2:"P2",hint:"Shared-screen controls",winner1:"P1 wins",winner2:"P2 wins",draw:"Draw"},
 panels:{weaponUpgrades:"UPGRADES",missileControl:"MISSILE",bowDraw:"BOW",releaseToFire:"RELEASE"},
 upgrade:{points:"POINTS",choose:"Choose",earn:"Earn",upgraded:"UPGRADED",upgrade:"Upgrade",locked:"Locked"},
 run:{title:"FOUR-FIGHT RUN",newRun:"NEW",continueRun:"CONTINUE",next:"NEXT",retry:"RETRY",leave:"LEAVE",wave:"WAVE",boss:"BOSS",ready:"READY",victory:"VICTORY",defeat:"DEFEAT",complete:"COMPLETE",choose:"CHOOSE",career:"WINS",points:"POINTS",medals:{rookie:"ROOKIE",veteran:"VETERAN",champion:"CHAMPION"},requirements:{rookie:"1",veteran:"3",champion:"4"}},
 helpHtml:"<strong>How to play</strong>",
 arenas:Object.fromEntries(arenas.map(key=>[key,key])),
 modes:Object.fromEntries(modes.map(key=>[key,key])),
 weapons:Object.fromEntries(weapons.map(key=>[key,key])),
 upgrades:Object.fromEntries(weapons.map(key=>[key,{name:key+"+",description:"Improves "+key}]))
};
function setup(hudOverride={}){
 const calls=[];
 const actions={
  start:()=>calls.push(["start"]),pause(){},resume(){},restart(){},stopToMenu(){},
  weaponNext(){},weaponPrevious(){},weaponSelect(){},
  selectStartingWeapon:id=>calls.push(["startingWeapon",id]),
  upgradeWeapon:id=>calls.push(["upgrade",id]),
  arenaSelect:id=>calls.push(["arena",id]),
  modeSelect:id=>calls.push(["mode",id]),
  updateData:async()=>{calls.push(["update"]);},
  setMissileAngle(){},setMissilePower(){},fireWeapon(){},
  setCharacterName:(player,name)=>{calls.push(["name",player,name]);hud[player===1?"playerName":"secondPlayerName"]=name;},
  setTouchMove(){},touchAttackStart(){},touchAttackEnd(){}
 };
 const listeners=new Set();
 const persianMessages={...messages,title:"دوئل دودل",language:{label:"زبان",english:"English",persian:"فارسی"},buttons:{...messages.buttons,start:"شروع"},menu:{...messages.menu,onlineMode:"بازی آنلاین",comingSoon:"به‌زودی"}};
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

test("wizard selects player count and mode cards before arena and optional weapon cards",()=>{
 const {ui,calls,hud}=setup();
 assert.equal(ui.menuSettings.children.length,8);
 assert.equal(ui.arenaCards.children.length,16);
 assert.equal(ui.weaponCards.children.length,9);
 assert.equal(ui.quickDuelButton.getAttribute("aria-pressed"),"true");
 assert.equal(ui.menuModePanel.hidden,false);
 assert.equal(ui.menuArenaPanel.hidden,true);
 assert.equal(ui.stepNextButton.hidden,false);
 assert.equal(ui.buttons.children.find(b=>b.dataset.action==="start").hidden,true);
 ui.menuSettings.children.find(b=>b.dataset.mode==="low-gravity").click();
 assert.deepEqual(calls.at(-1),["mode","low-gravity"]);
 hud.mode="low-gravity";ui.render(states.MENU,hud);
 assert.equal(ui.menuSettings.children.find(b=>b.dataset.mode==="low-gravity").getAttribute("aria-pressed"),"true");
 ui.stepNextButton.click();
 assert.equal(ui.menuModePanel.hidden,true);
 assert.equal(ui.menuArenaPanel.hidden,false);
 assert.equal(ui.stepBackButton.hidden,false);
 assert.equal(ui.buttons.children.find(b=>b.dataset.action==="start").hidden,false);
 ui.arenaCards.children.find(b=>b.dataset.arena==="reactor").click();
 hud.arena="reactor";ui.render(states.MENU,hud);
 assert.deepEqual(calls.at(-1),["arena","reactor"]);
 assert.equal(ui.arenaCards.children.find(b=>b.dataset.arena==="reactor").getAttribute("aria-pressed"),"true");
 ui.weaponCards.children.find(b=>b.dataset.startingWeapon==="bow").click();
 hud.weapon="bow";ui.render(states.MENU,hud);
 assert.deepEqual(calls.at(-1),["startingWeapon","bow"]);
 assert.equal(ui.weaponCards.children.find(b=>b.dataset.startingWeapon==="bow").getAttribute("aria-pressed"),"true");
 assert.equal(ui.menu.children.at(-1),ui.buttons,"sticky navigation is the final row");
 ui.buttons.children.find(b=>b.dataset.action==="start").click();
 assert.deepEqual(calls.at(-1),["start"]);
 ui.stepBackButton.click();
 assert.equal(ui.menuModePanel.hidden,false);
 assert.equal(ui.stepNextButton.hidden,false);
 assert.equal(hud.mode,"low-gravity","navigation preserves the selected mode");
});

test("Online Multiplayer is a localized, non-interactive mode placeholder",()=>{
 const {ui,calls,hud}=setup();
 const online=ui.menuSettings.children.find(button=>button.dataset.mode==="online");
 assert.equal(online,ui.onlineModeButton);
 assert.equal(online.disabled,true);
 assert.equal(online.getAttribute("aria-disabled"),"true");
 assert.equal(online.onclick,undefined,"Online must not be connected to modeSelect");
 assert.equal(online.children[0].textContent,"ONLINE");
 assert.equal(online.children[1].textContent,"COMING SOON");
 const before=calls.length;
 online.click();
 assert.equal(calls.length,before);
 assert.equal(ui.menuStepIndex,0);
 assert.equal(hud.mode,"duel");
 ui.i18n.setLocale("fa");
 assert.equal(online.children[0].textContent,"بازی آنلاین");
 assert.equal(online.children[1].textContent,"به‌زودی");
 assert.equal(online.disabled,true);
 assert.equal(online.getAttribute("aria-disabled"),"true");
 online.click();
 assert.equal(calls.length,before);
 assert.equal(ui.menuStepIndex,0);
 ui.menuSettings.children.find(button=>button.dataset.mode==="low-gravity").click();
 assert.deepEqual(calls.at(-1),["mode","low-gravity"],"offline modes remain selectable");
});

test("native Enter navigation advances the wizard once and only starts from the arena step",()=>{
 const {ui,hud}=setup();
 assert.equal(ui.canStartMatch(),false);
 assert.equal(ui.menuModePanel.hidden,false);
 ui.advanceMenuStep();
 assert.equal(ui.canStartMatch(),true);
 assert.equal(ui.menuArenaPanel.hidden,false);
 assert.equal(ui.menuModePanel.hidden,true);
 ui.advanceMenuStep();
 assert.equal(ui.canStartMatch(),true,"advancing at the final step does not wrap");
 ui.render(states.PLAYING,hud);
 assert.equal(ui.canStartMatch(),false);
 ui.advanceMenuStep();
 assert.equal(ui.menuArenaPanel.hidden,true);
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
 assert.equal(ui.menuSettings.children.find(b=>b.dataset.mode===hud.mode).getAttribute("aria-pressed"),"true","language keeps selected mode");
 ui.languageButton.click();
 assert.equal(ui.i18n.locale,"en");
 assert.equal(ui.languageButton.textContent,"EN");
 assert.equal(ui.languageLabel.textContent,"Language");
 assert.equal(ui.title.textContent,"DOODLEGAME DUEL");
 assert.equal(ui.menuSettings.children.find(b=>b.dataset.mode===hud.mode).getAttribute("aria-pressed"),"true");
});

test("compact upgrade selector preserves purchase and availability rules",()=>{
 const {ui,calls,hud}=setup({upgradePoints:1,upgradedWeapons:["blade"]});
 assert.equal(ui.upgradePanel.hidden,false);
 assert.equal(ui.upgradeCardGrid.children.length,9);
 assert.equal(ui.upgradeCardGrid.children[0].disabled,true);
 assert.equal(ui.upgradeCardGrid.children.find(b=>b.dataset.upgradeWeapon==="hammer").getAttribute("aria-pressed"),"true");
 assert.equal(ui.upgradeButton.disabled,false);
 ui.upgradeCardGrid.children.find(b=>b.dataset.upgradeWeapon==="bomb").click();
 ui.upgradeButton.click();
 assert.deepEqual(calls.at(-1),["upgrade","bomb"]);
 hud.upgradePoints=0;
 ui.render(states.MENU,hud);
 assert.equal(ui.upgradeChoices.hidden,true);
 assert.equal(ui.upgradeCardGrid.children.find(b=>b.dataset.upgradeWeapon==="blade").hidden,true);
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

test("game over is a result screen with only replay/menu actions, not another setup wizard",()=>{
 const {ui,hud}=setup();
 hud.winner="player";
 ui.render(states.GAME_OVER,hud);
 assert.equal(ui.menuResult.hidden,false);
 assert.equal(ui.menuResult.textContent,"WIN");
 assert.equal(ui.menuSetupSection.hidden,true);
 assert.equal(ui.menuSettings.hidden,true);
 assert.equal(ui.stepNextButton.hidden,true);
 assert.equal(ui.stepBackButton.hidden,true);
 assert.equal(ui.menuProgressDetails.hidden,true);
 assert.equal(ui.menuExtras.hidden,true);
 assert.equal(ui.buttons.children.find(b=>b.dataset.action==="restart").hidden,false);
 assert.equal(ui.buttons.children.find(b=>b.dataset.action==="menu").hidden,false);
 ui.render(states.PAUSED,hud);
 assert.equal(ui.menuSettings.hidden,true);
});

test("menu provides a safe-area-aware scroll region and sticky primary action",()=>{
 const css=readFileSync("src/styles.css","utf8");
 const menu=css.slice(css.indexOf("/* Issue #37: viewport-fitting menu."));
 assert.ok(menu.includes("max-height:calc(100dvh - var(--safe-top) - var(--safe-bottom)"));
 assert.match(menu,/\.game-ui:not\(\.playing\) \.game-ui__menu\s*\{[^}]*overflow-y:auto/s);
 assert.match(menu,/\.game-ui:not\(\.playing\) \.game-ui__controls\s*\{[^}]*position:sticky/s);
 assert.match(css,/body\{touch-action:pan-y\}/);
 assert.ok(menu.includes("grid-template-columns:repeat(2,minmax(0,1fr))"));
 assert.ok(menu.includes("@media (max-height:520px)"));
 assert.ok(menu.includes("@media (max-height:360px)"));
 assert.ok(menu.includes("min-height:44px"));
});

test("missile fights retain controls and health but have no extra weapon details",()=>{
 const {ui,hud}=setup({mode:"missile-duel",weapon:"missile"});ui.render(states.PLAYING,hud);
 assert.equal(ui.details,undefined);assert.equal(ui.missileAimGuide,undefined);
 assert.equal(ui.topHud.children.length,3);assert.ok(ui.root.children.includes(ui.mobileControls));
 assert.equal(ui.aimPads[0].hidden,true);assert.equal(readFileSync("src/styles.css","utf8").includes("game-ui__details"),false);
});

test("optional starting weapon cards honor missile, melee and random restrictions",()=>{
 const {ui,hud}=setup();
 assert.equal(ui.weaponDetails.hidden,false);
 assert.equal(ui.weaponCards.children.find(b=>b.dataset.startingWeapon==="missile").hidden,false);
 hud.mode="melee-only";ui.render(states.MENU,hud);
 assert.equal(ui.weaponCards.children.find(b=>b.dataset.startingWeapon==="blaster").hidden,true);
 assert.equal(ui.weaponCards.children.find(b=>b.dataset.startingWeapon==="hammer").disabled,false);
 hud.mode="missile-duel";hud.weapon="missile";ui.render(states.MENU,hud);
 assert.equal(ui.weaponDetails.hidden,true);
 hud.mode="random-weapons";hud.weapon="bow";ui.render(states.MENU,hud);
 assert.equal(ui.weaponDetails.hidden,true);
});

test("health display is a single number from 100 to 0 in either locale",()=>{
 const {ui,hud}=setup({playerHealth:45,opponentHealth:100});
 assert.equal(ui.playerHealthCurrent.textContent,"45");
 assert.equal(ui.opponentHealthCurrent.textContent,"100");
 assert.equal(ui.playerHealthLabel.children.length,2);
 assert.equal(ui.opponentHealthLabel.children.length,2);
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


test("player-count and mode cards are separate, with all modes available for 2P",()=>{
 const {ui,calls,hud}=setup();
 assert.equal(ui.menu.children.at(-1),ui.buttons);
 assert.ok(ui.menuModePanel.children.includes(ui.quickModes));
 assert.ok(ui.menuModePanel.children.includes(ui.menuSettings));
 assert.equal(ui.quickModes.children.length,2);
 assert.equal(ui.quickDuelButton.getAttribute("aria-pressed"),"true");
 assert.equal(ui.quickPvpButton.getAttribute("aria-pressed"),"false");
 assert.equal(ui.menuExtras.tag,"details");
 assert.equal(ui.menuExtras.children[0].tag,"summary");
 assert.equal(ui.menuExtras.open,undefined);
 ui.quickPvpButton.click();
 hud.mode="local-pvp";ui.render(states.MENU,hud);
 assert.deepEqual(calls.at(-1),["mode","local-pvp"]);
 assert.equal(ui.quickPvpButton.getAttribute("aria-pressed"),"true");
 assert.equal(ui.quickDuelButton.getAttribute("aria-pressed"),"false");
 assert.equal(ui.menuSettings.children.filter(c=>!c.hidden).length,8);
 assert.equal(ui.menuSettings.children.some(c=>c.dataset.mode==="local-pvp"),false);
 assert.equal(ui.pvpHint.hidden,false);
 ui.quickDuelButton.click();
 assert.deepEqual(calls.at(-1),["mode","duel"]);
 hud.mode="duel";hud.arena="ruins";hud.weapon="bow";ui.render(states.MENU,hud);
 assert.equal(ui.menuSettings.children.filter(c=>!c.hidden).length,8);
 assert.equal(ui.quickDuelButton.getAttribute("aria-pressed"),"true");
 ui.stepNextButton.click();
 assert.match(ui.matchSummary.textContent,/ruins/);
 assert.match(ui.matchSummary.textContent,/bow/);
 assert.equal(ui.pvpHint.hidden,true);
});

test("pause offers Resume, results hide setup, returning to menu restores step one",()=>{
 const {ui,hud}=setup();
 ui.stepNextButton.click();
 ui.render(states.PLAYING,hud);
 ui.render(states.PAUSED,hud);
 assert.equal(ui.menuSetupSection.hidden,true);
 assert.equal(ui.buttons.children.find(button=>button.dataset.action==="resume").hidden,false);
 ui.render(states.GAME_OVER,{...hud,winner:"player"});
 assert.equal(ui.menuSetupSection.hidden,true);
 assert.equal(ui.stepNextButton.hidden,true);
 ui.render(states.MENU,{...hud,winner:null});
 assert.equal(ui.menuSetupSection.hidden,false);
 assert.equal(ui.menuModePanel.hidden,false);
 assert.equal(ui.menuArenaPanel.hidden,true);
 assert.equal(ui.stepNextButton.hidden,false);
});

test("new menu has localized live match summary and responsive touch-safe primary CTA",()=>{
 const css=readFileSync("src/styles.css","utf8");
 assert.match(css,/\.game-ui__quick-modes\s*\{/);
 assert.match(css,/\.game-ui__quick-mode\[aria-pressed="true"\]/);
 assert.match(css,/\.game-ui__menu-extras\[open\]/);
 assert.match(css,/\.game-ui:not\(\.playing\) \.game-ui__controls button\[data-action="start"\]/);
 assert.match(css,/@media \(max-width:520px\)/);
 assert.match(css,/@media \(max-height:360px\)/);
 const {ui}=setup();
 assert.equal(ui.matchSummary.getAttribute("aria-live"),"polite");
 assert.equal(ui.matchSummary.getAttribute("aria-atomic"),"true");
});

test("wizard cannot start early, supports keyboard focus and contains zero native selects",()=>{
 const {ui}=setup();
 assert.equal(ui.canStartMatch(),false);
 const scan=node=>[node,...node.children.flatMap(child=>typeof child==="object"?scan(child):[])];
 assert.equal(scan(ui.menu).filter(node=>node.tag==="select").length,0);
 assert.equal(ui.menuProgress.getAttribute("aria-live"),"polite");
 assert.equal(ui.menuSettings.getAttribute("role"),"group");
 assert.equal(ui.quickModes.getAttribute("role"),"group");
 ui.stepNextButton.click();
 assert.equal(ui.canStartMatch(),true);
 assert.equal(ui.menuStepIndex,1);
 ui.stepBackButton.click();
 assert.equal(ui.canStartMatch(),false);
 assert.equal(ui.menuStepIndex,0);
});

test("menu wizard CTA always has a translated label and each step hides the other",()=>{
 const {ui}=setup();
 const next=ui.stepNextButton,back=ui.stepBackButton;
 assert.equal(next.textContent,"NEXT · CHOOSE ARENA");
 assert.equal(back.textContent,"BACK");
 assert.equal(ui.menuProgressDetails.tag,"details");
 assert.ok(ui.menuProgressDetails.children.includes(ui.upgradePanel));
 assert.ok(ui.menuProgressDetails.children.includes(ui.runPanel));
 assert.equal(ui.menuModePanel.hidden,false);
 assert.equal(ui.menuArenaPanel.hidden,true);
 ui.stepNextButton.click();
 assert.equal(ui.menuModePanel.hidden,true);
 assert.equal(ui.menuArenaPanel.hidden,false);
 assert.equal(ui.menuProgressDetails.hidden,true);
 assert.equal(ui.menuExtras.hidden,true);
 assert.equal(ui.stepNextButton.hidden,true);
 assert.equal(ui.stepBackButton.hidden,false);
 assert.ok(next.textContent.length>0);
 ui.stepBackButton.click();
 assert.equal(ui.menuModePanel.hidden,false);
 assert.equal(ui.menuArenaPanel.hidden,true);
 assert.equal(ui.menuExtras.hidden,false);
 ui.languageButton.click();
 assert.ok(next.textContent.length>0);
 assert.ok(back.textContent.length>0);
});

test("the progress drawer switches between Run and upgrades instead of stacking both panels",()=>{
 const progression={run:null,totalWins:0,medals:[],completedRuns:0,choices:[]};
 const {ui,hud}=setup({progression,upgradePoints:1});
 assert.equal(ui.menuProgressDetails.hidden,false);
 assert.equal(ui.menuProgressTabs.hidden,false);
 assert.equal(ui.menuUpgradeTab.getAttribute("aria-pressed"),"true",
  "an earned upgrade is prioritized after returning to the menu");
 assert.equal(ui.runPanel.hidden,true);
 assert.equal(ui.upgradePanel.hidden,false);
 ui.menuRunTab.click();
 assert.equal(ui.menuRunTab.getAttribute("aria-pressed"),"true");
 assert.equal(ui.runPanel.hidden,false);
 assert.equal(ui.upgradePanel.hidden,true);
 ui.menuUpgradeTab.click();
 assert.equal(ui.menuUpgradeTab.getAttribute("aria-pressed"),"true");
 assert.equal(ui.upgradePanel.hidden,false);
 assert.equal(ui.runPanel.hidden,true);
 hud.inRun=true;hud.progression.run={status:"victory",points:1,stage:1,upgradedWeapons:[]};
 ui.render(states.GAME_OVER,{...hud,winner:"player"});
 assert.equal(ui.menuSetupSection.hidden,true);
 assert.equal(ui.menuProgressDetails.hidden,false);
 assert.equal(ui.menuProgressDetails.open,true);
 assert.equal(ui.menuProgressTabs.hidden,true,"reward and Run continuation stay together");
 assert.equal(ui.runPanel.hidden,false);
 assert.equal(ui.upgradePanel.hidden,false);
 assert.equal(ui.stepNextButton.hidden,true);
 assert.equal(ui.buttons.children.find(b=>b.dataset.action==="restart").hidden,true);
});


test("all sixteen maps remain selectable through a visible main-menu shortcut",()=>{
 const {ui,calls,hud}=setup();
 const expected=["classic","towers","pit","steps","zigzag","sky","moving","fortress","bridge",
  "crater","vertical","ruins","conveyor","collapse","storm","reactor"];
 assert.deepEqual(ui.arenaCards.children.map(card=>card.dataset.arena),expected);
 assert.equal(ui.arenaShortcut.hidden,false);
 assert.match(ui.arenaShortcut.textContent,/classic/i);
 ui.arenaShortcut.click();
 assert.equal(ui.menuStepIndex,1);
 assert.equal(ui.menuArenaPanel.hidden,false);
 assert.equal(ui.arenaCards.children.length,16);
 for(const id of expected){
  const card=ui.arenaCards.children.find(c=>c.dataset.arena===id);
  assert.ok(card,`arena ${id} must remain available`);
  card.click();
  assert.deepEqual(calls.at(-1),["arena",id]);
  hud.arena=id;ui.render(states.MENU,hud);
  assert.equal(card.getAttribute("aria-pressed"),"true");
  assert.match(ui.arenaSelectionSummary.textContent,new RegExp(id,"i"));
 }
 ui.stepBackButton.click();
 assert.equal(ui.menuStepIndex,0);
 assert.match(ui.arenaShortcut.textContent,/reactor/i);
 ui.arenaShortcut.click();
 assert.equal(ui.menuStepIndex,1);
 assert.equal(ui.arenaCards.children.find(c=>c.dataset.arena==="reactor").getAttribute("aria-pressed"),"true");
 ui.quickPvpButton.click();
 hud.mode="local-pvp";ui.render(states.MENU,hud);
 assert.equal(ui.arenaCards.children.length,16,"2P must retain all arena choices");
});

test("character names are editable in player setup and shown in the HUD",()=>{
 const {ui,calls,hud}=setup({playerName:"",secondPlayerName:""});
 assert.equal(ui.menuModePanel.children.includes(ui.characterNames),true);
 assert.equal(ui.menuArenaPanel.children.includes(ui.characterNames),false);
 assert.equal(ui.characterNames.children.length,2);
 assert.equal(ui.secondNameLabel.hidden,true);
 ui.playerNameInput.value="آرمان";ui.playerNameInput.oninput();
 assert.deepEqual(calls.at(-1),["name",1,"آرمان"]);
 ui.render(states.MENU,hud);
 assert.ok(ui.matchSummary.textContent.includes("آرمان"));
 hud.mode="local-pvp";ui.render(states.MENU,hud);
 assert.equal(ui.secondNameLabel.hidden,false);
 assert.equal(ui.playerNameCaption.textContent,"LEFT CHARACTER · P1");
 assert.equal(ui.secondNameCaption.textContent,"RIGHT CHARACTER · P2");
 assert.match(ui.stepNextButton.textContent,/16|۱۶/);
 ui.secondNameInput.value="سارا";ui.secondNameInput.oninput();
 ui.render(states.PLAYING,hud);
 assert.equal(ui.playerHealthName.textContent,"آرمان");
 assert.equal(ui.opponentHealthName.textContent,"سارا");
 assert.deepEqual(calls.at(-1),["name",2,"سارا"]);
});

test("name-input grid preserves P1 left and P2 right even under Persian RTL",()=>{
 const css=readFileSync("src/styles.css","utf8");
 assert.match(css,/\.game-ui__character-names\{[^}]*direction:ltr\}/);
 assert.match(css,/html\[dir="rtl"\] \.game-ui__character-name-field\{direction:rtl\}/);
 const {ui,hud}=setup({mode:"local-pvp",playerName:"Left",secondPlayerName:"Right"});
 assert.equal(ui.characterNames.children[0],ui.playerNameLabel);
 assert.equal(ui.characterNames.children[1],ui.secondNameLabel);
 assert.equal(ui.playerNameCaption.textContent,"LEFT CHARACTER · P1");
 assert.equal(ui.secondNameCaption.textContent,"RIGHT CHARACTER · P2");
 assert.equal(ui.playerNameInput.value,"Left");
 assert.equal(ui.secondNameInput.value,"Right");
 hud.mode="duel";ui.render(states.MENU,hud);
 assert.equal(ui.playerNameCaption.textContent,"PLAYER 1");
 assert.equal(ui.secondNameLabel.hidden,true);
});
