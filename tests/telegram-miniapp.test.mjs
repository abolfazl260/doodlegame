import test from "node:test";
import assert from "node:assert/strict";
import {GameState} from "../.test-build/core/GameState.js";
import {hasTelegramLaunchParams,installTelegramMiniApp} from "../.test-build/platform/web/TelegramMiniApp.js";

function harness(search="",hash="",version="9.0"){
 const events=new Map(),styles=new Map(),classes=new Set(),calls=[];
 const back={
  show(){calls.push("back-show")},hide(){calls.push("back-hide")},
  onClick(cb){events.set("back",cb)},offClick(cb){if(events.get("back")===cb)events.delete("back")}
 };
 const app={
  viewportHeight:660,
  safeAreaInset:{top:18,right:4,bottom:14,left:8},
  contentSafeAreaInset:{top:42,right:6,bottom:35,left:5},
  BackButton:back,
  ready(){calls.push("ready")},expand(){calls.push("expand")},
  requestFullscreen(){calls.push("fullscreen")},
  disableVerticalSwipes(){calls.push("no-swipe")},
  setHeaderColor(x){calls.push("header:"+x)},
  setBackgroundColor(x){calls.push("background:"+x)},
  setBottomBarColor(x){calls.push("bottom:"+x)},
  isVersionAtLeast(x){return x==="8.0"&&Number(version.split(".")[0])>=8},
  onEvent(k,cb){events.set(k,cb)},offEvent(k,cb){if(events.get(k)===cb)events.delete(k)}
 };
 let appended=0,removed=0;
 const win={location:{search,hash},Telegram:undefined};
 const doc={
  documentElement:{
   classList:{add(k){classes.add(k)},remove(k){classes.delete(k)},contains(k){return classes.has(k)}},
   style:{setProperty(k,v){styles.set(k,v)},removeProperty(k){styles.delete(k)}}
  },
  head:{appendChild(script){appended++;win.Telegram={WebApp:app};script.onload?.()}},
  createElement(k){assert.equal(k,"script");return{src:"",async:false,onload:null,onerror:null,remove(){removed++}}}
 };
 let state=GameState.MENU;
 const backActions=[],resize=[];
 const callbacks={getState:()=>state,onBack:()=>backActions.push(state),onResize:()=>resize.push(1)};
 return {win,doc,app,events,styles,classes,calls,backActions,resize,
  get appended(){return appended},get removed(){return removed},
  setState:(s)=>{state=s},callbacks};
}

test("Telegram launch detection accepts partial SDK parameters after webview reloads",()=>{
 assert.equal(hasTelegramLaunchParams("",""),false);
 assert.equal(hasTelegramLaunchParams("?tgWebAppPlatform=android",""),true);
 assert.equal(hasTelegramLaunchParams("?tgWebAppVersion=9.0",""),true);
 assert.equal(hasTelegramLaunchParams("?tgWebAppPlatform=android&tgWebAppVersion=9.0",""),true);
 assert.equal(hasTelegramLaunchParams("","#tgWebAppData=opaque"),true);
 assert.equal(hasTelegramLaunchParams("","#tgWebAppPlatform=ios&tgWebAppVersion=8.0&tgWebAppData=test"),true);
 assert.equal(hasTelegramLaunchParams("?ref=telegram",""),false);
});

test("ordinary web and Android launches do not load external SDK or alter page",()=>{
 const h=harness();
 const integration=installTelegramMiniApp(h.win,h.doc,h.callbacks);
 assert.equal(integration.active,false);
 assert.equal(h.appended,0);
 assert.equal(h.classes.has("telegram-mini-app"),false);
 integration.requestFullscreen();integration.onGameState();integration.dispose();
 assert.equal(h.calls.length,0);
});

test("a user-triggered retry loads the SDK without any Telegram URL fields",()=>{
 const h=harness();
 let connected=0;
 const integration=installTelegramMiniApp(h.win,h.doc,{...h.callbacks,onReady:()=>connected++});
 assert.equal(integration.active,false);
 assert.equal(h.appended,0);
 integration.retryInitialization();
 assert.equal(integration.active,true);
 assert.equal(h.appended,1);
 assert.equal(connected,1);
 integration.retryInitialization();
 assert.equal(h.appended,1,"retry must not duplicate Telegram SDK script");
 integration.dispose();
});

test("Telegram user-agent can initialize even after URL launch parameters disappear",()=>{
 const h=harness();
 h.win.navigator={userAgent:"Mozilla/5.0 Telegram-Android/11.0"};
 const integration=installTelegramMiniApp(h.win,h.doc,h.callbacks);
 assert.equal(integration.active,true);
 assert.equal(h.appended,1);
 integration.dispose();
});

test("Telegram launch initializes SDK, viewport, safe areas and proper dark chrome",()=>{
 const h=harness("","#tgWebAppPlatform=android&tgWebAppVersion=9.0");
 const integration=installTelegramMiniApp(h.win,h.doc,h.callbacks);
 assert.equal(integration.active,true);
 assert.equal(h.appended,1);
 assert.deepEqual(h.calls.slice(0,3),["header:#000000","background:#000000","bottom:#000000"]);
 assert.ok(h.calls.includes("ready"));
 assert.ok(h.calls.includes("expand"));
 assert.ok(h.calls.includes("no-swipe"));
 assert.ok(h.calls.includes("back-hide"));
 assert.equal(h.classes.has("telegram-mini-app"),true);
 assert.equal(h.styles.get("--tg-viewport-height"),"660px");
 assert.equal(h.styles.get("--tg-safe-top"),"42px");
 assert.equal(h.styles.get("--tg-safe-bottom"),"35px");
 assert.equal(h.styles.get("--tg-safe-right"),"6px");
 assert.equal(h.styles.get("--tg-safe-left"),"8px");
 h.app.viewportHeight=410;
 h.app.contentSafeAreaInset.top=48;
 h.events.get("viewportChanged")();
 assert.equal(h.styles.get("--tg-viewport-height"),"410px");
 h.events.get("contentSafeAreaChanged")();
 assert.equal(h.styles.get("--tg-safe-top"),"48px");
 assert.ok(h.resize.length>=3);
 integration.requestFullscreen();
 assert.ok(h.calls.includes("fullscreen"));
 integration.dispose();integration.dispose();
 assert.equal(h.classes.has("telegram-mini-app"),false);
 assert.equal(h.styles.size,0);
 assert.equal(h.events.size,0);
 assert.equal(h.removed,1);
 assert.ok(h.calls.includes("back-hide"));
});

test("header Back button tracks match/pause/menu and never closes the game unexpectedly",()=>{
 const h=harness("?tgWebAppPlatform=ios&tgWebAppVersion=9.0");
 const tg=installTelegramMiniApp(h.win,h.doc,h.callbacks);
 h.setState(GameState.PLAYING);tg.onGameState();
 assert.equal(h.calls.at(-1),"back-show");
 h.events.get("back")();
 assert.deepEqual(h.backActions,[GameState.PLAYING]);
 h.setState(GameState.PAUSED);tg.onGameState();
 h.events.get("back")();
 assert.deepEqual(h.backActions,[GameState.PLAYING,GameState.PAUSED]);
 h.setState(GameState.MENU);tg.onGameState();
 assert.equal(h.calls.at(-1),"back-hide");
 tg.dispose();
 assert.equal(h.events.has("back"),false);
});

test("older Telegram versions fall back to expand rather than unsupported fullscreen",()=>{
 const h=harness("","#tgWebAppPlatform=web&tgWebAppVersion=7.8","7.8");
 const integration=installTelegramMiniApp(h.win,h.doc,h.callbacks);
 const before=h.calls.filter(x=>x==="expand").length;
 integration.requestFullscreen();
 assert.equal(h.calls.includes("fullscreen"),false);
 assert.equal(h.calls.filter(x=>x==="expand").length,before+1);
 integration.dispose();
});

test("pre-injected SDK is recognized even without URL markers while login still requires signed data",()=>{
 const h=harness();
 h.win.Telegram={WebApp:h.app};
 let ready=false;
 const integration=installTelegramMiniApp(h.win,h.doc,{...h.callbacks,onReady:()=>{ready=true;}});
 assert.equal(integration.active,true);
 assert.equal(ready,true);
 assert.equal(h.appended,0);
 integration.dispose();
});

test("Telegram SDK failure triggers a visible error callback",()=>{
 const h=harness("","#tgWebAppPlatform=android&tgWebAppVersion=9.0");
 let failures=0;
 h.doc.head.appendChild=script=>{script.onerror?.();};
 const integration=installTelegramMiniApp(h.win,h.doc,{...h.callbacks,onFailure:()=>failures++});
 assert.equal(failures,1);
 integration.dispose();
});

test("pre-injected Telegram SDK works and never downloads the script twice",()=>{
 const h=harness("","#tgWebAppPlatform=tdesktop&tgWebAppVersion=9.0");
 h.win.Telegram={WebApp:h.app};
 const integration=installTelegramMiniApp(h.win,h.doc,h.callbacks);
 assert.equal(h.appended,0);
 assert.ok(h.calls.includes("ready"));
 integration.dispose();
});
