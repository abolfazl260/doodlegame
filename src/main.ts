import "./styles.css";
import {Game} from "./core/Game";
import {GameState} from "./core/GameState";
import {GameSession} from "./gameplay/GameSession";
import {I18n} from "./i18n/I18n";
import {WebFrameScheduler} from "./platform/web/WebFrameScheduler";
import {WebInput} from "./platform/web/WebInput";
import {WebStorage} from "./platform/web/WebStorage";
import {installNativeAppLifecycle} from "./platform/mobile/NativeAppLifecycle";
import {installWebVisibilityLifecycle} from "./platform/web/WebVisibilityLifecycle";
import {CanvasRenderer} from "./rendering/CanvasRenderer";
import {ThreeRenderer} from "./rendering/ThreeRenderer";
import {createRendererWithFallback} from "./rendering/RendererFactory";
import {GameUI} from "./ui/GameUI";
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

 const input=new WebInput(canvas);
 const storage=new WebStorage();
 const i18n=new I18n(storage);
 const renderer=createRendererWithFallback(
  ()=>new ThreeRenderer(canvas),
  ()=>new CanvasRenderer(canvas),
  error=>console.warn("WebGL renderer unavailable; using canvas fallback.",error)
 );

 const game=new Game(renderer,new GameSession(input),new WebFrameScheduler(),error=>console.error("DoodleGame error:",error));
 const pauseGame=()=>{input.resetTransientState();game.pause();};
 const resumeGame=()=>{input.resetTransientState();game.resume();};
 const stopToMenu=()=>{input.resetTransientState();game.stop();};
 const disposeWebVisibility=installWebVisibilityLifecycle(document,()=>{
  if(game.getState()===GameState.PLAYING)pauseGame();
 });

 const ui=new GameUI(root,{
  start:()=>game.start(),
  pause:pauseGame,
  resume:resumeGame,
  restart:()=>game.restart(),
  weaponNext:()=>game.selectWeapon(1),
  weaponPrevious:()=>game.selectWeapon(-1),
  weaponSelect:(id)=>game.selectWeaponById(id),
  upgradeWeapon:(id)=>game.upgradeWeapon(id),
  arenaSelect:(id:ArenaId)=>game.selectArena(id),
  modeSelect:(id:GameModeId)=>game.selectMode(id),
  setMissileAngle:(angle)=>game.setMissileAngle(angle),
  setMissilePower:(power)=>game.setMissilePower(power),
  fireWeapon:()=>game.fireWeapon(),
  setTouchMove:(x,y)=>input.setTouchMove(x,y),
  touchAttackStart:()=>input.touchAttack(true),
  touchAttackEnd:()=>input.touchAttackRelease()
 },i18n);

 ui.bind(listener=>game.subscribe(listener),()=>game.getHudState());
 input.start();
 game.initialize();

 window.addEventListener("keydown",event=>{
  if(event.repeat)return;
  const state=game.getState();
  if(event.code==="Enter"&&state===GameState.MENU){
   event.preventDefault();
   game.start();
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
 const resize=()=>game.resize();
 window.addEventListener("resize",resize);
 window.addEventListener("beforeunload",()=>{
  disposeWebVisibility();
  disposeNativeLifecycle();
  input.dispose();
  game.dispose();
  ui.dispose();
 });
}catch(error){
 window.clearTimeout(bootWatchdog);
 showBootError(error);
}
