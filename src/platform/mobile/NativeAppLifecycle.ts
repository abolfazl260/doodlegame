import {App} from "@capacitor/app";
import {Capacitor,SystemBars} from "@capacitor/core";
import {GameState} from "../../core/GameState";

type NativeLifecycleActions={
 getState:()=>GameState;
 pause:()=>void;
 stopToMenu:()=>void;
 resize:()=>void;
};

export async function installNativeAppLifecycle(actions:NativeLifecycleActions):Promise<()=>void>{
 if(!Capacitor.isNativePlatform())return()=>{};

 const handles=[];

 const restoreImmersiveMode=async()=>{
  try{
   await SystemBars.hide();
  }catch(error){
   console.warn("Could not hide native system bars.",error);
  }
 };

 await restoreImmersiveMode();

 handles.push(await App.addListener("appStateChange",({isActive})=>{
  if(!isActive){
   if(actions.getState()===GameState.PLAYING)actions.pause();
   return;
  }
  void restoreImmersiveMode();
  actions.resize();
 }));

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
  for(const handle of handles)void handle.remove();
 };
}
