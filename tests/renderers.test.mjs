import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {GameSession} from '../.test-build/gameplay/GameSession.js';
// Run real geometry and Canvas commands without depending on a GPU or browser.
async function rendererModule(name){
 const source=await readFile(new URL('../.test-build/rendering/'+name+'.js',import.meta.url),'utf8');
 const visual=new URL('../.test-build/rendering/FighterVisual.js',import.meta.url).href;
 const three=new URL('../node_modules/three/build/three.module.js',import.meta.url).href;
 return import('data:text/javascript;base64,'+Buffer.from(source.replaceAll("'./FighterVisual'",JSON.stringify(visual)).replaceAll('"three"',JSON.stringify(three))).toString('base64'));
}
const state=()=>new GameSession({getState(){return {}},endFrame(){}}).getRenderState();
test('WebGL fighter draw places both fighters and produces valid geometries for every tool',async()=>{
 const {ThreeRenderer}=await rendererModule('ThreeRenderer');
 const renderer=Object.create(ThreeRenderer.prototype);
 const view=renderer.fighter(0xffffff,false),base=state().player;
 for(const weapon of ['blade','hammer','blaster','uzi','boomerang','bow','bomb','missile'])for(const facing of [-1,1]){
  const s={...base,x:3,y:4,weapon,facing,attackTime:.1,bowCharge:1};renderer.draw(view,s);
  assert.equal(view.group.position.x,3);assert.equal(view.group.position.y,4);
  for(const line of [view.limbs,view.tool,view.effect]){
   const array=line.geometry.getAttribute('position').array;assert.equal(array.length%6,0);assert.ok([...array].every(Number.isFinite));
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
