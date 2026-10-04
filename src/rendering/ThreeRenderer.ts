import * as THREE from "three";
import type {Renderer} from "./Renderer";
import type {GameRenderState,DuelistRenderState} from "../gameplay/GameSession";
export class ThreeRenderer implements Renderer{
 private scene=new THREE.Scene();private camera=new THREE.OrthographicCamera(-1,1,1,-1,.1,100);private renderer:THREE.WebGLRenderer;
 private player=this.fighter(0xffffff);private opponent=this.fighter(0xffffff);private platforms:THREE.Mesh[]=[];private projectiles:THREE.Mesh[]=[];
 private projectileGeometry=new THREE.CircleGeometry(.09,10);private platformMaterial=new THREE.MeshBasicMaterial({color:0x777777});
 constructor(private readonly canvas:HTMLCanvasElement){this.renderer=new THREE.WebGLRenderer({canvas,antialias:false,alpha:false,powerPreference:"high-performance"});this.renderer.setClearColor(0,1);this.renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));this.camera.position.z=20;for(const _ of [0,1,2,3,4,5]){const m=new THREE.Mesh(new THREE.BoxGeometry(1,1,1),this.platformMaterial);this.platforms.push(m);this.scene.add(m);}this.scene.add(this.player.group,this.opponent.group);this.resize();}
 private fighter(color:number){const group=new THREE.Group();const head=new THREE.Mesh(new THREE.CircleGeometry(.24,16),new THREE.MeshBasicMaterial({color}));const geometry=new THREE.BufferGeometry();const positions=new Float32Array(20);geometry.setAttribute("position",new THREE.BufferAttribute(positions,3));const limbs=new THREE.LineSegments(geometry,new THREE.LineBasicMaterial({color}));const gun=new THREE.Mesh(new THREE.BoxGeometry(.46,.12,.08),new THREE.MeshBasicMaterial({color:0xffffff}));const weaponGeometry=new THREE.BufferGeometry();const weaponPositions=new Float32Array(24);weaponGeometry.setAttribute("position",new THREE.BufferAttribute(weaponPositions,3));const weaponLines=new THREE.LineSegments(weaponGeometry,new THREE.LineBasicMaterial({color:0xffffff}));const bomb=new THREE.Mesh(new THREE.CircleGeometry(.2,12),new THREE.MeshBasicMaterial({color:0xffffff}));group.add(head,limbs,gun,weaponLines,bomb);return{group,head,limbs,gun,positions,weaponLines,weaponPositions,bomb};}
 resize(){const w=Math.max(1,this.canvas.clientWidth),h=Math.max(1,this.canvas.clientHeight),a=w/h;this.renderer.setSize(w,h,false);const vh=10;this.camera.left=-a*vh/2;this.camera.right=a*vh/2;this.camera.top=vh/2;this.camera.bottom=-vh/2;this.camera.updateProjectionMatrix();}
 render(state:GameRenderState){this.draw(this.player,state.player);this.draw(this.opponent,state.opponent);for(let i=0;i<this.platforms.length;i++){const p=state.platforms[i],m=this.platforms[i];if(!p){m.visible=false;continue;}m.visible=true;m.position.set(p.x+p.width/2,p.y+p.height/2,-.05);m.scale.set(p.width,p.height,1);}while(this.projectiles.length<state.projectiles.length){const m=new THREE.Mesh(this.projectileGeometry,new THREE.MeshBasicMaterial({color:0xffffff}));this.projectiles.push(m);this.scene.add(m);}this.projectiles.forEach((m,i)=>{const p=state.projectiles[i];m.visible=Boolean(p);if(p)m.position.set(p.x,p.y,.1);});this.camera.position.y=2;this.renderer.render(this.scene,this.camera);}
 private draw(view:{group:THREE.Group;head:THREE.Mesh;limbs:THREE.LineSegments;gun:THREE.Mesh;positions:Float32Array;weaponLines:THREE.LineSegments;weaponPositions:Float32Array;bomb:THREE.Mesh},s:DuelistRenderState){
  const moving=Math.abs(s.velocityX)>.2;
  const speed=Math.min(1,Math.abs(s.velocityX)/8);
  const airborne=!s.grounded;
  const phase=s.animationTime*(8+speed*6);
  const step=moving&&s.grounded?Math.sin(phase)*(.22+.14*speed):0;
  const bodyBob=moving&&s.grounded?Math.abs(Math.sin(phase))*.045:0;
  const jump=Math.max(-1,Math.min(1,s.velocityY/9.2));
  const lean=airborne?-jump*.12:(moving?s.velocityX/8*.09:0);
  const landing=airborne&&Math.abs(s.velocityY)<1.5;
  view.group.position.set(s.x,s.y,0);
  view.group.scale.x=s.facing;
  view.group.rotation.z=(s.attackTime>0?s.facing*.18:0)+lean;
  view.head.position.set(0,.82+bodyBob+(airborne?Math.abs(jump)*.04:0),.02);
  view.gun.visible=s.weapon==="blaster";
  view.gun.position.set(.48,.05,.04);
  const hip=-.08-bodyBob,shoulder=.42-bodyBob;
  const values=new Float32Array(20);
  values.set([0,hip,0,shoulder]);
  if(airborne){
   const tuck=Math.min(1,Math.abs(jump));
   values.set([0,hip,-.34+tuck*.12,.48-tuck*.18],4);
   values.set([0,hip,.34-tuck*.12,.43-tuck*.12],8);
   values.set([-.22,shoulder,-.52-jump*.16,-.08-jump*.12],12);
   values.set([.22,shoulder,.52-jump*.16,.06-jump*.12],16);
  }else{
   values.set([0,hip,-.28+step,-.9],4);
   values.set([0,hip,.28-step,-.9],8);
   const arm=Math.sin(phase)*.24;
   values.set([-.22,shoulder,-.45-arm,.02],12);
   values.set([.22,shoulder,.45+arm,-.02],16);
  }
  for(let i=0;i<values.length;i++)view.positions[i]=values[i];
  view.limbs.geometry.attributes.position.needsUpdate=true;
  view.weaponLines.visible=s.weapon!=="blaster"&&s.weapon!=="bomb";
  view.bomb.visible=s.weapon==="bomb";
  view.bomb.position.set(.62,.02,.05);
  const w=view.weaponPositions;w.fill(0);
  if(s.weapon==="blade"){w.set([.22,0,0,.98,-.08,0,.98,-.08,0,1.08,.03,0]);}
  else if(s.weapon==="hammer"){w.set([.2,0,0,.78,0,0,.72,-.22,0,.98,.22,0,.98,.22,0,.98,-.22,0,.98,-.22,0,.72,-.22,0]);}
  else if(s.weapon==="boomerang"){w.set([.3,0,0,.55,-.3,0,.55,-.3,0,.82,-.02,0,.82,-.02,0,.55,.26,0,.55,.26,0,.3,0,0]);}
  else if(s.weapon==="bow"){w.set([.35,-.38,0,.82,0,0,.82,0,.35,.35,.38,0,.35,-.38,0,.35,.38,0,.35,0,0,.98,0,0]);}
  view.weaponLines.geometry.attributes.position.needsUpdate=true;
 }
 dispose(){this.renderer.dispose();this.renderer.forceContextLoss();this.scene.traverse(o=>{if(o instanceof THREE.Mesh){o.geometry.dispose();if(Array.isArray(o.material))o.material.forEach(m=>m.dispose());else o.material.dispose();}if(o instanceof THREE.LineSegments){o.geometry.dispose();if(Array.isArray(o.material))o.material.forEach(m=>m.dispose());else o.material.dispose();}});this.scene.clear();this.projectileGeometry.dispose();this.platformMaterial.dispose();}
}