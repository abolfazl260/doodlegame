import {App} from "@capacitor/app";
import {Capacitor,SystemBars} from "@capacitor/core";
import type {PluginListenerHandle} from "@capacitor/core";
import {GameState} from "../../core/GameState";
import {pausePlayingMatch} from "./NativePausePolicy";

type NativeLifecycleActions={
 getState:()=>GameState;
 pause:()=>void;
 stopToMenu:()=>void;
 resize:()=>void;
};

export async function installNativeAppLifecycle(actions:NativeLifecycleActions):Promise<()=>void>{
 if(!Capacitor.isNativePlatform())return()=>{};

 const handles:PluginListenerHandle[]=[];

 const restoreImmersiveMode=async()=>{
  try{
   await SystemBars.hide();
  }catch(error){
   console.warn("Could not hide native system bars.",error);
  }
 };

 // Install listeners before the asynchronous fullscreen request. Native WebView
 // JavaScript may be suspended during backgrounding, so an inactive event can
 // be missed; the active event is a second chance to stop an ongoing match.
 const pausePlaying=()=>{pausePlayingMatch(actions);};
 handles.push(await App.addListener("appStateChange",({isActive})=>{
  pausePlaying();
  if(isActive){
   void restoreImmersiveMode();
   actions.resize();
  }
 }));

 // Some Android WebViews dispatch visibilitychange only after foregrounding.
 // This complementary fallback preserves the same paused-on-return behavior.
 const onVisibilityChange=()=>{
  if(document.visibilityState==="visible")pausePlaying();
 };
 document.addEventListener("visibilitychange",onVisibilityChange);
 void restoreImmersiveMode();

 handles.push(await App.addListener("backButton",()=>{
  const state=actions.getState();
  if(state===GameState.PLAYING){
   actions.pause();
   return;
  }
  if(state===GameState.PAUSED||state===GameState.GAME_OVER){
   actions.stopToMenu();
   return;
  }
  void App.exitApp();
 }));

 return()=>{
  document.removeEventListener("visibilitychange",onVisibilityChange);
  for(const handle of handles)void handle.remove();
 };
}
