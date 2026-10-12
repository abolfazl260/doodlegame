import {GameState} from "../../core/GameState";

/**
 * Telegram Mini App bridge. Never trust initDataUnsafe or send Telegram identity
 * to the static game: accounts and verified scores would require a backend.
 * The official SDK is fetched only when Telegram launch parameters are present.
 */
export interface TelegramWebApp{
 ready?:()=>void;
 expand?:()=>void;
 requestFullscreen?:()=>void;
 disableVerticalSwipes?:()=>void;
 setHeaderColor?:(color:string)=>void;
 setBackgroundColor?:(color:string)=>void;
 setBottomBarColor?:(color:string)=>void;
 isVersionAtLeast?:(version:string)=>boolean;
 onEvent?:(event:string,handler:()=>void)=>void;
 offEvent?:(event:string,handler:()=>void)=>void;
 viewportHeight?:number;
 safeAreaInset?:{top?:number;right?:number;bottom?:number;left?:number};
 contentSafeAreaInset?:{top?:number;right?:number;bottom?:number;left?:number};
 BackButton?:{show?:()=>void;hide?:()=>void;onClick?:(handler:()=>void)=>void;offClick?:(handler:()=>void)=>void};
}
type TelegramWindow=Window&{Telegram?:{WebApp?:TelegramWebApp}};

export function hasTelegramLaunchParams(search:string,hash:string){
 const matches=(part:string)=>{
  const data=new URLSearchParams(part.replace(/^[?#]/,""));
  return Boolean(data.get("tgWebAppPlatform")&&data.get("tgWebAppVersion"));
 };
 return matches(search)||matches(hash);
}
const safePixel=(value:unknown)=>typeof value==="number"&&Number.isFinite(value)?
 Math.max(0,Math.min(300,Math.round(value))):0;

export function installTelegramMiniApp(
 win:Window,
 doc:Document,
 callbacks:{getState:()=>GameState;onBack:()=>void;onResize:()=>void}
){
 if(!hasTelegramLaunchParams(win.location.search,win.location.hash)){
  return {active:false,requestFullscreen:()=>{},onGameState:()=>{},dispose:()=>{}};
 }
 const host=win as TelegramWindow;
 const root=doc.documentElement;
 root.classList.add("telegram-mini-app");
 let disposed=false;
 let app:TelegramWebApp|null=null;
 let script:HTMLScriptElement|null=null;
 const back=()=>{if(!disposed)callbacks.onBack();};
 const applyInsets=()=>{
  if(!app||disposed)return;
  const safe=app.safeAreaInset,content=app.contentSafeAreaInset;
  for(const side of ["top","right","bottom","left"] as const){
   root.style.setProperty("--tg-safe-"+side,
    safePixel(Math.max(safe?.[side]??0,content?.[side]??0))+"px");
  }
 };
 const onResize=()=>{
  if(disposed||!app)return;
  const height=app.viewportHeight;
  if(typeof height==="number"&&Number.isFinite(height)&&height>0)
   root.style.setProperty("--tg-viewport-height",Math.round(height)+"px");
  applyInsets();
  callbacks.onResize();
 };
 const syncBack=()=>{
  if(!app||disposed)return;
  if(callbacks.getState()===GameState.MENU)app.BackButton?.hide?.();
  else app.BackButton?.show?.();
 };
 const onGameState=()=>syncBack();
 const listeners=["viewportChanged","safeAreaChanged","contentSafeAreaChanged"] as const;
 const initialize=()=>{
  if(disposed||app)return;
  const current=host.Telegram?.WebApp;
  if(!current)return;
  app=current;
  try{current.setHeaderColor?.("#000000");}catch{/* older clients */}
  try{current.setBackgroundColor?.("#000000");}catch{/* older clients */}
  try{current.setBottomBarColor?.("#000000");}catch{/* older clients */}
  try{current.disableVerticalSwipes?.();}catch{/* older clients */}
  for(const name of listeners)current.onEvent?.(name,onResize);
  current.BackButton?.onClick?.(back);
  try{current.ready?.();current.expand?.();}catch{/* usable in ordinary webview */}
  onResize();
  syncBack();
 };
 const requestFullscreen=()=>{
  if(disposed||!app)return;
  try{
   if(app.isVersionAtLeast?.("8.0"))app.requestFullscreen?.();
   else app.expand?.();
  }catch{/* not all Telegram platforms permit fullscreen */}
 };
 if(host.Telegram?.WebApp)initialize();
 else{
  script=doc.createElement("script");
  script.src="https://telegram.org/js/telegram-web-app.js?64";
  script.async=true;
  script.onload=initialize;
  script.onerror=()=>{script=null;};
  doc.head.appendChild(script);
 }
 return {
  active:true,
  requestFullscreen,
  onGameState,
  dispose:()=>{
   if(disposed)return;
   disposed=true;
   if(app){
    for(const name of listeners)app.offEvent?.(name,onResize);
    app.BackButton?.offClick?.(back);
    app.BackButton?.hide?.();
   }
   if(script){script.onload=null;script.onerror=null;script.remove();}
   root.style.removeProperty("--tg-viewport-height");
   for(const side of ["top","right","bottom","left"])root.style.removeProperty("--tg-safe-"+side);
   root.classList.remove("telegram-mini-app");
  }
 };
}
