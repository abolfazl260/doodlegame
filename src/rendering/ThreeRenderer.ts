import {fighterVisual,toolSegments,segmentPositions,telegraphSegments} from './FighterVisual';
import * as THREE from "three";
import type {Renderer} from "./Renderer";
import type {GameRenderState,DuelistRenderState,EnvironmentRenderState} from "../gameplay/GameSession";
import {WebGLContextLifecycle} from "./WebGLContextLifecycle";
export class ThreeRenderer implements Renderer{
 private scene=new THREE.Scene();private camera=new THREE.OrthographicCamera(-1,1,1,-1,.1,100);private renderer:THREE.WebGLRenderer;private contextLifecycle:WebGLContextLifecycle;
 private player=this.fighter(0xffffff,false);private opponent=this.fighter(0x555555,true);private platforms:THREE.Mesh[]=[];private projectiles:THREE.Mesh[]=[];private missileTrails:THREE.Mesh[]=[];private missileFlashes:THREE.Mesh[]=[];
 private projectileGeometry=new THREE.CircleGeometry(.09,10);private bowProjectiles:THREE.LineSegments[]=[];private explosionVisuals:THREE.Group[]=[];private combatVisuals:THREE.Group[]=[];private lastShakeX=0;private lastShakeY=0;private bombVisuals:THREE.Group[]=[];private platformMaterial=new THREE.MeshBasicMaterial({color:0x777777});private icePlatformMaterial=new THREE.MeshBasicMaterial({color:0x9a9a9a});private slipperyPlatformMaterial=new THREE.MeshBasicMaterial({color:0x858585});private oneWayPlatformMaterial=new THREE.MeshBasicMaterial({color:0x6f6f6f});private conveyorLeftPlatformMaterial=new THREE.MeshBasicMaterial({color:0x5a5a5a});private conveyorRightPlatformMaterial=new THREE.MeshBasicMaterial({color:0xaaaaaa});private environmentGroup=new THREE.Group();private environmentVisuals:THREE.Group[]=[];private environmentArena:GameRenderState["arena"]|null=null;private fortressGroup:THREE.Group;
 constructor(private readonly canvas:HTMLCanvasElement){this.fortressGroup=this.buildFortress();this.renderer=new THREE.WebGLRenderer({canvas,antialias:false,alpha:false,powerPreference:"high-performance"});this.contextLifecycle=new WebGLContextLifecycle(canvas,()=>this.resize());this.renderer.setClearColor(0,1);this.renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));this.camera.position.z=20;for(const _ of [0,1,2,3,4,5,6,7]){const m=new THREE.Mesh(new THREE.BoxGeometry(1,1,1),this.platformMaterial);this.platforms.push(m);this.scene.add(m);}this.scene.add(this.player.group,this.opponent.group,this.fortressGroup,this.environmentGroup);this.resize();}
 private fighter(color:number,enemy:boolean){
  const group=new THREE.Group();
  const material=new THREE.LineBasicMaterial({color});
  const limbs=new THREE.LineSegments(new THREE.BufferGeometry(),material);
  const tool=new THREE.LineSegments(new THREE.BufferGeometry(),new THREE.LineBasicMaterial({color:0xffffff}));
  const head=new THREE.Mesh(new THREE.CircleGeometry(.24,20),new THREE.MeshBasicMaterial({color}));
  const eye=new THREE.Mesh(new THREE.CircleGeometry(.035,8),new THREE.MeshBasicMaterial({color:enemy?0xffffff:0x000000}));
  const band=new THREE.LineSegments(new THREE.BufferGeometry(),new THREE.LineBasicMaterial({color:0xd11f2f}));
  band.visible=enemy;
  const effect=new THREE.LineSegments(new THREE.BufferGeometry(),new THREE.LineBasicMaterial({color:0xffffff,transparent:true,opacity:0}));
  group.add(limbs,tool,head,eye,band,effect);
  return {group,limbs,tool,head,eye,band,effect,enemy};
 }
 private setLines(lines:THREE.LineSegments,data:Float32Array){
  const attribute=lines.geometry.getAttribute('position');
  if(attribute&&attribute.array.length===data.length){(attribute.array as Float32Array).set(data);attribute.needsUpdate=true;}
  else {lines.geometry.dispose();lines.geometry.setAttribute('position',new THREE.BufferAttribute(data,3));}
  lines.geometry.setDrawRange(0,data.length/3);
  // Dynamic poses can leave the old bounding sphere; recompute for correct culling.
  lines.geometry.computeBoundingSphere();
 }
 private buildFortress(){const g=new THREE.Group();const wallMat=new THREE.MeshBasicMaterial({color:0x444444});const edgeMat=new THREE.MeshBasicMaterial({color:0x777777});for(const side of [-1,1]){const x=side*10.2;const wall=new THREE.Mesh(new THREE.BoxGeometry(2.7,3.2,.35),wallMat);wall.position.set(x,1.35,.02);g.add(wall);for(let i=0;i<3;i++){const tower=new THREE.Mesh(new THREE.BoxGeometry(.75,4.4,.4),edgeMat);tower.position.set(side*(9.65+i*.75),2.0,.03);g.add(tower);}for(let i=0;i<5;i++){const merlon=new THREE.Mesh(new THREE.BoxGeometry(.32,.55,.42),edgeMat);merlon.position.set(side*(8.95+i*.62),4.1,.04);g.add(merlon);}const cannon=new THREE.Mesh(new THREE.BoxGeometry(1.15,.18,.22),new THREE.MeshBasicMaterial({color:0xffffff}));cannon.position.set(side*8.65,2.45,.18);cannon.rotation.z=side===1?Math.PI-Math.PI/8:-Math.PI/8;g.add(cannon);}return g;}
 private buildExplosion(){
  const g=new THREE.Group();
  const mat=(opacity:number)=>new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity,depthTest:false});
  g.add(new THREE.Mesh(new THREE.CircleGeometry(.38,24),mat(0)),
   new THREE.Mesh(new THREE.RingGeometry(.94,1,40),mat(0)),
   new THREE.Mesh(new THREE.CircleGeometry(.25,24),mat(0)));
  for(let i=0;i<12;i++)g.add(new THREE.Mesh(new THREE.BoxGeometry(.18,.035,.01),mat(0)));
  for(let i=0;i<6;i++)g.add(new THREE.Mesh(new THREE.RingGeometry(.15,.2,16),mat(0)));
  g.renderOrder=8;return g;
 }
 private drawExplosion(g:THREE.Group,e:GameRenderState['explosions'][number]){
  const t=Math.max(0,Math.min(1,e.age/e.life)),fade=1-t;
  g.visible=true;g.position.set(e.x,e.y,.3);g.scale.setScalar(e.radius);
  g.children.forEach((child,i)=>{
   const m=child as THREE.Mesh,mat=m.material as THREE.MeshBasicMaterial;
   if(i===0){mat.opacity=.8*Math.max(0,1-t*5);m.scale.setScalar(1+t*2);}
   else if(i===1){mat.opacity=.85*fade;m.scale.setScalar(.15+.85*Math.min(1,t*2.5));}
   else if(i===2){mat.opacity=.9*Math.max(0,1-t*3);m.scale.setScalar(1+t*3);}
   else if(i<15){const angle=(i-3)*Math.PI/6,dist=.15+t*(.65+(i%3)*.12);m.position.set(Math.cos(angle)*dist,Math.sin(angle)*dist-t*t*.35,0);m.rotation.z=angle;m.scale.set(1-t*.7,1,1);mat.opacity=fade*fade;}
   else{const angle=(i-15)*Math.PI/3,dist=.2+t*.48;m.position.set(Math.cos(angle)*dist,Math.sin(angle)*dist+t*.35,0);m.scale.setScalar(.7+t*1.5);mat.opacity=.35*fade;}
  });
 }
 private buildBomb(){
  const g=new THREE.Group();
  const body=new THREE.Mesh(new THREE.CircleGeometry(.18,24),new THREE.MeshBasicMaterial({color:0x252525}));
  const outline=new THREE.Mesh(new THREE.RingGeometry(.16,.185,24),new THREE.MeshBasicMaterial({color:0xffffff}));
  const detail=new THREE.LineSegments(new THREE.BufferGeometry(),new THREE.LineBasicMaterial({color:0xffffff}));
  this.setLines(detail,segmentPositions([[[ -.08,.07],[-.03,.12]],[[0,.17],[0,.25]],[[0,.25],[.08,.3]],[[.08,.3],[.06,.36]]]));
  const spark=new THREE.Mesh(new THREE.CircleGeometry(.055,8),new THREE.MeshBasicMaterial({color:0xffffff}));spark.position.set(.06,.36,.02);
  g.add(body,outline,detail,spark);return g;
 }
 private buildEnvironment(kind:EnvironmentRenderState["kind"]){
  const g=new THREE.Group();const dark=new THREE.MeshBasicMaterial({color:0x3d3d3d});const light=new THREE.MeshBasicMaterial({color:0x8a8a8a});const white=new THREE.MeshBasicMaterial({color:0xffffff});
  if(kind==="wall"){const m=new THREE.Mesh(new THREE.BoxGeometry(1,1,.22),dark);g.add(m);for(const z of [-.25,.25]){const edge=new THREE.Mesh(new THREE.BoxGeometry(.82,.05,.03),light);edge.position.y=z;g.add(edge);}}
  else if(kind==="barrel"){const body=new THREE.Mesh(new THREE.CylinderGeometry(.5,.5,1,12),dark);body.rotation.z=Math.PI/2;g.add(body);for(const x of [-.28,.28]){const ring=new THREE.Mesh(new THREE.CylinderGeometry(.53,.53,.06,12),light);ring.rotation.z=Math.PI/2;ring.position.x=x;g.add(ring);}}
  else if(kind==="box"){const body=new THREE.Mesh(new THREE.BoxGeometry(1,1,.24),dark);g.add(body);for(const rot of [Math.PI/4,-Math.PI/4]){const line=new THREE.Mesh(new THREE.BoxGeometry(.08,1.08,.03),light);line.rotation.z=rot;g.add(line);}}
  else if(kind==="rock"){const rock=new THREE.Mesh(new THREE.DodecahedronGeometry(.52,0),dark);rock.rotation.z=.25;g.add(rock);const crack=new THREE.LineSegments(new THREE.BufferGeometry(),new THREE.LineBasicMaterial({color:0x9a9a9a}));const pos=new Float32Array(18);pos.set([-.18,.18,0,.02,.02,0,.02,.02,0,-.12,-.22,0,.02,.02,0,.20,.26,0]);crack.geometry.setAttribute("position",new THREE.BufferAttribute(pos,3));g.add(crack);}
  else if(kind==="bounce"){const base=new THREE.Mesh(new THREE.BoxGeometry(1,.2,.2),dark);g.add(base);for(const x of [-.28,0,.28]){const spring=new THREE.Mesh(new THREE.BoxGeometry(.06,.36,.05),white);spring.position.set(x,.13,.02);spring.rotation.z=x*.8;g.add(spring);}}
  else if(kind==="crumble"){const slab=new THREE.Mesh(new THREE.BoxGeometry(1,.24,.2),dark);g.add(slab);const crack=new THREE.LineSegments(new THREE.BufferGeometry(),new THREE.LineBasicMaterial({color:0xffffff}));this.setLines(crack,segmentPositions([[[-.42,.08],[-.12,-.02]],[[-.12,-.02],[.03,.09]],[[.03,.09],[.18,-.08]],[[.18,-.08],[.42,.03]]]));g.add(crack);}
  else if(kind==="fan"){const ring=new THREE.Mesh(new THREE.RingGeometry(.28,.38,24),light);g.add(ring);for(let i=0;i<4;i++){const blade=new THREE.Mesh(new THREE.BoxGeometry(.36,.08,.04),white);blade.position.x=.18;blade.rotation.z=i*Math.PI/2;const pivot=new THREE.Group();pivot.rotation.z=i*Math.PI/2;pivot.add(blade);g.add(pivot);}g.add(new THREE.Mesh(new THREE.CircleGeometry(.09,16),dark));}
  else if(kind==="gravity"){g.add(new THREE.Mesh(new THREE.RingGeometry(.31,.38,28),white));g.add(new THREE.Mesh(new THREE.RingGeometry(.48,.52,30),light));g.add(new THREE.Mesh(new THREE.CircleGeometry(.13,20),dark));}
  else {const plate=new THREE.Mesh(new THREE.BoxGeometry(1,.16,.2),dark);g.add(plate);for(let i=-3;i<=3;i++){const spike=new THREE.Mesh(new THREE.ConeGeometry(.07,.28,3),white);spike.position.set(i*.17,.18,.03);g.add(spike);}}
  return g;
 }
 private makeCombatVisual(){
  const group=new THREE.Group();
  const ring=new THREE.Mesh(new THREE.RingGeometry(.78,.9,22),new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.8,depthTest:false}));
  const points:number[]=[];
  for(let i=0;i<8;i++){const a=i*Math.PI/4;points.push(Math.cos(a)*.4,Math.sin(a)*.4,0,Math.cos(a)*1.1,Math.sin(a)*1.1,0);}
  const geom=new THREE.BufferGeometry();geom.setAttribute("position",new THREE.Float32BufferAttribute(points,3));
  const sparks=new THREE.LineSegments(geom,new THREE.LineBasicMaterial({color:0xffffff,transparent:true,opacity:.8,depthTest:false}));
  group.add(ring,sparks);group.position.z=.45;
  return group;
 }
 private drawCombatCues(state:GameRenderState){
  while(this.combatVisuals.length<state.combatCues.length){const g=this.makeCombatVisual();this.combatVisuals.push(g);this.scene.add(g);}
  for(let i=0;i<this.combatVisuals.length;i++){
   const g=this.combatVisuals[i],cue=state.combatCues[i];if(!cue){g.visible=false;continue;}
   const t=Math.min(1,cue.age/cue.life),fade=(1-t)*(1-t);
   g.visible=true;g.position.set(cue.x,cue.y,.45);
   const r=cue.kind==="explosion"?1.15:cue.kind==="attack"?.22:cue.kind==="deflect"?.48:cue.kind==="block"?.44:.56;
   const size=r*cue.intensity*(.4+t*1.4);
   g.scale.set(size,size,1);
   g.rotation.z=cue.direction<0?Math.PI:0;
   const ring=g.children[0] as THREE.Mesh,sparks=g.children[1] as THREE.LineSegments;
   (ring.material as THREE.MeshBasicMaterial).opacity=(cue.kind==="attack"?.3:.75)*fade;
   (sparks.material as THREE.LineBasicMaterial).opacity=(cue.kind==="explosion"?.65:1)*fade;
   sparks.visible=cue.kind!=="attack";
  }
 }
 resize(){if(!this.contextLifecycle.canRender())return;const w=Math.max(1,this.canvas.clientWidth),h=Math.max(1,this.canvas.clientHeight),a=w/h;this.renderer.setSize(w,h,false);const vh=10;this.camera.left=-a*vh/2;this.camera.right=a*vh/2;this.camera.top=vh/2;this.camera.bottom=-vh/2;this.camera.updateProjectionMatrix();}
 render(state:GameRenderState){if(!this.contextLifecycle.canRender())return;this.fortressGroup.visible=state.arena==="fortress";if(this.environmentArena!==state.arena){for(const g of this.environmentVisuals){this.environmentGroup.remove(g);g.traverse(o=>{if(o instanceof THREE.Mesh||o instanceof THREE.LineSegments){o.geometry.dispose();if(Array.isArray(o.material))o.material.forEach(m=>m.dispose());else o.material.dispose();}});}this.environmentVisuals=[];this.environmentArena=state.arena;}this.draw(this.player,state.player);this.draw(this.opponent,state.opponent);for(let i=0;i<this.platforms.length;i++){const p=state.platforms[i],m=this.platforms[i];if(!p){m.visible=false;continue;}m.visible=true;m.material=p.surface==="ice"?this.icePlatformMaterial:p.surface==="slippery"?this.slipperyPlatformMaterial:p.surface==="oneWay"?this.oneWayPlatformMaterial:p.surface==="conveyorLeft"?this.conveyorLeftPlatformMaterial:p.surface==="conveyorRight"?this.conveyorRightPlatformMaterial:this.platformMaterial;m.position.set(p.x+p.width/2,p.y+p.height/2,-.05);m.scale.set(p.width,p.height,1);}while(this.projectiles.length<state.projectiles.length){const m=new THREE.Mesh(this.projectileGeometry,new THREE.MeshBasicMaterial({color:0xffffff}));this.projectiles.push(m);this.scene.add(m);const arrowGeometry=new THREE.BufferGeometry();arrowGeometry.setAttribute("position",new THREE.BufferAttribute(new Float32Array(36),3));const arrow=new THREE.LineSegments(arrowGeometry,new THREE.LineBasicMaterial({color:0xffffff,transparent:true,opacity:.95}));this.bowProjectiles.push(arrow);this.scene.add(arrow);const trail=new THREE.Mesh(new THREE.BoxGeometry(1,.045,.02),new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.34,depthTest:false}));this.missileTrails.push(trail);this.scene.add(trail);const flash=new THREE.Mesh(new THREE.CircleGeometry(.16,8),new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:0,depthTest:false}));this.missileFlashes.push(flash);this.scene.add(flash);const bomb=this.buildBomb();this.bombVisuals.push(bomb);this.scene.add(bomb);}while(this.environmentVisuals.length<state.environment.length){const env=state.environment[this.environmentVisuals.length];const g=this.buildEnvironment(env.kind);this.environmentVisuals.push(g);this.environmentGroup.add(g);}while(this.explosionVisuals.length<state.explosions.length){const g=this.buildExplosion();this.explosionVisuals.push(g);this.scene.add(g);}this.explosionVisuals.forEach((g,i)=>{const e=state.explosions[i];if(!e){g.visible=false;return;}this.drawExplosion(g,e);});this.environmentVisuals.forEach((g,i)=>{const e=state.environment[i];if(!e){g.visible=false;return;}g.visible=e.active;g.position.set(e.x,e.y,.02);g.rotation.z=e.rotation;const hpRatio=e.maxHp>0?Math.max(.35,e.hp/e.maxHp):1;g.scale.set(e.width*hpRatio,e.height*hpRatio,1);if(e.pulse>0)g.scale.multiplyScalar(1+Math.min(.14,e.pulse*.08));});this.projectiles.forEach((m,i)=>{const p=state.projectiles[i];m.visible=Boolean(p&&p.weapon!=="bomb");const bomb=this.bombVisuals[i];bomb.visible=Boolean(p&&p.weapon==="bomb");if(p&&p.weapon==="bomb"){bomb.position.set(p.x,p.y,.2);bomb.rotation.z=p.rotation;const warning=p.life<.55?1+Math.sin(p.age*45)*.1:1;bomb.scale.setScalar(warning);bomb.children[3].scale.setScalar(.7+.6*Math.abs(Math.sin(p.age*38)));}this.missileTrails[i].visible=Boolean(p&&p.weapon==="missile");this.missileFlashes[i].visible=false;if(this.bowProjectiles[i])this.bowProjectiles[i].visible=Boolean(p&&p.weapon==="bow");if(p){m.position.set(p.x,p.y,.1);m.rotation.z=p.rotation;const speed=Math.hypot(p.vx,p.vy);if(p.weapon==="bow"&&this.bowProjectiles[i]){const q=this.bowProjectiles[i],a=q.geometry.attributes.position.array as Float32Array,L=.56,H=.11;a.set([-L,0,0,L,0,0,L,0,0,L-H,-H*.65,0,L,0,0,L-H,H*.65,0,-L,0,0,-L+H*.9,-H,0,-L,0,0,-L+H*.9,H,0]);q.position.set(p.x,p.y,.14);q.rotation.z=p.rotation;q.geometry.attributes.position.needsUpdate=true;}m.scale.set(Math.max(1,speed/10),1,1);const size=p.weapon==="bomb"?.1:p.weapon==="boomerang"?.13:p.weapon==="bow"?.055:p.weapon==="missile"?.12:.09;m.scale.set(p.weapon==="bow"?2.8:p.weapon==="missile"?4.6:1,p.weapon==="bow"?.45:p.weapon==="missile"?.72:1,1);m.scale.multiplyScalar(size/.09);if(p.weapon==="missile"){const len=Math.max(.45,Math.min(1.6,.38+speed*.055));const nx=speed>0.01?p.vx/speed:0,ny=speed>0.01?p.vy/speed:0;const trail=this.missileTrails[i];trail.position.set(p.x-nx*(.38+len*.35),p.y-ny*(.38+len*.35),.06);trail.rotation.z=p.rotation;trail.scale.set(len,1,1);const flame=this.missileFlashes[i];flame.position.set(p.x-nx*.34,p.y-ny*.34,.08);flame.rotation.z=p.rotation;flame.scale.setScalar(.7+Math.min(1.2,speed/12));flame.visible=true;((flame.material as THREE.MeshBasicMaterial).opacity)=.55*(.72+.28*Math.sin(p.age*55));}if(p.weapon==="bomb"&&p.life<.6)m.scale.multiplyScalar(Math.floor(p.life*18)%2===0?.35:1);}});this.drawCombatCues(state);const centerX=(state.player.x+state.opponent.x)*.5;const centerY=(state.player.y+state.opponent.y)*.5;const targetCameraX=Math.max(-.9,Math.min(.9,centerX*.10));const targetCameraY=5+Math.max(-.5,Math.min(.7,(centerY-3)*.08));const baseX=this.camera.position.x-this.lastShakeX,baseY=this.camera.position.y-this.lastShakeY;this.lastShakeX=state.cameraShake.x;this.lastShakeY=state.cameraShake.y;this.camera.position.x=baseX+(targetCameraX-baseX)*.08+this.lastShakeX;this.camera.position.y=baseY+(targetCameraY-baseY)*.08+this.lastShakeY;this.renderer.render(this.scene,this.camera);}
 private draw(view:ReturnType<ThreeRenderer['fighter']>,s:DuelistRenderState){
  const pose=fighterVisual(s);
  view.group.position.set(s.x,s.y,.1);
  view.group.scale.set(s.facing*pose.scale*pose.scaleX,pose.scale*pose.scaleY,1);
  view.group.rotation.z=-s.facing*pose.lean;
  this.setLines(view.limbs,segmentPositions(pose.joints));
  view.head.position.set(pose.head[0],pose.head[1],.02);
  view.eye.position.set(pose.head[0]+.08,pose.head[1]+.04,.04);
  this.setLines(view.tool,segmentPositions(toolSegments(s)));
  view.tool.position.set(pose.hand[0],pose.hand[1],.08);
  view.tool.rotation.z=pose.toolAngle;
  if(view.enemy){
   const wave=Math.sin(s.animationTime*11)*(.04+Math.abs(s.velocityX)*.01);
   this.setLines(view.band,segmentPositions([
    [[-.24,pose.head[1]+.06],[.24,pose.head[1]+.06]],
    [[-.2,pose.head[1]+.06],[-.55,pose.head[1]+wave]],
    [[-.55,pose.head[1]+wave],[-.76,pose.head[1]-.08+wave]]
   ]));
  }
  const effect=[...telegraphSegments(s)] as import('./FighterVisual').Segment[];
  if(s.attackTime>0&&(s.weapon==='blaster'||s.weapon==='uzi')){
   const x=pose.hand[0]+(s.weapon==='uzi'?.54:.66),y=pose.hand[1];
   effect.push([[x,y],[x+.22,y+.1]],[[x,y],[x+.22,y-.1]],[[x,y],[x+.3,y]]);
  }
  if(Math.abs(s.velocityX)>9)for(const y of [-.3,0,.3])effect.push([[-.45,y],[-1.1,y]]);
  if(pose.land>0)effect.push([[-.3,-.88],[-.6-pose.land*.2,-.82]],[[.3,-.88],[.6+pose.land*.2,-.82]]);
  this.setLines(view.effect,segmentPositions(effect));
  (view.effect.material as THREE.LineBasicMaterial).opacity=effect.length?(s.attackTelegraph>0?.95:.6):0;
  view.head.scale.setScalar(1+pose.hit*.08);
 }
 dispose(){this.contextLifecycle.dispose();for(const m of this.missileTrails)this.scene.remove(m);for(const m of this.missileFlashes)this.scene.remove(m);for(const m of this.bowProjectiles)this.scene.remove(m);this.renderer.dispose();this.renderer.forceContextLoss();this.scene.traverse(o=>{if(o instanceof THREE.Mesh){o.geometry.dispose();if(Array.isArray(o.material))o.material.forEach(m=>m.dispose());else o.material.dispose();}if(o instanceof THREE.LineSegments){o.geometry.dispose();if(Array.isArray(o.material))o.material.forEach(m=>m.dispose());else o.material.dispose();}});this.scene.clear();this.projectileGeometry.dispose();this.platformMaterial.dispose();this.icePlatformMaterial.dispose();this.slipperyPlatformMaterial.dispose();this.oneWayPlatformMaterial.dispose();this.conveyorLeftPlatformMaterial.dispose();this.conveyorRightPlatformMaterial.dispose();this.environmentVisuals.forEach(g=>g.traverse(o=>{if(o instanceof THREE.Mesh){o.geometry.dispose();if(Array.isArray(o.material))o.material.forEach(m=>m.dispose());else o.material.dispose();}if(o instanceof THREE.LineSegments){o.geometry.dispose();if(Array.isArray(o.material))o.material.forEach(m=>m.dispose());else o.material.dispose();}}));}
}