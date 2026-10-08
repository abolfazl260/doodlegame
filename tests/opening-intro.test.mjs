import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {
 OPENING_DURATION_MS,
 REDUCED_MOTION_DURATION_MS,
 openingFrame,
 openingStars
} from "../.test-build/ui/OpeningIntroMotion.js";

test("long intro keeps the weightless figure moving after the menu appears",()=>{
 assert.ok(OPENING_DURATION_MS>=10000,"show the opening animation for at least 10 seconds");
 const beginning=openingFrame(0);
 const midpoint=openingFrame(OPENING_DURATION_MS/2);
 const end=openingFrame(OPENING_DURATION_MS);
 const ambient=openingFrame(OPENING_DURATION_MS+1300);
 assert.equal(beginning.progress,0);
 assert.equal(midpoint.progress,.5);
 assert.equal(end.progress,1);
 assert.equal(ambient.progress,1);
 assert.ok(end.x>beginning.x,"fighter drifts across the screen");
 assert.notDeepEqual([ambient.x,ambient.y,ambient.angle],[end.x,end.y,end.angle],
  "the space scene must continue animating after the intro ends");
});

test("weightless fighter paddles instead of following a static image",()=>{
 const positions=[0,800,1550,2400].map(ms=>openingFrame(ms));
 assert.ok(new Set(positions.map(point=>point.y)).size>1);
 assert.ok(new Set(positions.map(point=>point.angle)).size>1);
 assert.ok(new Set(positions.map(point=>point.paddle)).size>1);
 for(const pose of positions){
  assert.ok(Number.isFinite(pose.x)&&Number.isFinite(pose.y));
 }
});

test("prefers-reduced-motion is a shorter version of the same safe transition",()=>{
 const half=openingFrame(REDUCED_MOTION_DURATION_MS/2,REDUCED_MOTION_DURATION_MS);
 assert.equal(half.progress,.5);
 assert.equal(openingFrame(REDUCED_MOTION_DURATION_MS,REDUCED_MOTION_DURATION_MS).progress,1);
 assert.equal(openingFrame(999999).progress,1);
 assert.equal(openingFrame(-10).progress,0);
});

test("procedural star field is deterministic and never needs an image download",()=>{
 const first=openingStars(70);
 assert.deepEqual(first,openingStars(70));
 assert.notDeepEqual(first,openingStars(70,99));
 assert.equal(first.length,70);
 for(const star of first){
  assert.ok(star.x>=0&&star.x<1);
  assert.ok(star.y>=0&&star.y<1);
 }
});

test("intro starts only after initializing the game and can be skipped",()=>{
 const main=readFileSync("src/main.ts","utf8");
 const intro=readFileSync("src/ui/OpeningIntro.ts","utf8");
 const css=readFileSync("src/styles.css","utf8");
 assert.ok(main.indexOf("game.initialize();")<main.indexOf("intro.start();"));
 assert.ok(main.includes("intro.dispose();"));
 assert.ok(intro.includes("this.skip.addEventListener"));
 assert.ok(intro.includes("this.finish()"));
 assert.ok(intro.includes("this.menuRoot.inert=true"));
 assert.ok(intro.includes("this.menuRoot.inert=false"));
 assert.ok(intro.includes('this.overlay.classList.add("opening-intro--ambient")'));
 assert.ok(main.includes("if(state===GameState.PLAYING)intro.dispose()"));
 assert.ok(intro.includes("fighterVisual(state)"));
 assert.ok(intro.includes("this.drawPlanet("));
 assert.ok(css.includes(".opening-intro__skip"));
 assert.ok(css.includes(".opening-intro--ambient"));
 assert.ok(css.includes("space-menu-reveal"));
});

test("skipping the intro reveals menu while the background stays alive until gameplay",()=>{
 const compiled=readFileSync(".test-build/ui/OpeningIntro.js","utf8");
 const start=compiled.indexOf("export class OpeningIntro");
 assert.ok(start>=0);
 const source=compiled.slice(start).replace("export class OpeningIntro","class OpeningIntro");
 const OpeningIntro=new Function(
  "fighterVisual","openingFrame","openingStars","OPENING_DURATION_MS","REDUCED_MOTION_DURATION_MS",
  source+";return OpeningIntro;"
 )(()=>({joints:[[[0,0],[0,.7]]],head:[0,1]}),openingFrame,openingStars,OPENING_DURATION_MS,REDUCED_MOTION_DURATION_MS);
 const oldDocument=globalThis.document,oldWindow=globalThis.window;
 const makeNode=(tag)=>{
  const classes=new Set();
  return {
   tag,style:{},attributes:{},children:[],hidden:false,inert:false,clientWidth:960,clientHeight:540,
   classList:{add(value){classes.add(value)},remove(value){classes.delete(value)},contains(value){return classes.has(value)}},
   setAttribute(name,value){this.attributes[name]=value},removeAttribute(name){delete this.attributes[name]},
   append(...children){this.children.push(...children)},
   remove(){this.removed=true},
   addEventListener(type,listener){this.listeners??={};this.listeners[type]=listener},
   querySelector(){return {focus(){}}},
   getContext(){return new Proxy({
    createRadialGradient(){return {addColorStop(){}}}
   },{get(target,key){return key in target?target[key]:()=>{}},set(target,key,value){target[key]=value;return true}})}
  };
 };
 let frames=0;
 const menu=makeNode("div"),body=makeNode("body");
 try{
  globalThis.document={body,hidden:false,createElement:makeNode,addEventListener(){},removeEventListener(){}};
  globalThis.window={
   innerWidth:960,innerHeight:540,devicePixelRatio:1,
   matchMedia(){return {matches:false}},
   addEventListener(){},removeEventListener(){},
   requestAnimationFrame(){return ++frames},cancelAnimationFrame(){}
  };
  const intro=new OpeningIntro(menu,"fa");
  intro.start();
  assert.equal(menu.inert,true);
  assert.equal(body.children.length,1);
  intro.skip.listeners.click();
  assert.equal(menu.inert,false);
  assert.equal(intro.active,true);
  assert.equal(intro.ambient,true);
  assert.equal(intro.skip.hidden,true);
  assert.equal(intro.overlay.removed,undefined,"space background stays mounted");
  assert.equal(intro.overlay.classList.contains("opening-intro--ambient"),true);
  assert.equal(menu.classList.contains("game-ui-intro-revealed"),true);
  const previousFrame=frames;
  intro.tick(20000);
  assert.ok(frames>previousFrame,"floating background keeps animating after revealing menu");
  intro.dispose();
  assert.equal(intro.overlay.removed,true);
  assert.equal(menu.classList.contains("game-ui-intro-revealed"),false);
 }finally{
  globalThis.document=oldDocument;
  globalThis.window=oldWindow;
 }
});
