import {GameState} from "../../core/GameState.js";

/**
 * Telegram Mini App bridge. Never trust initDataUnsafe: raw initData is sent
 * only to the separate Worker API for server-side verification.
 * Load the official SDK only on Telegram launch signals, or when the user
 * explicitly opens the ranking panel to retry detection. Ordinary visitors
 * never fetch it merely by loading the game.
 */
export interface TelegramWebApp{
 initData?:string;
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
  // Some clients lose one launch field on webview navigation/reload. A single
  // Telegram-specific field is enough to attempt the SDK, not to trust a user.
  return Boolean(data.get("tgWebAppData")||data.get("tgWebAppPlatform")||data.get("tgWebAppVersion"));
 };
 return matches(search)||matches(hash);
}
const safePixel=(value:unknown)=>typeof value==="number"&&Number.isFinite(value)?
 Math.max(0,Math.min(300,Math.round(value))):0;

export function installTelegramMiniApp(
 win:Window,
 doc:Document,
 callbacks:{getState:()=>GameState;onBack:()=>void;onResize:()=>void;onReady?:(app:TelegramWebApp)=>void;onFailure?:()=>void}
){
 const host=win as TelegramWindow;
 const root=doc.documentElement;
 // UA is a *hint* for attempting initialization, never an identity signal.
 // Android and desktop Telegram builds may use these UA tokens while omitting
 // the usual launch fields after an in-app navigation or reload.
 const userAgent=win.navigator?.userAgent??"";
 const hasLaunchHint=hasTelegramLaunchParams(win.location.search,win.location.hash)||
  /\\bTelegram(?:-Android|-iOS)?(?:\\/|\\b)/i.test(userAgent)||
  Boolean(host.Telegram?.WebApp?.initData);
 let active=false;
 let attempted=false;
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
  callbacks.onReady?.(current);
 };
 const requestFullscreen=()=>{
  if(disposed||!app)return;
  try{
   if(app.isVersionAtLeast?.("8.0"))app.requestFullscreen?.();
   else app.expand?.();
  }catch{/* not all Telegram platforms permit fullscreen */}
 };
 const beginInitialization=()=>{
  if(disposed||attempted)return;
  attempted=true;
  active=true;
  root.classList.add("telegram-mini-app");
  if(host.Telegram?.WebApp)initialize();
  else{
   script=doc.createElement("script");
   script.src="https://telegram.org/js/telegram-web-app.js?64";
   script.async=true;
   script.onload=()=>{initialize();if(!app&&!disposed)callbacks.onFailure?.();};
   script.onerror=()=>{if(!disposed)callbacks.onFailure?.();script=null;};
   doc.head.appendChild(script);
  }
 };
 if(hasLaunchHint||Boolean(host.Telegram?.WebApp))beginInitialization();
 return {
  get active(){return active;},
  // Opening Rankings is an explicit user gesture, so clients without recognizable
  // launch params may still obtain initData after loading Telegram's SDK.
  retryInitialization:()=>{if(!attempted)beginInitialization();else if(!app&&host.Telegram?.WebApp)initialize();},
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
   active=false;
  }
 };
}
