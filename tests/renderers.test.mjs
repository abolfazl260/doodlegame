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
 return import('data:text/javascript;base64,'+Buffer.from(source.replaceAll("'./FighterVisual'",JSON.stringify(visual)).replaceAll('"three"',JSON.stringify(three)).replaceAll('"./WebGLContextLifecycle"',JSON.stringify(contextLifecycle)).replaceAll('"./CombatCamera.js"',JSON.stringify(combatCamera)).replaceAll('"./PlatformDecorations.js"',JSON.stringify(decorations)).replaceAll('"../themes/ArenaThemes"',JSON.stringify(themes)).replaceAll('"../gameplay/DownloadableArenas.js"',JSON.stringify(downloadable))).toString('base64'));
}
const state=()=>new GameSession({getState(){return {}},endFrame(){}}).getRenderState();
test('WebGL fighter draw places both fighters and produces valid geometries for every tool',async()=>{
 const {ThreeRenderer}=await rendererModule('ThreeRenderer');
 const renderer=Object.create(ThreeRenderer.prototype);
 const view=renderer.fighter(0xffffff,false),base=state().player;
 for(const weapon of ['blade','hammer','blaster','uzi','boomerang','bow','bomb','missile'])for(const facing of [-1,1]){
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
test('Canvas render balances transformations and opacity for missiles and every held tool',async()=>{
 const {CanvasRenderer}=await rendererModule('CanvasRenderer');
 let depth=0;const context=new Proxy({save(){depth++},restore(){assert.ok(depth>0);depth--}}, {get(target,key){return key in target?target[key]:()=>{}},set(target,key,value){target[key]=value;return true}});
 globalThis.window={devicePixelRatio:1};
 const renderer=new CanvasRenderer({clientWidth:1000,clientHeight:700,getContext(){return context}});
 for(const weapon of ['blade','hammer','blaster','uzi','boomerang','bow','bomb','missile']) {
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

 // No new materials or meshes should be allocated when switching the four styles.
 for(const weapon of ['blade','hammer','blaster','bow']){
  renderer.draw(player,{...s,characterId:'soldier',weapon,weaponHolsterFrom:null});
  assert.equal(player.styleMeshes.length,4);
  for(const mesh of player.styleMeshes){
   assert.ok(mesh.visible,weapon+' must render all color detail layers');
   assert.ok(mesh.geometry.getAttribute('position').array.every(Number.isFinite));
  }
 }
 renderer.draw(player,{...s,weapon:'uzi'});
 assert.ok(player.styleMeshes.every(mesh=>!mesh.visible),'unmodified weapons hide reference-only layers');
 for(const view of [player,enemy])view.group.traverse(o=>{o.geometry?.dispose();o.material?.dispose?.()});
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
  assert.ok(widths.some(w=>Math.abs(w-40*.19)<.00001),"slim body halo is rendered");
  assert.ok(widths.some(w=>Math.abs(w-40*.095)<.00001),"slim inner limb stroke is rendered");
  assert.ok(widths.some(w=>Math.abs(w-40*.31)<.00001),"torso is thinner but remains visible");
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
