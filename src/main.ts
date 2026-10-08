import "./styles.css";
import {Game} from "./core/Game";
import {GameState} from "./core/GameState";
import {GameSession} from "./gameplay/GameSession";
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
import {CanvasRenderer} from "./rendering/CanvasRenderer";
import {ThreeRenderer} from "./rendering/ThreeRenderer";
import {createRendererWithFallback} from "./rendering/RendererFactory";
import {GameUI} from "./ui/GameUI";
import {OpeningIntro} from "./ui/OpeningIntro";
import type {ArenaId,GameModeId} from "./gameplay/GameSession";

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
 const reducedMotion=typeof window.matchMedia==="function"&&window.matchMedia("(prefers-reduced-motion: reduce)").matches;
 const readSetting=(key:string,defaultValue:boolean)=>{
  try{const value=storage.get<unknown>(key);return typeof value==="boolean"?value:defaultValue;}catch{return defaultValue;}
 };
 const saveSetting=(key:string,value:boolean)=>{try{storage.set(key,value);}catch(error){console.warn("Could not save combat setting.",error);}};
 let soundEnabled=readSetting("doodlegame.combatSound",true);
 let shakeEnabled=!reducedMotion&&readSetting("doodlegame.cameraShake",true);
 const combatAudio=new CombatAudio();
 if(!soundEnabled)combatAudio.setMuted(true);
 const renderer=createRendererWithFallback(
  ()=>new ThreeRenderer(canvas),
  ()=>new CanvasRenderer(canvas),
  error=>console.warn("WebGL renderer unavailable; using canvas fallback.",error)
 );

 const session=new GameSession(input);
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
 const game=new Game(presentationRenderer,session,new WebFrameScheduler(),error=>console.error("DoodleGame error:",error));
 let landscape:ReturnType<typeof installLandscapeOrientation>|null=null;
 let pausedForPortrait=false;
 const pauseGame=()=>{input.resetTransientState();game.pause();};
 const resumeGame=()=>{if(landscape?.isPortrait())return;input.resetTransientState();game.resume();};
 const stopToMenu=()=>{pausedForPortrait=false;input.resetTransientState();game.stop();};
 const startGame=()=>{
  if(landscape?.isPortrait())return;
  landscape?.requestLandscape();
  game.start();
 };
 const restartGame=()=>{if(!landscape?.isPortrait())game.restart();};
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

 const ui=new GameUI(root,{
  start:startGame,
  pause:pauseGame,
  resume:resumeGame,
  restart:restartGame,
  weaponNext:()=>game.selectWeapon(1),
  weaponPrevious:()=>game.selectWeapon(-1),
  weaponSelect:(id)=>game.selectWeaponById(id),
  selectStartingWeapon:(id)=>game.selectStartingWeapon(id),
  upgradeWeapon:(id)=>game.upgradeWeapon(id),
  arenaSelect:(id:ArenaId)=>game.selectArena(id),
  modeSelect:(id:GameModeId)=>game.selectMode(id),
  setMissileAngle:(angle)=>game.setMissileAngle(angle),
  setMissilePower:(power)=>game.setMissilePower(power),
  fireWeapon:()=>game.fireWeapon(),
  setTouchMove:(x,y)=>input.setTouchMove(x,y),
  touchAttackStart:()=>input.touchAttack(true),
  touchAttackEnd:()=>input.touchAttackRelease(),
  touchAttackCancel:()=>{input.touchAttackCancel();game.cancelTouchAttack();},
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
 },i18n);

 ui.setCombatPreferences(soundEnabled,shakeEnabled);
 ui.setUpdateVisible(Capacitor.getPlatform()==="android");
 ui.bind(listener=>game.subscribe(listener),()=>game.getHudState());
 input.start();
 game.initialize();
 const intro=new OpeningIntro(root,i18n.locale);
 // Hide the living background during gameplay; restore it without replaying
 // the long introduction if the player returns to the main menu.
 let hasPlayed=false;
 const unsubscribeIntro=game.subscribe(state=>{
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
   event.preventDefault();
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
