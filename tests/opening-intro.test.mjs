import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {
 OPENING_DURATION_MS,
 REDUCED_MOTION_DURATION_MS,
 ambientFighterPlacement,
 ambientFighterDrift,
 openingStarBrightness,
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

test("ambient fighter remains visible beside wide and phone landscape menus",()=>{
 for(const [viewport,panel] of [[960,512],[740,512],[600,512]]){
  const placement=ambientFighterPlacement(viewport,panel);
  const menuRight=(viewport+panel)/2/viewport;
  assert.ok(placement.x>menuRight,"fighter stays outside the menu panel");
  assert.ok(placement.x<=1&&placement.x>=0);
  assert.ok(placement.scale>0&&placement.scale<=1);
 }
 assert.ok(ambientFighterPlacement(560,544).scale<1,
  "the figure is scaled down when the side gutter is narrow");
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
 assert.ok(main.includes("intro.dispose();"));
 assert.ok(main.includes("intro.restoreAmbient();"));
 assert.ok(main.includes('root.classList.add("game-ui-intro-pending")'));
 assert.match(css,/space-menu-reveal 1\.85s/);
 assert.ok(css.includes("space-menu-content-reveal"));
 assert.ok(css.includes("game-ui-intro-pending"));
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
  "fighterVisual","openingFrame","openingStars","OPENING_DURATION_MS","REDUCED_MOTION_DURATION_MS","ambientFighterPlacement","ambientFighterDrift","openingStarBrightness",
  source+";return OpeningIntro;"
 )(()=>({joints:[[[0,0],[0,.7]]],head:[0,1]}),openingFrame,openingStars,OPENING_DURATION_MS,REDUCED_MOTION_DURATION_MS,ambientFighterPlacement,ambientFighterDrift,openingStarBrightness);
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
  intro.restoreAmbient();
  assert.equal(intro.active,true);
  assert.equal(intro.ambient,true);
  assert.equal(menu.inert,false);
  assert.equal(menu.classList.contains("game-ui-intro-revealed"),false,"returning from gameplay does not replay intro reveal");
  intro.dispose();
 }finally{
  globalThis.document=oldDocument;
  globalThis.window=oldWindow;
 }
});

test("only a sparse, deterministic subset of stars twinkles with independent soft pulses",()=>{
 const stars=openingStars(120),twinklers=stars.filter(s=>s.twinkleStrength>0);
 assert.equal(twinklers.length,30);
 assert.ok(new Set(twinklers.map(s=>s.twinklePeriod.toFixed(2))).size>25);
 for(const star of stars){
  const samples=Array.from({length:80},(_,i)=>openingStarBrightness(star,i*.25));
  assert.ok(samples.every(v=>v>=0&&v<=1));
  if(star.twinkleStrength===0)assert.ok(samples.every(v=>v===samples[0]),
   "most of the starfield stays stable");
  assert.equal(openingStarBrightness(star,0,true),openingStarBrightness(star,40,true),
   "reduced motion has an entirely static starfield");
 }
 const a=twinklers[0],b=twinklers[1];
 const samplesA=Array.from({length:80},(_,i)=>openingStarBrightness(a,i));
 const samplesB=Array.from({length:80},(_,i)=>openingStarBrightness(b,i));
 assert.notDeepEqual(samplesA,samplesB,"no synchronized flashing");
 for(let i=1;i<=500;i++){
  const before=openingStarBrightness(a,i*.03),after=openingStarBrightness(a,i*.03+.01);
  assert.ok(Math.abs(before-after)<.02,"soft twinkle never strobes abruptly");
 }
});

test("second fighter has independent smooth and bounded drift",()=>{
 for(let i=0;i<400;i++){
  const t=i/8,hero=ambientFighterDrift(t),enemy=ambientFighterDrift(t,true);
  assert.ok(Math.abs(hero.x)<.01&&Math.abs(enemy.x)<.01);
  assert.ok(Math.abs(hero.y)<.06);
  assert.ok(enemy.y>.14&&enemy.y<.18);
  const next=ambientFighterDrift(t+.02,true);
  assert.ok(Math.abs(next.y-enemy.y)<.003);
  assert.ok(Math.abs(next.angle-enemy.angle)<.01);
 }
 assert.notDeepEqual(ambientFighterDrift(8),ambientFighterDrift(8,true));
});

function introSimulator(reduced=false,width=960,height=540){
 const compiled=readFileSync(".test-build/ui/OpeningIntro.js","utf8");
 const source=compiled.slice(compiled.indexOf("export class OpeningIntro")).replace("export class OpeningIntro","class OpeningIntro");
 const OpeningIntro=new Function("fighterVisual","openingFrame","openingStars","OPENING_DURATION_MS",
  "REDUCED_MOTION_DURATION_MS","ambientFighterPlacement","ambientFighterDrift","openingStarBrightness",
  source+";return OpeningIntro;")(
  state=>({joints:[[[0,0],[0,.7]]],head:[0,1]}),openingFrame,openingStars,
  OPENING_DURATION_MS,REDUCED_MOTION_DURATION_MS,ambientFighterPlacement,ambientFighterDrift,openingStarBrightness
 );
 const savedDocument=globalThis.document,savedWindow=globalThis.window;
 let nextFrame=0,draws=0,redHeadbandStrokes=0;
 const raf=new Map(),listeners=new Map(),docListeners=new Map(),translations=[];
 const ctxTarget={
  strokeStyle:"#fff",
  createRadialGradient(){return {addColorStop(){}}},
  fillRect(){draws++},
  translate(x,y){translations.push([x,y])},
  stroke(){if(this.strokeStyle==="#f04250")redHeadbandStrokes++},
 };
 const context=new Proxy(ctxTarget,{get(obj,key){return key in obj?obj[key]:()=>{}},set(obj,key,val){obj[key]=val;return true}});
 const node=tag=>{
  const classes=new Set();
  return {
   tag,style:{},attributes:{},children:[],hidden:false,inert:false,clientWidth:width,clientHeight:height,
   classList:{add(x){classes.add(x)},remove(x){classes.delete(x)},contains(x){return classes.has(x)}},
   setAttribute(k,v){this.attributes[k]=v},removeAttribute(k){delete this.attributes[k]},
   append(...v){this.children.push(...v)},remove(){this.removed=true},
   addEventListener(k,fn){this.events??={};this.events[k]=fn},
   querySelector(q){return q.includes("game-ui")?{offsetWidth:Math.min(512,width-16)}:{focus(){} }},
   getContext(){return context}
  };
 };
 const body=node("body"),menu=node("div");
 globalThis.document={body,hidden:false,createElement:node,
  addEventListener(k,fn){docListeners.set(k,fn)},removeEventListener(k){docListeners.delete(k)}};
 globalThis.window={
  innerWidth:width,innerHeight:height,devicePixelRatio:1,
  matchMedia(){return {matches:reduced}},
  addEventListener(k,fn){listeners.set(k,fn)},removeEventListener(k){listeners.delete(k)},
  requestAnimationFrame(fn){const id=++nextFrame;raf.set(id,fn);return id},
  cancelAnimationFrame(id){raf.delete(id)}
 };
 const intro=new OpeningIntro(menu,"en");
 return{
  intro,menu,body,raf,listeners,docListeners,translations,
  get draws(){return draws},
  get redStrokes(){return redHeadbandStrokes},
  runFrame(time){const current=[...raf];raf.clear();for(const [,fn] of current)fn(time)},
  visibility(hidden){globalThis.document.hidden=hidden;docListeners.get("visibilitychange")?.()},
  restoreGlobals(){globalThis.document=savedDocument;globalThis.window=savedWindow}
 };
}

test("skip moves into a living dual-fighter ambient scene with one RAF and a red headband",()=>{
 const sim=introSimulator();
 try{
  sim.intro.start();
  assert.equal(sim.raf.size,1);
  sim.runFrame(100);
  sim.intro.skip.events.click();
  assert.equal(sim.intro.ambient,true);
  assert.equal(sim.raf.size,1);
  const before=sim.draws;
  for(let i=1;i<16;i++){
   sim.runFrame(100+i*38);
   assert.equal(sim.raf.size,1,"never schedule duplicate frames");
  }
  assert.ok(sim.draws>before,"the canvas must continue repainting behind menu");
  assert.ok(sim.redStrokes>0,"the enemy is drawn with a clearly red headband");
  assert.equal(sim.menu.inert,false);
  assert.equal(sim.intro.overlay.classList.contains("opening-intro--ambient"),true);
  sim.intro.dispose();
  assert.equal(sim.raf.size,0);
  assert.equal(sim.listeners.size,0);
  assert.equal(sim.docListeners.size,0);
 }finally{sim.restoreGlobals();}
});

test("auto-complete, tab background/foreground and disposal have balanced RAF lifecycle",()=>{
 const sim=introSimulator();
 try{
  sim.intro.start();
  for(let i=1;i<220;i++)sim.runFrame(i*64);
  assert.equal(sim.intro.ambient,true,"finishes without needing Skip");
  assert.equal(sim.raf.size,1);
  sim.visibility(true);
  assert.equal(sim.raf.size,0);
  const frozen=sim.draws;
  sim.runFrame(20000);
  assert.equal(sim.draws,frozen);
  sim.visibility(false);
  assert.equal(sim.raf.size,1);
  assert.ok(sim.draws>frozen,"foreground repaints immediately");
  sim.runFrame(20050);
  assert.equal(sim.raf.size,1);
  sim.intro.dispose();
  assert.equal(sim.raf.size,0);
  assert.equal(sim.docListeners.size,0);
  sim.intro.restoreAmbient();
  assert.equal(sim.intro.ambient,true);
  assert.equal(sim.raf.size,1);
  // The first rendered fighter after restore is already by the menu side.
  assert.ok(sim.translations.at(-2)?.[0]>sim.menu.clientWidth*.70);
  assert.ok(sim.translations.at(-1)?.[0]<sim.menu.clientWidth*.30);
  assert.equal(sim.menu.classList.contains("game-ui-intro-revealed"),false,
   "returning from gameplay must not replay the menu reveal");
  sim.intro.dispose();
 }finally{sim.restoreGlobals();}
});

test("reduced motion finishes as a legible static two-fighter scene without a background RAF",()=>{
 const sim=introSimulator(true,600,300);
 try{
  sim.intro.start();
  sim.intro.skip.events.click();
  assert.equal(sim.intro.ambient,true);
  assert.equal(sim.raf.size,0,"static reduced-motion ambient consumes no animation frames");
  assert.ok(sim.redStrokes>0,"even static menu includes enemy headband");
  const strokes=sim.redStrokes;
  sim.visibility(true);
  sim.visibility(false);
  assert.equal(sim.raf.size,0);
  assert.ok(sim.redStrokes>strokes,"foreground restoration redraws the static scene");
  sim.intro.dispose();
  sim.intro.restoreAmbient();
  assert.equal(sim.raf.size,0);
  assert.equal(sim.intro.ambient,true);
  sim.intro.dispose();
 }finally{sim.restoreGlobals();}
});
