import "./styles.css";
import "./platform/web/TelegramLeaderboard.css";
import {Game} from "./core/Game";
import {GameState} from "./core/GameState";
import {GameSession,CHARACTER_IDS} from "./gameplay/GameSession";
import {restoreDownloadedArenas,loadArenaCatalog,installDownloadedArena,removeDownloadedArena} from "./gameplay/DownloadableArenas.js";
import {Progression} from "./progression/Progression";
import {PlayerNames} from "./profile/PlayerNames";
import type {GameRenderState} from "./gameplay/GameSession";
import {CombatAudio} from "./audio/CombatAudio";
import {Capacitor} from "@capacitor/core";
import {downloadLatestGameData,GAME_DATA_STORAGE_KEY,parseLiveGameData} from "./gameplay/LiveGameData";
import {I18n} from "./i18n/I18n";
import {WebFrameScheduler} from "./platform/web/WebFrameScheduler";
import {WebInput} from "./platform/web/WebInput";
import {WebStorage} from "./platform/web/WebStorage";
import {installNativeAppLifecycle} from "./platform/mobile/NativeAppLifecycle";
import {installWebVisibilityLifecycle} from "./platform/web/WebVisibilityLifecycle";
import {installLandscapeOrientation} from "./platform/web/LandscapeOrientation";
import {installTelegramMiniApp,isTelegramMiniAppLaunch} from "./platform/web/TelegramMiniApp";
import {TelegramLeaderboard} from "./platform/web/TelegramLeaderboard";
import {CanvasRenderer} from "./rendering/CanvasRenderer";
import {ThreeRenderer} from "./rendering/ThreeRenderer";
import {createRendererWithFallback} from "./rendering/RendererFactory";
import {GameUI} from "./ui/GameUI";
import {OpeningIntro} from "./ui/OpeningIntro";
import type {ArenaId,GameModeId,CharacterId} from "./gameplay/GameSession";

const bootFallback=document.querySelector<HTMLElement>("#boot-fallback");
const showBootError=(reason:unknown)=>{
 const message=reason instanceof Error?reason.message:String(reason??"Unknown startup error");
 console.error("DoodleGame startup failed:",reason);
 if(!bootFallback)return;
 bootFallback.dataset.state="error";
 bootFallback.textContent="DoodleGame could not start. Restart the app. "+message;
};
const bootWatchdog=window.setTimeout(()=>{
 if(bootFallback?.isConnected)showBootError("Startup timed out.");
},8000);

window.addEventListener("error",event=>{
 console.error(event.error??event.message);
 if(bootFallback?.isConnected)showBootError(event.error??event.message);
});
window.addEventListener("unhandledrejection",event=>{
 console.error(event.reason);
 if(bootFallback?.isConnected)showBootError(event.reason);
});

try{
 const canvas=document.querySelector<HTMLCanvasElement>("#game-canvas");
 const root=document.querySelector<HTMLElement>("#ui-root");
 if(!canvas||!root)throw new Error("DoodleGame root elements are missing.");
 root.classList.add("game-ui-intro-pending");

 const input=new WebInput(canvas);
 const storage=new WebStorage();
 const i18n=new I18n(storage);
 const progression=new Progression(storage);
 const playerNames=new PlayerNames(storage);
 const reducedMotion=typeof window.matchMedia==="function"&&window.matchMedia("(prefers-reduced-motion: reduce)").matches;
 const readSetting=(key:string,defaultValue:boolean)=>{
  try{const value=storage.get<unknown>(key);return typeof value==="boolean"?value:defaultValue;}catch{return defaultValue;}
 };
 const saveSetting=(key:string,value:boolean)=>{try{storage.set(key,value);}catch(error){console.warn("Could not save combat setting.",error);}};
 let soundEnabled=readSetting("doodlegame.combatSound",true);
 let shakeEnabled=!reducedMotion&&readSetting("doodlegame.cameraShake",true);
 const combatAudio=new CombatAudio();
 if(!soundEnabled)combatAudio.setMuted(true);
 combatAudio.setAmbientActive(true);
 const renderer=createRendererWithFallback(
  ()=>new ThreeRenderer(canvas,!reducedMotion),
  ()=>new CanvasRenderer(canvas,!reducedMotion),
  error=>console.warn("WebGL renderer unavailable; using canvas fallback.",error)
 );

 restoreDownloadedArenas(storage);
 const session=new GameSession(input);
 try{const saved=storage.get<unknown>("doodlegame.selectedCharacter");if(CHARACTER_IDS.includes(saved as CharacterId))session.setCharacterId(saved as CharacterId);else if(saved==="shadow")session.setCharacterId("ninja");}catch{ /* Storage can be unavailable in private browsing. */ }
 let appliedGameData:(ReturnType<typeof parseLiveGameData>)=null;
 try{appliedGameData=parseLiveGameData(storage.get<unknown>(GAME_DATA_STORAGE_KEY));}
 catch(error){console.warn("Invalid cached game data; using bundled defaults.",error);}
 if(appliedGameData)session.setLiveGameData(appliedGameData);
 session.setShakeEnabled(shakeEnabled);
 const presentationRenderer={
  resize:()=>renderer.resize(),
  render:(state:GameRenderState)=>{renderer.render(state);combatAudio.render(state.combatCues);},
  dispose:()=>{combatAudio.dispose();renderer.dispose();}
 };
 const game=new Game(presentationRenderer,session,new WebFrameScheduler(),error=>console.error("DoodleGame error:",error),progression);
 let landscape:ReturnType<typeof installLandscapeOrientation>|null=null;
 let telegram:ReturnType<typeof installTelegramMiniApp>|null=null;
 const rankings=new TelegramLeaderboard(root,()=>telegram?.retryInitialization());
 let pausedForPortrait=false;
 const pauseGame=()=>{input.resetTransientState();game.pause();};
 const resumeGame=()=>{if(landscape?.isPortrait())return;input.resetTransientState();game.resume();};
 const stopToMenu=()=>{pausedForPortrait=false;input.resetTransientState();game.stop();};
 const startGame=()=>{
  if(landscape?.isPortrait())return;
  telegram?.requestFullscreen();
  landscape?.requestLandscape();
  input.resetTransientState();
  game.start();
 };
 const restartGame=()=>{if(landscape?.isPortrait())return;input.resetTransientState();game.restart();};
 const disposeWebVisibility=installWebVisibilityLifecycle(document,()=>{
  if(game.getState()===GameState.PLAYING)pauseGame();
 });

 landscape=installLandscapeOrientation(i18n,{
  onPortrait:()=>{
   if(game.getState()===GameState.PLAYING){pausedForPortrait=true;pauseGame();}
  },
  onLandscape:()=>{
   if(pausedForPortrait){
    pausedForPortrait=false;
    if(game.getState()===GameState.PAUSED&&document.visibilityState==="visible")resumeGame();
   }
   game.resize();
  }
 });

 const readHud=()=>({...game.getHudState(),playerName:playerNames.get(1),secondPlayerName:playerNames.get(2)});
 const ui=new GameUI(root,{
  start:startGame,
  quickPlay:()=>{if(landscape?.isPortrait())return;telegram?.requestFullscreen();landscape?.requestLandscape();input.resetTransientState();game.quickPlay();},
  pause:pauseGame,
  resume:resumeGame,
  restart:restartGame,
  stopToMenu,
  newRun:()=>{if(!landscape?.isPortrait()){input.resetTransientState();game.newRun();}},
  continueRun:()=>{if(!landscape?.isPortrait()){input.resetTransientState();game.continueRun();}},
  leaveRun:()=>{input.resetTransientState();game.leaveRun();},
  weaponNext:()=>game.selectWeapon(1),
  weaponPrevious:()=>game.selectWeapon(-1),
  weaponSelect:(id)=>game.selectWeaponById(id),
  selectStartingWeapon:(id)=>game.selectStartingWeapon(id),
  characterSelect:(id:CharacterId)=>{game.selectCharacter(id);try{storage.set("doodlegame.selectedCharacter",id);}catch(error){console.warn("Could not save selected character.",error);}},
  upgradeWeapon:(id)=>game.upgradeWeapon(id),
  arenaSelect:(id:ArenaId)=>game.selectArena(id),
  fetchArenaCatalog:()=>loadArenaCatalog(),
  installArena:async listing=>{
   await installDownloadedArena(listing,storage);
   game.resize();
  },
  deleteArena:id=>{
   if(game.getHudState().arena===id)game.selectArena("classic");
   removeDownloadedArena(id,storage);
   game.resize();
  },
  modeSelect:(id:GameModeId)=>game.selectMode(id),
  playerCountSelect:count=>game.selectPlayerCount(count),
  player2WeaponSelect:id=>game.selectPlayer2WeaponById(id),
  setWeaponAim:(player,x,y)=>game.setWeaponAim(player,x,y),
  setCharacterName:(player,name)=>{playerNames.set(player,name);ui.render(game.getState(),readHud());},
  setTouchMove:(x,y)=>input.setTouchMove(x,y),
  touchGrab:()=>input.triggerTouchGrab(),
  touchAttackStart:()=>input.touchAttack(true),
  touchAttackEnd:()=>input.touchAttackRelease(),
  touchAttackCancel:()=>{input.touchAttackCancel();game.cancelTouchAttack();},
  setPlayer2TouchMove:(x,y)=>input.setPlayer2TouchMove(x,y),
  player2Grab:()=>input.triggerTouchGrab(2),
  player2AttackStart:()=>input.player2TouchAttackStart(),
  player2AttackEnd:()=>input.player2TouchAttackRelease(),
  player2AttackCancel:()=>input.player2TouchAttackCancel(),
  player2WeaponPrevious:()=>game.selectPlayer2Weapon(-1),
  player2WeaponNext:()=>game.selectPlayer2Weapon(1),
  updateData:async()=>{
   // Update only compatible content; APK/bundled application code stays untouched.
   const latest=await downloadLatestGameData();
   if(appliedGameData&&latest.dataVersion<appliedGameData.dataVersion)throw new Error("GitHub game data is older than the installed copy");
   storage.set(GAME_DATA_STORAGE_KEY,latest);
   appliedGameData=latest;
   session.setLiveGameData(latest);
   ui.setUpdateOutcome("success");
  },
  toggleCombatSound:()=>{
   soundEnabled=!soundEnabled;combatAudio.setMuted(!soundEnabled);
   saveSetting("doodlegame.combatSound",soundEnabled);
   ui.setCombatPreferences(soundEnabled,shakeEnabled);
  },
  toggleCameraShake:()=>{
   if(reducedMotion)return;
   shakeEnabled=!shakeEnabled;session.setShakeEnabled(shakeEnabled);
   saveSetting("doodlegame.cameraShake",shakeEnabled);
   ui.setCombatPreferences(soundEnabled,shakeEnabled);
  }
 },i18n,storage);

 ui.setCombatPreferences(soundEnabled,shakeEnabled);
 ui.setUpdateVisible(Capacitor.getPlatform()==="android");
 ui.bind(listener=>game.subscribe(listener),readHud);
 input.start();
 game.initialize();
 // Rankings are exclusive to the Telegram Mini App, not the ordinary website
 // or the offline Android APK. Signed initData is still verified by the Worker.
 if(Capacitor.getPlatform()==="web"){
  if(isTelegramMiniAppLaunch(window))rankings.showEntryPoint();
  telegram=installTelegramMiniApp(window,document,{
   getState:()=>game.getState(),
   onBack:()=>{
    const current=game.getState();
    if(current===GameState.PLAYING)pauseGame();
    else if(current===GameState.PAUSED||current===GameState.GAME_OVER)stopToMenu();
   },
   onResize:()=>game.resize(),
   onReady:app=>{if(isTelegramMiniAppLaunch(window))rankings.connect(app);},
   onFailure:()=>{if(isTelegramMiniAppLaunch(window))rankings.reportSdkFailure();}
  });
 }
 const unsubscribeTelegram=game.subscribe(()=>telegram?.onGameState?.());
 const unsubscribeRankings=game.subscribe(state=>rankings.onGameState(state,game.getHudState()));
 telegram?.onGameState?.();
 const intro=new OpeningIntro(root,i18n.locale);
 // Hide the living background during gameplay; restore it without replaying
 // the long introduction if the player returns to the main menu.
 let hasPlayed=false;
 const unsubscribeIntro=game.subscribe(state=>{
  combatAudio.setAmbientActive(state===GameState.MENU);
  if(state===GameState.PLAYING){
   hasPlayed=true;
   intro.dispose();
  }else if(state===GameState.MENU&&hasPlayed){
   intro.restoreAmbient();
  }
 });

 window.addEventListener("keydown",event=>{
  if(event.repeat)return;
  const state=game.getState();
  if(event.code==="Enter"&&state===GameState.MENU){
   // Native Enter should activate the focused choice, not bypass setup.
   const target=event.target as HTMLElement|null;
   if(target?.closest("button,a,input,select,summary,[role='button']"))return;
   event.preventDefault();
   if(!ui.canStartMatch()){
    // The menu has separate mode/name and arena steps. Keyboard and Android
    // Enter must advance through setup rather than silently doing nothing.
    ui.advanceMenuStep();
    return;
   }
   startGame();
   return;
  }
  if(event.code!=="Escape")return;
  if(state===GameState.PLAYING){
   event.preventDefault();
   pauseGame();
  }else if(state===GameState.PAUSED){
   event.preventDefault();
   resumeGame();
  }
 });

 let disposeNativeLifecycle=()=>{};
 void installNativeAppLifecycle({
  getState:()=>game.getState(),
  pause:pauseGame,
  stopToMenu,
  resize:()=>game.resize()
 }).then(dispose=>{
  disposeNativeLifecycle=dispose;
 }).catch(error=>console.error("Could not initialize native app lifecycle.",error));

 window.clearTimeout(bootWatchdog);
 bootFallback?.remove();
 try{intro.start();}catch(error){
  console.warn("Opening animation could not start; showing the menu.",error);
  intro.dispose();
 }
 const resize=()=>game.resize();
 window.addEventListener("resize",resize);
 window.addEventListener("beforeunload",()=>{
  unsubscribeTelegram();
  unsubscribeRankings();
  rankings.dispose();
  telegram?.dispose();
  unsubscribeIntro();
  disposeWebVisibility();
  landscape?.dispose();
  intro.dispose();
  disposeNativeLifecycle();
  input.dispose();
  game.dispose();
  ui.dispose();
 });
}catch(error){
 window.clearTimeout(bootWatchdog);
 showBootError(error);
}
