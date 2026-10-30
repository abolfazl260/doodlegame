import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {GameSession} from '../.test-build/gameplay/GameSession.js';
// Run real geometry and Canvas commands without depending on a GPU or browser.
async function rendererModule(name){
 const source=await readFile(new URL('../.test-build/rendering/'+name+'.js',import.meta.url),'utf8');
 const visual=new URL('../.test-build/rendering/FighterVisual.js',import.meta.url).href;
 const three=new URL('../node_modules/three/build/three.module.js',import.meta.url).href;
 const contextLifecycle=new URL('../.test-build/rendering/WebGLContextLifecycle.js',import.meta.url).href;
 const combatCamera=new URL('../.test-build/rendering/CombatCamera.js',import.meta.url).href;
 const decorations=new URL('../.test-build/rendering/PlatformDecorations.js',import.meta.url).href;
 const themes=new URL('../.test-build/themes/ArenaThemes.js',import.meta.url).href;
 const downloadable=new URL('../.test-build/gameplay/DownloadableArenas.js',import.meta.url).href;
 const feedback=new URL('../.test-build/gameplay/CombatFeedback.js',import.meta.url).href;
 return import('data:text/javascript;base64,'+Buffer.from(source.replaceAll("'./FighterVisual'",JSON.stringify(visual)).replaceAll('"three"',JSON.stringify(three)).replaceAll('"./WebGLContextLifecycle"',JSON.stringify(contextLifecycle)).replaceAll('"./CombatCamera.js"',JSON.stringify(combatCamera)).replaceAll('"./PlatformDecorations.js"',JSON.stringify(decorations)).replaceAll('"../themes/ArenaThemes"',JSON.stringify(themes)).replaceAll('"../gameplay/DownloadableArenas.js"',JSON.stringify(downloadable)).replaceAll('"../gameplay/CombatFeedback.js"',JSON.stringify(feedback))).toString('base64'));
}
const state=()=>new GameSession({getState(){return {}},endFrame(){}}).getRenderState();
test('WebGL fighter draw places both fighters and produces valid geometries for every tool',async()=>{
 const {ThreeRenderer}=await rendererModule('ThreeRenderer');
 const renderer=Object.create(ThreeRenderer.prototype);
 const view=renderer.fighter(0xffffff,false),base=state().player;
 for(const weapon of ['blade','hammer','blaster','uzi','boomerang','bow','bomb','missile','spear'])for(const facing of [-1,1]){
  const s={...base,x:3,y:4,weapon,facing,attackTime:.1,bowCharge:1};renderer.draw(view,s);
  assert.equal(view.group.position.x,3);assert.equal(view.group.position.y,4);
  const effects=view.effect.geometry.getAttribute('position').array;
  assert.equal(effects.length%6,0);assert.ok([...effects].every(Number.isFinite));
  for(const mesh of [view.bodyCore,view.costumeCore,view.toolCore]){
   const array=mesh.geometry.getAttribute('position').array;
   assert.ok(array.length>0&&array.length%9===0);assert.ok([...array].every(Number.isFinite));
  }
 }
 view.group.traverse(o=>{o.geometry?.dispose();o.material?.dispose()});
});
test('Viking helmet, gold bands, horns, fur and boots render on both engines',async()=>{
 const {ThreeRenderer}=await rendererModule('ThreeRenderer');
 const {CanvasRenderer}=await rendererModule('CanvasRenderer');
 const webgl=Object.create(ThreeRenderer.prototype),fighter=webgl.fighter(0xffffff,false),base=state().player;
 const source={...base,characterId:"viking",weapon:"blade",weaponHolsterFrom:null,animationTime:1.2};
 webgl.draw(fighter,source);
 assert.equal(fighter.skinMeshes.length,14);
 assert.ok(fighter.skinMeshes.slice(0,8).every(mesh=>mesh.visible&&mesh.geometry.getAttribute("position").array.every(Number.isFinite)));
 assert.ok(fighter.skinMeshes.slice(8).every(mesh=>!mesh.visible));
 assert.equal(fighter.skinMeshes[2].material.color.getHex(),0xf4e6c8,"ivory curved horns appear");
 assert.equal(fighter.skinMeshes[3].material.color.getHex(),0xdbad4c,"gold helmet accents appear");
 webgl.draw(fighter,{...source,characterId:"soldier"});
 assert.ok(fighter.skinMeshes.every(mesh=>!mesh.visible),"changing skin removes every Viking detail");
 webgl.draw(fighter,{...source,characterId:"viking",weapon:"spear"});
 assert.ok(fighter.skinMeshes.slice(0,8).every(mesh=>mesh.visible),"equipment changes do not remove the helmet");

 const colors=[],ctx=new Proxy({save(){},restore(){},translate(){},rotate(){},scale(){},
  beginPath(){},moveTo(){},lineTo(){},stroke(){colors.push(this.strokeStyle);},
  set strokeStyle(c){this._color=c},get strokeStyle(){return this._color}
 },{get(obj,k){return k in obj?obj[k]:()=>{}},set(obj,k,v){obj[k]=v;return true}});
 const previousWindow=globalThis.window;globalThis.window={devicePixelRatio:1};
 try{
  const canvas=new CanvasRenderer({clientWidth:800,clientHeight:500,getContext(){return ctx}});
  canvas.draw(ctx,source,x=>x,y=>y,60,false);
  for(const color of ["#f4e6c8","#dbad4c","#8c603b"]){
   assert.ok(colors.includes(color),"Canvas must draw Viking details "+color);
  }
  canvas.dispose();
 }finally{if(previousWindow===undefined)delete globalThis.window;else globalThis.window=previousWindow;}
 fighter.group.traverse(o=>{o.geometry?.dispose();o.material?.dispose?.()});
});

test("five richly illustrated costumes appear in Canvas/WebGL without changing weapons",async()=>{
 const {ThreeRenderer}=await rendererModule("ThreeRenderer");
 const {CanvasRenderer}=await rendererModule("CanvasRenderer");
 const webgl=Object.create(ThreeRenderer.prototype),view=webgl.fighter(0xffffff,false),base=state().player;
 const originalTool=()=>[...view.toolOutline.geometry.getAttribute("position").array];
 const colors=[],context=new Proxy({save(){},restore(){},translate(){},rotate(){},scale(){},beginPath(){},
  moveTo(){},lineTo(){},stroke(){colors.push(this.strokeStyle);},fill(){},arc(){},ellipse(){},
  set strokeStyle(v){this._stroke=v},get strokeStyle(){return this._stroke}
 },{get(obj,key){return key in obj?obj[key]:()=>{}},set(obj,key,value){obj[key]=value;return true}});
 const oldWindow=globalThis.window;
 globalThis.window={devicePixelRatio:1};
 try{
  const canvas=new CanvasRenderer({clientWidth:800,clientHeight:440,getContext(){return context}});
  for(const [id,required] of Object.entries({
   ranger:["#455f77","#43e5f0","#1596b4","#ff9c58"],
   pharaoh:["#d6a13b","#0754a1","#32e8ff","#fff3da"],
   knight:["#b91f30","#aeb8c5","#d5a946","#d52937"],
   mummy:["#e8dfc8","#f9f2e2","#2ce8f4","#f0ba49"],
   archer:["#263c23","#d6ad50","#f9ffed","#b5e657"]
  })){
   const player={...base,characterId:id,weapon:"blade",weaponHolsterFrom:null};
   webgl.draw(view,player);
   assert.equal(view.skinMeshes.length,14);
   assert.ok(view.skinMeshes.every(mesh=>mesh.visible&&mesh.geometry.getAttribute("position").array.every(Number.isFinite)));
   const tool=originalTool();
   assert.ok(tool.length>0);
   colors.length=0;
   canvas.draw(context,player,x=>x,y=>y,60,false);
   for(const c of required){
    assert.ok(colors.includes(c),id+" canvas missing "+c);
    assert.ok(view.skinMeshes.some(mesh=>mesh.material.color.getHexString()===c.slice(1)),id+" WebGL missing "+c);
   }
   webgl.draw(view,{...player,characterId:"soldier"});
   assert.deepEqual(originalTool(),tool,id+" never alters equipped blade geometry");
   assert.ok(view.skinMeshes.every(mesh=>!mesh.visible),"switching skin clears all previous costume meshes");
  }
  canvas.dispose();
 }finally{if(oldWindow===undefined)delete globalThis.window;else globalThis.window=oldWindow;}
 view.group.traverse(obj=>{obj.geometry?.dispose();obj.material?.dispose?.()});
});

test("complex skins hide old stray shoulder/vest/gear meshes on WebGL",async()=>{
 const {ThreeRenderer}=await rendererModule("ThreeRenderer");
 const renderer=Object.create(ThreeRenderer.prototype),view=renderer.fighter(0xffffff,false),base=state().player;
 const legacy=[view.vestOutline,view.vestCore,view.gearOutline,view.gearCore,
  view.trim,view.costumeOutline,view.costumeCore];
 for(const characterId of ["ranger","pharaoh","knight","mummy","archer"]){
  renderer.draw(view,{...base,characterId,weapon:"blade",weaponHolsterFrom:null});
  assert.ok(legacy.every(mesh=>!mesh.visible),characterId+" has no duplicate black costume strokes");
  assert.equal(view.bodyCore.visible,true,"the animated skeleton must remain visible");
  assert.ok(view.skinMeshes.some(mesh=>mesh.visible),"custom armor should still appear");
 }
 renderer.draw(view,{...base,characterId:"soldier",weapon:"blade",weaponHolsterFrom:null});
 assert.ok(legacy.every(mesh=>mesh.visible),"regular soldier retains classic shoulder outlines");
 assert.ok(view.skinMeshes.every(mesh=>!mesh.visible),"cosmetic armor gets cleared on skin switch");
 view.group.traverse(obj=>{obj.geometry?.dispose();obj.material?.dispose?.()});
});

test('Canvas render balances transformations and opacity for missiles and every held tool',async()=>{
 const {CanvasRenderer}=await rendererModule('CanvasRenderer');
 let depth=0;const context=new Proxy({save(){depth++},restore(){assert.ok(depth>0);depth--}}, {get(target,key){return key in target?target[key]:()=>{}},set(target,key,value){target[key]=value;return true}});
 globalThis.window={devicePixelRatio:1};
 const renderer=new CanvasRenderer({clientWidth:1000,clientHeight:700,getContext(){return context}});
 for(const weapon of ['blade','hammer','blaster','uzi','boomerang','bow','bomb','missile','spear']) {
  const s=state();s.player={...s.player,weapon,attackTime:.1};s.projectiles=[{x:0,y:3,vx:8,vy:4,age:.1,life:1,rotation:.3,weapon:'missile'}];
  renderer.render(s);assert.equal(depth,0);
 }
 delete globalThis.window;
});
test('WebGL fighters use real, outlined thick meshes that remain readable on mobile GPUs',async()=>{
 const {ThreeRenderer}=await rendererModule('ThreeRenderer');
 const renderer=Object.create(ThreeRenderer.prototype),s=state().player;
 const player=renderer.fighter(0xffffff,false),enemy=renderer.fighter(0x555555,true);
 for(const view of [player,enemy]){
  renderer.draw(view,{...s,characterId:"soldier",x:1,y:2,weapon:"bow",bowCharge:1,attackTime:.08});
  assert.equal("limbs" in view,false,"legacy GL line meshes should no longer be allocated");
  for(const name of ["bodyHalo","bodyOutline","bodyCore","costumeOutline","costumeCore","markingOutline","markingCore","toolOutline","toolCore"]){
   const mesh=view[name],array=mesh.geometry.getAttribute("position").array;
   assert.ok(mesh.isMesh, name+" must use filled GPU geometry");
   assert.ok(array.length>0&&array.length%9===0, name+" must be triangles");
   assert.ok([...array].every(Number.isFinite), name+" should remain finite");
  }
  assert.ok(view.headHalo.geometry.parameters.radius>view.headOutline.geometry.parameters.radius);
  assert.ok(view.headOutline.geometry.parameters.radius>view.head.geometry.parameters.radius);
  assert.ok(view.bodyHalo.geometry.getAttribute("position").array.length===view.bodyCore.geometry.getAttribute("position").array.length);
 }
 const reused=player.bodyCore.geometry.getAttribute("position").array;
 renderer.draw(player,{...s,weapon:"blade",velocityX:5,gaitPhase:1.4});
 assert.strictEqual(player.bodyCore.geometry.getAttribute("position").array,reused,
  "animation must reuse its GPU buffer rather than allocate fresh arrays each frame");
 assert.notEqual(player.bodyCore.material.color.getHex(),enemy.bodyCore.material.color.getHex(),
  "player and enemy must have distinct high-visibility colors");
 assert.notEqual(player.bodyHalo.material.color.getHex(),player.bodyOutline.material.color.getHex());

 // No new materials or meshes should be allocated when switching all eight styles.
 for(const weapon of ['blade','hammer','blaster','bow','uzi','boomerang','bomb','missile','spear']){
  renderer.draw(player,{...s,characterId:'soldier',weapon,weaponHolsterFrom:null});
  assert.equal(player.styleMeshes.length,4);
  for(const mesh of player.styleMeshes){
   assert.ok(mesh.visible,weapon+' must render all color detail layers');
   assert.ok(mesh.geometry.getAttribute('position').array.every(Number.isFinite));
  }
 }
 // The chosen skin must never shorten the equipped sword or hide its inlays.
 renderer.draw(player,{...s,characterId:'ninja',weapon:'blade',weaponHolsterFrom:null});
 assert.ok(player.styleMeshes.every(mesh=>mesh.visible),'Ninja skin shares the same sword detail layers as Soldier');
 for(const view of [player,enemy])view.group.traverse(o=>{o.geometry?.dispose();o.material?.dispose?.()});
});

test('WebGL projectile artwork uses reference V boomerang and red-white rocket without affecting physics',async()=>{
 const {ThreeRenderer}=await rendererModule('ThreeRenderer');
 const r=Object.create(ThreeRenderer.prototype);
 for(const [kind,count] of [['boomerang',3],['missile',5],['spear',7]]){
  const g=r.buildProjectileIcon(kind);
  assert.equal(g.children.length,count);
  assert.ok(g.children.every(mesh=>mesh.isMesh&&mesh.geometry.getAttribute('position').array.every(Number.isFinite)));
  assert.ok(g.children.some(mesh=>mesh.material.color.getHex()===0x249fff||mesh.material.color.getHex()===0xef4040||mesh.material.color.getHex()===0x1858bf));
  g.traverse(o=>{o.geometry?.dispose();o.material?.dispose?.()});
 }
});

test('Canvas fallback draws the same multi-layer body, head and weapon silhouette',async()=>{
 const {CanvasRenderer}=await rendererModule('CanvasRenderer');
 const widths=[],colors=[],circles=[];
 let lineWidth=1,strokeStyle="#fff",fillStyle="#fff";
 const context=new Proxy({
  save(){},restore(){},translate(){},scale(){},rotate(){},beginPath(){},moveTo(){},lineTo(){},
  set lineWidth(value){lineWidth=value;},get lineWidth(){return lineWidth;},
  set strokeStyle(value){strokeStyle=value;},get strokeStyle(){return strokeStyle;},
  set fillStyle(value){fillStyle=value;},get fillStyle(){return fillStyle;},
  stroke(){widths.push(lineWidth);colors.push(strokeStyle);},
  fill(){colors.push(fillStyle);},arc(_x,_y,radius){circles.push(radius);}
 },{get(t,k){return k in t?t[k]:()=>{}},set(t,k,v){t[k]=v;return true}});
 const old=globalThis.window;globalThis.window={devicePixelRatio:1};
 try{
  const renderer=new CanvasRenderer({clientWidth:800,clientHeight:500,getContext(){return context}});
  const s=state().player;
  renderer.draw(context,{...s,grounded:false,characterId:"ninja"},x=>x,y=>y,40,false);
  assert.ok(widths.some(w=>Math.abs(w-40*.16)<.00001),"slim body halo is rendered");
  assert.ok(widths.some(w=>Math.abs(w-40*.08)<.00001),"slim inner limb stroke is rendered");
  assert.ok(widths.some(w=>Math.abs(w-40*.24)<.00001),"torso is thinner but remains visible");
  assert.ok(circles.some(r=>r>=40*.35),"head silhouette must be enlarged");
  assert.ok(colors.includes("#f18088"),"Ninja red outer halo must be present");
  widths.length=0;colors.length=0;
  renderer.draw(context,{...s,grounded:false},x=>x,y=>y,40,true);
  assert.ok(colors.includes("#182333"),"enemy Soldier should use contrasting dark-body colors");
  renderer.dispose();
 }finally{if(old===undefined)delete globalThis.window;else globalThis.window=old;}
});

test('bomb and multi-stage explosion geometry stays finite throughout its lifetime',async()=>{
 const {ThreeRenderer}=await rendererModule('ThreeRenderer');const renderer=Object.create(ThreeRenderer.prototype);
 const bomb=renderer.buildBomb();assert.equal(bomb.children.length,4);
 const explosion=renderer.buildExplosion();assert.equal(explosion.children.length,21);
 for(const age of [0,.04,.2,.5,.74]){
  renderer.drawExplosion(explosion,{x:2,y:3,age,life:.75,radius:1.8});
  assert.equal(explosion.position.x,2);assert.equal(explosion.scale.x,1.8);
  for(const child of explosion.children){assert.ok([child.position.x,child.position.y,child.scale.x,child.material.opacity].every(Number.isFinite));assert.ok(child.material.opacity>=0&&child.material.opacity<=1);}
 }
});

test('new arena mechanics have finite WebGL environment geometry',async()=>{
 const {ThreeRenderer}=await rendererModule('ThreeRenderer');
 const renderer=Object.create(ThreeRenderer.prototype);
 for(const kind of ['crumble','fan','gravity']){
  const group=renderer.buildEnvironment(kind);
  assert.ok(group.children.length>0);
  group.traverse(o=>{
   if(o.geometry?.getAttribute?.('position')){
    const values=o.geometry.getAttribute('position').array;
    assert.ok([...values].every(Number.isFinite));
   }
  });
  group.traverse(o=>{o.geometry?.dispose();o.material?.dispose?.()});
 }
});

test('Canvas backdrop reuses its pixels until arena or viewport changes',async()=>{
 const {CanvasRenderer}=await rendererModule('CanvasRenderer');
 const oldDocument=globalThis.document,oldWindow=globalThis.window;
 let rasterPaints=0,blits=0,allocations=0,canvas;
 const ctx=(overrides={})=>new Proxy({
  createLinearGradient(){return {addColorStop(){}};},
  ...overrides
 },{get(target,key){return key in target?target[key]:()=>{}},
    set(target,key,value){target[key]=value;return true}});
 const displayContext=ctx({drawImage(){blits++;}});
 globalThis.document={createElement(tag){
  assert.equal(tag,"canvas");
  allocations++;
  return {width:0,height:0,getContext(){return ctx({fillRect(){rasterPaints++;}});}};
 }};
 globalThis.window={devicePixelRatio:2};
 try{
  canvas={clientWidth:640,clientHeight:360,getContext(){return displayContext;}};
  const renderer=new CanvasRenderer(canvas);
  const initial=state();
  renderer.render(initial);
  const firstPaintCount=rasterPaints;
  assert.ok(firstPaintCount>0,"the initial static background should be rasterized");
  renderer.render(initial);
  assert.equal(rasterPaints,firstPaintCount,"unchanged frames should only blit cached pixels");
  assert.equal(allocations,1);
  assert.equal(blits,2);
  renderer.render({...initial,arena:"crater"});
  assert.ok(rasterPaints>firstPaintCount,"changing arenas invalidates background pixels");
  const afterArena=rasterPaints;
  canvas.clientWidth=800;
  renderer.resize();
  renderer.render({...initial,arena:"crater"});
  assert.ok(rasterPaints>afterArena,"resizing invalidates the backdrop");
  assert.equal(canvas.width,1600,"the cache follows device pixel ratio");
  assert.equal(renderer.backdropCanvas.width,1600);
  assert.equal(allocations,1,"a single backing canvas should be reused");
  renderer.dispose();
  assert.equal(renderer.backdropCanvas,null);
 }finally{
  if(oldDocument===undefined)delete globalThis.document;else globalThis.document=oldDocument;
  if(oldWindow===undefined)delete globalThis.window;else globalThis.window=oldWindow;
 }
});

test('Canvas and WebGL both render the hammer with a subtle steel rim, not a white outline',async()=>{
 const {CanvasRenderer}=await rendererModule('CanvasRenderer');
 const {ThreeRenderer}=await rendererModule('ThreeRenderer');
 const r=Object.create(ThreeRenderer.prototype),s={...state().player,weapon:'hammer',characterId:'ninja',weaponHolsterFrom:null,weaponDrawTime:0};
 const fighter=r.fighter(0xffffff,false);r.draw(fighter,s);
 assert.equal(fighter.toolCore.material.color.getHex(),0x7c8b9a);
 const colors=[],widths=[];let color='',width=0;
 const ctx=new Proxy({save(){},restore(){},translate(){},rotate(){},scale(){},beginPath(){},moveTo(){},lineTo(){},
  set strokeStyle(v){color=v},get strokeStyle(){return color},
  set lineWidth(v){width=v},get lineWidth(){return width},
  stroke(){colors.push(color);widths.push(width)},
  arc(){},fill(){},set fillStyle(_v){}
 },{get(o,k){return k in o?o[k]:()=>{}},set(o,k,v){o[k]=v;return true}});
 const win=globalThis.window;globalThis.window={devicePixelRatio:1};
 try{
  const canvas=new CanvasRenderer({clientWidth:800,clientHeight:500,getContext(){return ctx}});
  canvas.draw(ctx,s,x=>x,y=>y,100,false);
  assert.ok(colors.includes('#7c8b9a'),'hammer has muted steel base');
  assert.ok(widths.some(v=>Math.abs(v-1.5)<.00001),'hammer metal line is 0.015 game units');
  canvas.dispose();
 }finally{if(win===undefined)delete globalThis.window;else globalThis.window=win;}
 fighter.group.traverse(o=>{o.geometry?.dispose();o.material?.dispose?.()});
});
