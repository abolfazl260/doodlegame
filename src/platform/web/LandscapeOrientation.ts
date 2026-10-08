import {Capacitor} from "@capacitor/core";
import type {I18n} from "../../i18n/I18n";

type LandscapeCallbacks={
 onPortrait:()=>void;
 onLandscape:()=>void;
};

export function installLandscapeOrientation(i18n:I18n,callbacks:LandscapeCallbacks){
 const portrait=window.matchMedia("(orientation: portrait)");
 const app=document.querySelector<HTMLElement>("#app");
 const title=document.querySelector<HTMLElement>("#orientation-guard-title");
 const message=document.querySelector<HTMLElement>("#orientation-guard-message");
 const button=document.querySelector<HTMLButtonElement>("#orientation-guard-button");

 const updateText=()=>{
  const persian=i18n.locale==="fa";
  if(title)title.textContent=persian?"حالت افقی الزامی است":"LANDSCAPE ONLY";
  if(message)message.textContent=i18n.messages.rotateHint;
  if(button){
   button.textContent=persian?"تلاش برای چرخش خودکار":"TRY AUTO-ROTATE";
   button.hidden=Capacitor.isNativePlatform()||typeof screen.orientation?.lock!=="function";
  }
 };
 const unsubscribeLocale=i18n.subscribe(updateText);
 updateText();

 const requestLandscape=async(allowFullscreen=false):Promise<void>=>{
  if(Capacitor.isNativePlatform()||typeof screen.orientation?.lock!=="function")return;
  try{
   await screen.orientation.lock("landscape");
   return;
  }catch{
   // Browsers commonly require fullscreen and a user gesture for orientation locking.
  }
  if(!allowFullscreen||document.fullscreenElement||!document.documentElement.requestFullscreen)return;
  try{
   await document.documentElement.requestFullscreen();
   await screen.orientation.lock("landscape");
  }catch{
   // On unsupported browsers the portrait blocker stays visible until rotated manually.
  }
 };

 const handleChange=()=>{
  app?.toggleAttribute("inert",portrait.matches);
  if(portrait.matches)callbacks.onPortrait();
  else callbacks.onLandscape();
 };
 const onLockClick=()=>{void requestLandscape(true);};
 button?.addEventListener("click",onLockClick);
 portrait.addEventListener("change",handleChange);
 window.addEventListener("resize",handleChange);
 handleChange();
 void requestLandscape();

 return {
  isPortrait:()=>portrait.matches,
  requestLandscape:()=>{void requestLandscape();},
  dispose:()=>{
   unsubscribeLocale();
   button?.removeEventListener("click",onLockClick);
   portrait.removeEventListener("change",handleChange);
   window.removeEventListener("resize",handleChange);
  }
 };
}
