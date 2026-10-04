import * as THREE from "three";
import type {Renderer} from "./Renderer";
import type {GameRenderState,DuelistRenderState} from "../gameplay/GameSession";
export class ThreeRenderer implements Renderer{
 private scene=new THREE.Scene();private camera=new THREE.OrthographicCamera(-1,1,1,-1,.1,100);private renderer:THREE.WebGLRenderer;
 private player=this.fighter(0xffffff,false);private opponent=this.fighter(0x555555,true);private platforms:THREE.Mesh[]=[];private projectiles:THREE.Mesh[]=[];
 private projectileGeometry=new THREE.CircleGeometry(.09,10);private platformMaterial=new THREE.MeshBasicMaterial({color:0x777777});
 constructor(private readonly canvas:HTMLCanvasElement){this.renderer=new THREE.WebGLRenderer({canvas,antialias:false,alpha:false,powerPreference:"high-performance"});this.renderer.setClearColor(0,1);this.renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));this.camera.position.z=20;for(const _ of [0,1,2,3,4,5]){const m=new THREE.Mesh(new THREE.BoxGeometry(1,1,1),this.platformMaterial);this.platforms.push(m);this.scene.add(m);}this.scene.add(this.player.group,this.opponent.group);this.resize();}
 private fighter(color:number,enemy:boolean){const group=new THREE.Group();const head=new THREE.Mesh(enemy?new THREE.CircleGeometry(.27,8):new THREE.CircleGeometry(.24,16),new THREE.MeshBasicMaterial({color}));const geometry=new THREE.BufferGeometry();const positions=new Float32Array(32);geometry.setAttribute("position",new THREE.BufferAttribute(positions,3));const limbs=new THREE.LineSegments(geometry,new THREE.LineBasicMaterial({color}));const gun=new THREE.Mesh(new THREE.BoxGeometry(.5,.14,.08),new THREE.MeshBasicMaterial({color:0xffffff}));const gunMagazine=new THREE.Mesh(new THREE.BoxGeometry(.12,.2,.07),new THREE.MeshBasicMaterial({color:0xffffff}));const gunDetails=new THREE.LineSegments(new THREE.BufferGeometry(),new THREE.LineBasicMaterial({color:0xffffff}));const bowDetails=new THREE.LineSegments(new THREE.BufferGeometry(),new THREE.LineBasicMaterial({color:0xffffff}));const toolDetailPositions=new Float32Array(96);const bowDetailPositions=new Float32Array(144);gunDetails.geometry.setAttribute("position",new THREE.BufferAttribute(toolDetailPositions,3));bowDetails.geometry.setAttribute("position",new THREE.BufferAttribute(bowDetailPositions,3));const bomb=new THREE.Mesh(new THREE.CircleGeometry(.2,12),new THREE.MeshBasicMaterial({color:0xffffff}));const weaponGeometry=new THREE.BufferGeometry();const weaponPositions=new Float32Array(96);weaponGeometry.setAttribute("position",new THREE.BufferAttribute(weaponPositions,3));const weaponLines=new THREE.LineSegments(weaponGeometry,new THREE.LineBasicMaterial({color:0xffffff}));const eye=new THREE.Mesh(new THREE.CircleGeometry(.035,8),new THREE.MeshBasicMaterial({color:enemy?0xffffff:0x000000}));eye.position.set(.08,.86,.04);const enemyArmor=new THREE.LineSegments(new THREE.BufferGeometry(),new THREE.LineBasicMaterial({color:0xffffff}));const headband=new THREE.Mesh(new THREE.BoxGeometry(.56,.11,.025),new THREE.MeshBasicMaterial({color:0xd11f2f,depthTest:false}));const headbandTail=new THREE.LineSegments(new THREE.BufferGeometry(),new THREE.LineBasicMaterial({color:0xd11f2f,depthTest:false,linewidth:3}));const armorPositions=new Float32Array(24);enemyArmor.geometry.setAttribute("position",new THREE.BufferAttribute(armorPositions,3));const headbandTailPositions=new Float32Array(24);headbandTail.geometry.setAttribute("position",new THREE.BufferAttribute(headbandTailPositions,3));headbandTailPositions.set([.18,.04,0,.62,-.10,0,.62,-.10,0,.92,.04,0,.92,.04,0,.78,-.18,0,.78,-.18,0,.48,-.08,0,-.48,-.04,0,-.78,-.18,0,-.78,-.18,0,-.92,.04,0,-.92,.04,0,-.62,-.10,0,-.62,-.10,0,-.18,.04,0]);headband.visible=enemy;headbandTail.visible=enemy;if(enemy){armorPositions.set([-.34,.5,0,-.18,.3,0,.18,.3,0,.34,.5,0,-.28,.22,0,-.42,.05,0,.28,.22,0,.42,.05,0]);}const torso=new THREE.LineSegments(new THREE.BufferGeometry(),new THREE.LineBasicMaterial({color}));const torsoPositions=new Float32Array(12);torso.geometry.setAttribute("position",new THREE.BufferAttribute(torsoPositions,3));torsoPositions.set([-.16,.4,0,.16,.4,0,.16,.4,0,.2,-.02,0,.2,-.02,0,-.2,-.02,0]);group.add(head,headband,headbandTail,limbs,gun,gunMagazine,gunDetails,bowDetails,weaponLines,bomb,eye,torso,enemyArmor);return{group,head,headband,headbandTail,limbs,gun,gunMagazine,gunDetails,bowDetails,toolDetailPositions,bowDetailPositions,positions,weaponLines,weaponPositions,bomb,eye,torso,torsoPositions,enemyArmor,armorPositions,headbandTailPositions};}
 resize(){const w=Math.max(1,this.canvas.clientWidth),h=Math.max(1,this.canvas.clientHeight),a=w/h;this.renderer.setSize(w,h,false);const vh=10;this.camera.left=-a*vh/2;this.camera.right=a*vh/2;this.camera.top=vh/2;this.camera.bottom=-vh/2;this.camera.updateProjectionMatrix();}
 render(state:GameRenderState){this.draw(this.player,state.player);this.draw(this.opponent,state.opponent);for(let i=0;i<this.platforms.length;i++){const p=state.platforms[i],m=this.platforms[i];if(!p){m.visible=false;continue;}m.visible=true;m.position.set(p.x+p.width/2,p.y+p.height/2,-.05);m.scale.set(p.width,p.height,1);}while(this.projectiles.length<state.projectiles.length){const m=new THREE.Mesh(this.projectileGeometry,new THREE.MeshBasicMaterial({color:0xffffff}));this.projectiles.push(m);this.scene.add(m);}this.projectiles.forEach((m,i)=>{const p=state.projectiles[i];m.visible=Boolean(p);if(p)m.position.set(p.x,p.y,.1);});this.camera.position.y=5;this.renderer.render(this.scene,this.camera);}
 private draw(view:{group:THREE.Group;head:THREE.Mesh;headband:THREE.Mesh;headbandTail:THREE.LineSegments;limbs:THREE.LineSegments;gun:THREE.Mesh;positions:Float32Array;weaponLines:THREE.LineSegments;weaponPositions:Float32Array;bomb:THREE.Mesh;eye:THREE.Mesh;torso:THREE.LineSegments;torsoPositions:Float32Array;enemyArmor:THREE.LineSegments;armorPositions:Float32Array;gunMagazine:THREE.Mesh;gunDetails:THREE.LineSegments;bowDetails:THREE.LineSegments;toolDetailPositions:Float32Array;bowDetailPositions:Float32Array},s:DuelistRenderState){
  const moving=Math.abs(s.velocityX)>.2;
  const speed=Math.min(1,Math.abs(s.velocityX)/8);
  const airborne=!s.grounded;
  const phase=s.animationTime*(7.5+speed*7);
  const cycle=Math.sin(phase);
  const cycle2=Math.sin(phase+Math.PI*.5);
  const step=moving&&s.grounded?cycle*(.28+.2*speed):0;
  const stepWide=moving&&s.grounded?cycle2*(.08+.08*speed):0;
  const bodyBob=moving&&s.grounded?(Math.abs(cycle)*.055+Math.max(0,cycle2)*.025*speed):0;
  const jump=Math.max(-1,Math.min(1,s.velocityY/9.2));
  const rising=airborne&&s.velocityY>.8;
  const falling=airborne&&s.velocityY<-.8;
  const landingPose=airborne&&falling?Math.min(1,Math.abs(s.velocityY)/12):0;
  const lean=airborne?-jump*.16:(moving?s.velocityX/8*(.08+.05*speed):0);
  const attackProgress=s.attackTime>0?1-s.attackTime/.14:0;
  const attackSnap=s.attackTime>0?Math.sin(Math.min(1,attackProgress)*Math.PI):0;
  const attackPrep=s.attackTime>0?Math.max(0,1-attackProgress*3):0;
  view.group.position.set(s.x,s.y,0);
  view.group.scale.x=s.facing;
  view.group.rotation.z=(s.attackTime>0?s.facing*(.12+attackSnap*.12):0)+lean;
  view.head.position.set(0,.82+bodyBob+(airborne?Math.abs(jump)*.05:0),.02);view.head.rotation.z=cycle*.025+(rising?.04:0)-(falling?.06:0);view.headband.visible=view===this.opponent;view.headband.position.set(0,.91+bodyBob+(airborne?Math.abs(jump)*.05:0),.15);view.headband.rotation.z=view.head.rotation.z;view.headbandTail.visible=view===this.opponent;view.headbandTail.position.set(0,.91+bodyBob+(airborne?Math.abs(jump)*.05:0),.14);view.headbandTail.rotation.z=view.head.rotation.z;
  view.eye.position.set(.08,.86+bodyBob+(airborne?Math.abs(jump)*.05:0),.04);
  view.head.rotation.z=cycle*.025+(rising?.04:0)-(falling?.06:0);
  view.eye.rotation.z=view.head.rotation.z;view.enemyArmor.visible=view===this.opponent;view.enemyArmor.position.set(0,bodyBob,0);view.torso.rotation.z=-lean*.5;
  view.gun.visible=s.weapon==="blaster"||s.weapon==="uzi";
  view.gun.position.set(s.weapon==="uzi"?.48:.5,.08,.04);
  view.gun.rotation.z=lean*.35-(s.attackTime>0?attackSnap*.08:0);
  view.gunMagazine.visible=s.weapon==="blaster"||s.weapon==="uzi";
  view.gunMagazine.position.set(.38,-.08,.035);
  view.gunMagazine.rotation.z=-.18;
  view.gunDetails.visible=s.weapon==="blaster"||s.weapon==="uzi";
  view.bowDetails.visible=s.weapon==="bow";
  view.gunDetails.position.set(s.weapon==="uzi"?.48:.5,.08,.045);
  view.bowDetails.position.set(.22,.02,.045);
  const td=view.toolDetailPositions;td.fill(0);
  const bd=view.bowDetailPositions;bd.fill(0);
  if(s.weapon==="blaster"){
   td.set([-.30,.02,0,.30,.02,0,-.22,.02,0,-.22,.14,0,.12,.14,0,.12,.02,0,.12,.14,0,.26,.14,0,.26,.02,0,.26,.14,0,.34,.10,0,.34,.02,0,.40,.02,0,.40,.12,0,.34,.12,0,.34,.02,0,.08,-.16,0,.18,-.16,0,.18,.02,0,.08,.02,0,.08,-.16,0,.18,-.16,0,.12,-.25,0,.22,-.25,0,.22,-.16,0,.12,-.16,0,.12,-.25,0,.22,-.25,0,.22,-.16,0,.36,-.02,0,.64,-.02,0,.64,.07,0,.36,.07,0,.36,-.02,0,.64,-.02,0,.64,.07,0,.36,.07,0,.36,-.02,0,.72,.00,0,1.02,.00,0,1.02,.06,0,.72,.06,0,.72,.00,0,1.02,.00,0,1.02,.06,0,.72,.06,0]);
  }else if(s.weapon==="uzi"){
   td.set([-.28,.00,0,.28,.00,0,-.25,.00,0,-.25,.16,0,.18,.16,0,.18,.00,0,.18,.16,0,.28,.16,0,.28,.00,0,.34,.12,0,.48,.12,0,.48,.02,0,.34,.02,0,.34,.12,0,.48,.12,0,.48,.02,0,.34,.02,0,.05,-.18,0,.18,-.18,0,.20,.02,0,.05,.02,0,.05,-.18,0,.18,-.18,0,.18,-.02,0,.28,-.02,0,.28,-.18,0,.18,-.18,0,.18,-.02,0,.28,-.02,0,.28,-.18,0,.18,-.18,0,.18,-.02,0,.28,-.02,0,.28,-.18,0,.12,-.28,0,.28,-.28,0,.28,-.20,0,.12,-.20,0,.12,-.28,0,.28,-.28,0,.28,-.20,0,.12,-.20,0,.48,.03,0,.62,.03,0,.62,.11,0,.48,.11,0,.48,.03,0,.62,.03,0,.62,.11,0,.48,.11,0]);
  }else if(s.weapon==="bow"){
   // Bow limbs, reinforced riser, grip, upper/lower string anchors, taut string, arrow shaft, nock and fletching.
   bd.set([
    .02,-.42,0,.12,-.34,0,
    .12,-.34,0,.21,-.22,0,
    .21,-.22,0,.27,-.08,0,
    .27,-.08,0,.25,.06,0,
    .25,.06,0,.18,.20,0,
    .18,.20,0,.08,.30,0,
    .08,.30,0,.02,.34,0,
    .02,.34,0,-.03,.28,0,
    -.03,.28,0,.05,.18,0,
    .05,.18,0,.10,.06,0,
    .10,.06,0,.10,-.08,0,
    .10,-.08,0,.06,-.20,0,
    .06,-.20,0,.02,-.30,0,
    .02,-.30,0,.02,-.42,0,
    .02,-.42,0,.10,-.42,0,
    .10,-.42,0,.10,.34,0,
    .10,.34,0,.02,.34,0,
    .10,-.02,0,.25,-.02,0,
    .25,-.02,0,.25,.07,0,
    .25,.07,0,.10,.07,0,
    .10,.07,0,.10,-.02,0,
    .02,.02,0,.82,.02,0,
    .82,.02,0,.90,.07,0,
    .82,.02,0,.90,-.03,0,
    .15,.02,0,.20,.08,0,
    .20,.08,0,.27,.02,0,
    .20,.08,0,.24,.14,0,
    .20,.08,0,.24,.02,0,
    .20,.08,0,.24,.00,0,
    .20,.08,0,.24,.06,0
   ]);
  }
  view.gunDetails.geometry.attributes.position.needsUpdate=true;view.bowDetails.geometry.attributes.position.needsUpdate=true;
  const hip=-.08-bodyBob,shoulder=.42-bodyBob;
  const values=new Float32Array(32);
  values.set([0,hip,0,shoulder]);
  if(airborne){
   const tuck=Math.min(1,Math.abs(jump));
   const kneeBend=.34-tuck*.12+landingPose*.12;
   const kneeLift=.48-tuck*.18+landingPose*.08;
   values.set([0,hip,-kneeBend,kneeLift],4);
   values.set([0,hip,kneeBend,-kneeLift],8);
   const airArm=cycle*.09+jump*.08;
   values.set([-.22,shoulder,-.58-airArm,-.08-jump*.16],12);
   values.set([.22,shoulder,.58-airArm,.06-jump*.16],16);
  }else{
   const stride=step;
   const kneeA=-.9+Math.max(0,stride)*.28+stepWide;
   const kneeB=-.9+Math.max(0,-stride)*.28-stepWide;
   const ankleA=-.28+stride+stepWide;
   const ankleB=.28-stride-stepWide;
   values.set([0,hip,ankleA,kneeA],4);
   values.set([0,hip,ankleB,kneeB],8);
   const armSwing=cycle*(.22+.16*speed);
   const armLift=cycle2*(.06+.05*speed);
   const guard=s.weapon==="hammer"||s.weapon==="blade";
   const leftHandX=-.45-armSwing;
   const rightHandX=.45+armSwing;
   const leftHandY=.02+armLift+(guard?.05:0);
   const rightHandY=-.02-armLift+(guard?.05:0);
   values.set([-.22,shoulder,leftHandX,leftHandY],12);
   values.set([.22,shoulder,rightHandX,rightHandY],16);
   if(attackPrep>0){
    values[14]-=attackPrep*.16;
    values[17]+=attackPrep*.16;
   }
   if(attackSnap>0){
    values[13]-=attackSnap*.12;
    values[17]+=attackSnap*.12;
   }
   if(s.weapon==="blade"){
    const v=s.attackVariant;
    if(v===1){ values[18]=.20+(attackSnap*.78); values[19]=.34-(attackSnap*.42); }
    else if(v===2){ values[18]=.12+(attackSnap*.78); values[19]=.34-(attackSnap*.12); }
    else if(v===3){ values[18]=-.02+(attackSnap*.98); values[19]=.12+(attackSnap*.02); }
    else { values[18]=.05+(attackSnap*.82); values[19]=-.18+(attackSnap*.20); }
    if(attackPrep>0){ values[18]-=attackPrep*.16; values[19]+=attackPrep*(v===1?.28:v===3?.02:-.16); }
   }
  }
  for(let i=0;i<values.length;i++)view.positions[i]=values[i];
  view.limbs.geometry.attributes.position.needsUpdate=true;
  view.weaponLines.visible=s.weapon!=="blaster"&&s.weapon!=="uzi"&&s.weapon!=="bomb";view.weaponLines.rotation.z=0;view.weaponLines.position.set(0,0,0);view.gun.rotation.z=0;
  view.bomb.visible=s.weapon==="bomb";
  view.bomb.position.set(.62-(s.weapon==="bomb"?attackSnap*.08:0),.02,.05);view.bomb.scale.setScalar(1+(s.weapon==="bomb"?Math.sin(s.animationTime*14)*.12+attackSnap*.2:0));
  const w=view.weaponPositions;w.fill(0);
  if(s.weapon==="blade"){
   const v=s.attackVariant;
   const handX=view.positions[18],handY=view.positions[19];
   view.weaponLines.position.set(handX,handY,.08);
   let a=-.25;
   if(v===1)a=-1.15+attackSnap*2.25;
   else if(v===2)a=.65-attackSnap*1.85;
   else if(v===3)a=.02-attackSnap*.18;
   else a=1.05-attackSnap*2.15;
   view.weaponLines.rotation.z=a;
   w.set([
    -.06,-.07,0,.06,-.07,0,.06,-.07,0,.10,-.18,0,.10,-.18,0,.16,-.18,0,
    .16,-.18,0,.16,.18,0,.16,.18,0,.10,.18,0,.10,.18,0,.06,.07,0,
    .06,.07,0,-.06,.07,0,-.06,.07,0,-.06,-.07,0,
    .16,.18,0,.98,.10,0,.98,.10,0,1.14,0,0,1.14,0,0,.98,-.10,0,
    .98,-.10,0,.16,-.18,0,.30,.10,0,.82,.04,0,.82,.04,0,1.00,0,0,
    .30,-.10,0,.82,-.04,0,.82,-.04,0,1.00,0
   ]);
  }
  else if(s.weapon==="hammer"){view.weaponLines.rotation.z=-.65+attackSnap*1.9;w.set([.2,0,0,.78,0,0,.72,-.22,0,.98,.22,0,.98,.22,0,.98,-.22,0,.98,-.22,0,.72,-.22,0]);}
  else if(s.weapon==="boomerang"){view.weaponLines.rotation.z=s.animationTime*9+(s.attackTime>0?attackSnap*1.5:0);w.set([.3,0,0,.55,-.3,0,.55,-.3,0,.82,-.02,0,.82,-.02,0,.55,.26,0,.55,.26,0,.3,0,0]);}
  else if(s.weapon==="bow"){view.weaponLines.rotation.z=-.12+attackSnap*.28;w.set([.35,-.38,0,.82,0,0,.82,0,.35,.35,.38,0,.35,-.38,0,.35,.38,0,.35,0,0,.98,0,0]);view.weaponLines.visible=true;}
  view.weaponLines.geometry.attributes.position.needsUpdate=true;
  const flash=view.gunDetails;
  flash.scale.set(s.attackTime>0?1.12:1, s.attackTime>0?1.12:1, 1);view.torsoPositions.set([-.16,.4,0,.16,.4,0,.16,.4,0,.2,-.02,0,.2,-.02,0,-.2,-.02,0]);view.torso.geometry.attributes.position.needsUpdate=true;view.enemyArmor.geometry.attributes.position.needsUpdate=true;
 }
 dispose(){this.renderer.dispose();this.renderer.forceContextLoss();this.scene.traverse(o=>{if(o instanceof THREE.Mesh){o.geometry.dispose();if(Array.isArray(o.material))o.material.forEach(m=>m.dispose());else o.material.dispose();}if(o instanceof THREE.LineSegments){o.geometry.dispose();if(Array.isArray(o.material))o.material.forEach(m=>m.dispose());else o.material.dispose();}});this.scene.clear();this.projectileGeometry.dispose();this.platformMaterial.dispose();}
}