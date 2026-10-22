import {weaponDrawPose,fighterVisual,fighterInkPalette,FIGHTER_INK_WIDTH,capsulePositions,characterMarkings,characterSkinLayers,fighterOutfit,weaponAccentColor,weaponAccentSegments,weaponStyleLayers,weaponBaseInk,toolSegments,segmentPositions,telegraphSegments,kickEffectSegments,slamEffectSegments,grabEffectSegments,type Segment} from './FighterVisual';
import * as THREE from "three";
// Public SVGs work under GitHub Pages, Android's relative base and test data URLs.
const GRAPPLE_ASSET_BASE=(import.meta as ImportMeta & {env?:{BASE_URL?:string}}).env?.BASE_URL??"/";
const GRAPPLE_GUN_URL=GRAPPLE_ASSET_BASE+"weapons/grapple_gun_sprite.svg";
const GRAPPLE_FLIGHT_URL=GRAPPLE_ASSET_BASE+"weapons/grapple_hook_flight.svg";
const GRAPPLE_OPEN_URL=GRAPPLE_ASSET_BASE+"weapons/grapple_hook_open.svg";
import {getArenaTheme,paintArenaBackdrop,platformColors,svgBackdropRevision} from "../themes/ArenaThemes";
import {getDownloadedImage} from "../gameplay/DownloadableArenas.js";
import type {Renderer} from "./Renderer";
import type {GameRenderState,DuelistRenderState,EnvironmentRenderState} from "../gameplay/GameSession";
import {WebGLContextLifecycle} from "./WebGLContextLifecycle";
import {PlatformInkCache,platformInkReaction,type PlatformInkStroke} from "./PlatformDecorations.js";
import {combatCameraFrame,type CombatCameraFrame} from "./CombatCamera.js";
export class ThreeRenderer implements Renderer{
 private platformInk=new PlatformInkCache();private platformInkGroups:THREE.Group[]=[];private platformInkKeys:string[]=[];private platformInkActive:boolean[]=[];private platformInkLayers:Array<Array<{line:THREE.LineSegments;strokes:readonly PlatformInkStroke[];positions:Float32Array}>>=[];
 private scene=new THREE.Scene();private camera=new THREE.OrthographicCamera(-1,1,1,-1,.1,100);private renderer:THREE.WebGLRenderer;private contextLifecycle:WebGLContextLifecycle;
 private readonly grappleTextures=(()=>{
  const loader=new THREE.TextureLoader();
  const gun=loader.load(GRAPPLE_GUN_URL),flight=loader.load(GRAPPLE_FLIGHT_URL),open=loader.load(GRAPPLE_OPEN_URL);
  for(const tex of [gun,flight,open])tex.colorSpace=THREE.SRGBColorSpace;
  return {gun,flight,open};
 })();
 private readonly grappleLines:THREE.Line[]=[];
 private readonly grappleHooks:THREE.Mesh[]=[];
 private player=this.fighter(0xffffff,false);private opponent=this.fighter(0x555555,true);private platforms:THREE.Mesh[]=[];private platformEdges:THREE.Mesh[]=[];private themeArena:GameRenderState["arena"]|null=null;private themeBackgroundImage:HTMLImageElement|undefined;private themeArtRevision=-1;private themeTexture:THREE.CanvasTexture|null=null;private projectiles:THREE.Mesh[]=[];private missileTrails:THREE.Mesh[]=[];private missileFlashes:THREE.Mesh[]=[];
 private projectileGeometry=new THREE.CircleGeometry(.09,10);private bowProjectiles:THREE.LineSegments[]=[];private explosionVisuals:THREE.Group[]=[];private combatVisuals:THREE.Group[]=[];private cameraFrame:CombatCameraFrame|null=null;private framedArena:GameRenderState["arena"]|null=null;private bombVisuals:THREE.Group[]=[];private boomerangIcons:THREE.Group[]=[];private missileIcons:THREE.Group[]=[];private spearIcons:THREE.Group[]=[];private platformMaterial=new THREE.MeshBasicMaterial({color:0x777777});private icePlatformMaterial=new THREE.MeshBasicMaterial({color:0x9a9a9a});private slipperyPlatformMaterial=new THREE.MeshBasicMaterial({color:0x858585});private oneWayPlatformMaterial=new THREE.MeshBasicMaterial({color:0x6f6f6f});private conveyorLeftPlatformMaterial=new THREE.MeshBasicMaterial({color:0x5a5a5a});private conveyorRightPlatformMaterial=new THREE.MeshBasicMaterial({color:0xaaaaaa});private environmentGroup=new THREE.Group();private environmentVisuals:THREE.Group[]=[];private debrisVisuals:THREE.Mesh[]=[];private environmentArena:GameRenderState["arena"]|null=null;private fortressGroup:THREE.Group;
 constructor(private readonly canvas:HTMLCanvasElement,private readonly animateDecorations=true){this.fortressGroup=this.buildFortress();this.renderer=new THREE.WebGLRenderer({canvas,antialias:false,alpha:false,powerPreference:"high-performance"});this.contextLifecycle=new WebGLContextLifecycle(canvas,()=>this.resize());this.renderer.setClearColor(0,1);this.renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));this.camera.position.z=20;for(const _ of [0,1,2,3,4,5,6,7]){const m=new THREE.Mesh(new THREE.BoxGeometry(1,1,1),this.platformMaterial);this.platforms.push(m);this.scene.add(m);const edge=new THREE.Mesh(new THREE.BoxGeometry(1,1,.02),new THREE.MeshBasicMaterial({color:0xffffff}));this.platformEdges.push(edge);this.scene.add(edge);}this.scene.add(this.player.group,this.opponent.group,this.fortressGroup,this.environmentGroup);
  for(let i=0;i<2;i++){
   const ropeGeometry=new THREE.BufferGeometry();
   ropeGeometry.setAttribute("position",new THREE.BufferAttribute(new Float32Array(6),3));
   const rope=new THREE.Line(ropeGeometry,new THREE.LineBasicMaterial({color:0xf8f6f0,depthTest:false,transparent:true,opacity:.97}));
   rope.visible=false;rope.frustumCulled=false;rope.renderOrder=20;
   const hook=new THREE.Mesh(new THREE.PlaneGeometry(.48,.34),new THREE.MeshBasicMaterial({map:this.grappleTextures.flight,transparent:true,depthTest:false,side:THREE.DoubleSide}));
   hook.visible=false;hook.frustumCulled=false;hook.renderOrder=21;
   this.grappleLines.push(rope);this.grappleHooks.push(hook);this.scene.add(rope,hook);
  }
  this.resize();}
 private fighter(_color:number,enemy:boolean){
  const group=new THREE.Group(),ink=fighterInkPalette(enemy),width=FIGHTER_INK_WIDTH;
  // Solid meshes replace legacy one-pixel GL line geometry entirely.
  const stroke=(hex:string,z:number)=>{
   const m=new THREE.Mesh(new THREE.BufferGeometry(),new THREE.MeshBasicMaterial({color:hex,side:THREE.DoubleSide}));
   m.position.z=z;return m;
  };
  const bodyHalo=stroke(ink.halo,.005),bodyOutline=stroke(ink.outline,.009),bodyCore=stroke(ink.core,.013);
  const vestOutline=stroke(ink.outline,.014),vestCore=stroke(ink.suit,.015);
  const gearOutline=stroke(ink.outline,.016),gearCore=stroke(ink.armor,.017);
  const costumeOutline=stroke(ink.outline,.019),costumeCore=stroke(ink.core,.023);
  const trim=stroke(ink.trim,.025);
  const headCircle=(radius:number,hex:string,z:number)=>{
   const m=new THREE.Mesh(new THREE.CircleGeometry(radius,28),new THREE.MeshBasicMaterial({color:hex}));
   m.position.z=z;return m;
  };
  const headHalo=headCircle(width.head.halo,ink.halo,.028);
  const headOutline=headCircle(width.head.outline,ink.outline,.032);
  const head=headCircle(width.head.core,ink.face,.036);
  const hairOutline=stroke(ink.outline,.038),hairCore=stroke(ink.hair,.04);
  const markingOutline=stroke(ink.outline,.042),markingCore=stroke(ink.accent,.046);
  const skinMeshes=Array.from({length:14},(_,i)=>stroke("#ffffff",.049+i*.0009));
  const otherEye=headCircle(width.eye*.78,ink.eye,.052);
  const otherEyeGlint=headCircle(width.eye*.20,"#ffffff",.056);
  const eye=headCircle(width.eye,ink.eye,.052);
  const eyeGlint=headCircle(width.eye*.26,"#ffffff",.056);
  const toolOutline=stroke(ink.outline,.068),toolCore=stroke(ink.metal,.072);
   const styleMeshes=[stroke("#ffffff",.073),stroke("#ffffff",.074),stroke("#ffffff",.075),stroke("#ffffff",.076)];
   const weaponAccent=stroke("#65e6ff",.079);
  const grappleGun=new THREE.Mesh(new THREE.PlaneGeometry(1.05,.537),
   new THREE.MeshBasicMaterial({map:this.grappleTextures?.gun??null,transparent:true,depthTest:false,side:THREE.DoubleSide}));
  grappleGun.visible=false;grappleGun.renderOrder=19;
  const effect=new THREE.LineSegments(new THREE.BufferGeometry(),new THREE.LineBasicMaterial({color:0xffffff,transparent:true,opacity:0}));
  effect.position.z=.082;
  group.add(bodyHalo,bodyOutline,bodyCore,vestOutline,vestCore,gearOutline,gearCore,
   costumeOutline,costumeCore,trim,headHalo,headOutline,head,hairOutline,hairCore,
   markingOutline,markingCore,...skinMeshes,otherEye,otherEyeGlint,eye,eyeGlint,
   toolOutline,toolCore,...styleMeshes,weaponAccent,effect,grappleGun);
  return {group,head,headHalo,headOutline,eye,eyeGlint,otherEye,otherEyeGlint,effect,
   bodyHalo,bodyOutline,bodyCore,vestOutline,vestCore,gearOutline,gearCore,trim,
   costumeOutline,costumeCore,hairOutline,hairCore,markingOutline,markingCore,skinMeshes,toolOutline,toolCore,styleMeshes,weaponAccent,grappleGun,enemy};
 }
 private setCapsules(mesh:THREE.Mesh,segments:readonly Segment[],width:number){
  const old=mesh.geometry.getAttribute("position") as THREE.BufferAttribute|undefined;
  const data=capsulePositions(segments,width,old?.array as Float32Array|undefined);
  if(old&&old.array===data){
   old.needsUpdate=true;
  }else{
   mesh.geometry.dispose();
   const geometry=new THREE.BufferGeometry();
   geometry.setAttribute("position",new THREE.BufferAttribute(data,3));
   mesh.geometry=geometry;
  }
  mesh.visible=data.length>0;
  if(data.length)mesh.geometry.computeBoundingSphere();
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
 private buildProjectileIcon(kind:"boomerang"|"missile"|"spear"){
  // Shared low-polygon mobile-friendly shapes; allocate once per projectile slot.
  const group=new THREE.Group();
  const polygon=(pts:readonly (readonly [number,number])[],color:number,z:number)=>{
   const shape=new THREE.Shape();pts.forEach(([x,y],i)=>i?shape.lineTo(x,y):shape.moveTo(x,y));
   shape.closePath();
   const mesh=new THREE.Mesh(new THREE.ShapeGeometry(shape),new THREE.MeshBasicMaterial({color,side:THREE.DoubleSide}));
   mesh.position.z=z;group.add(mesh);
  };
  if(kind==="boomerang"){
   polygon([[-.36,-.23],[-.12,.15],[0,.20],[.10,.12],[.42,-.23],[.34,-.30],[0,-.035],[-.29,-.30]],0x202b3b,0);
   polygon([[-.34,-.22],[-.115,.13],[-.05,.15],[-.27,-.25]],0x249fff,.008);
   polygon([[.08,.10],[.40,-.23],[.34,-.26],[.03,.055]],0x249fff,.009);
  }else if(kind==="spear"){
   // Reusable minimal, low-polygon spear, all colors from the approved reference.
   polygon([[-.54,-.045],[.42,-.045],[.42,.045],[-.54,.045]],0x553a31,0);
   polygon([[-.54,-.05],[-.28,-.05],[-.28,.05],[-.54,.05]],0x1858bf,.007);
   polygon([[-.57,-.065],[-.51,-.065],[-.51,.065],[-.57,.065]],0xf6bf35,.009);
   polygon([[-.30,-.065],[-.24,-.065],[-.24,.065],[-.30,.065]],0xf6bf35,.009);
   polygon([[.39,-.08],[.46,-.08],[.46,.08],[.39,.08]],0xf6bf35,.009);
   polygon([[.46,-.11],[.67,-.18],[1.05,0],[.67,.18],[.46,.11]],0xd1dae3,.01);
   polygon([[.60,-.035],[.97,0],[.60,.014]],0xf7fbff,.014);
  }else{
   polygon([[-.28,-.09],[.26,-.09],[.26,.09],[-.28,.09]],0xf0f5f8,0);
   polygon([[.26,-.10],[.49,0],[.26,.10]],0xef4040,.01);
   polygon([[-.20,-.09],[-.30,-.23],[-.02,-.09]],0xdc3442,.008);
   polygon([[-.20,.09],[-.30,.23],[-.02,.09]],0xdc3442,.008);
   polygon([[-.28,-.065],[-.44,0],[-.28,.065]],0xffc430,.012);
  }
  return group;
 }
 private buildBomb(){
  const g=new THREE.Group();
  const body=new THREE.Mesh(new THREE.CircleGeometry(.18,24),new THREE.MeshBasicMaterial({color:0x252a33}));
  const outline=new THREE.Mesh(new THREE.RingGeometry(.16,.185,24),new THREE.MeshBasicMaterial({color:0x141b26}));
  const detail=new THREE.LineSegments(new THREE.BufferGeometry(),new THREE.LineBasicMaterial({color:0x96a6b5}));
  this.setLines(detail,segmentPositions([[[ -.08,.07],[-.03,.12]],[[0,.17],[0,.25]],[[0,.25],[.08,.3]],[[.08,.3],[.06,.36]]]));
  const spark=new THREE.Mesh(new THREE.CircleGeometry(.055,8),new THREE.MeshBasicMaterial({color:0xff9a3d}));spark.position.set(.06,.36,.02);
  g.add(body,outline,detail,spark);return g;
 }
 private buildEnvironment(kind:EnvironmentRenderState["kind"]){
  const g=new THREE.Group();const dark=new THREE.MeshBasicMaterial({color:0x3d3d3d});const light=new THREE.MeshBasicMaterial({color:0x8a8a8a});const white=new THREE.MeshBasicMaterial({color:0xffffff});
  if(kind==="wall"){const m=new THREE.Mesh(new THREE.BoxGeometry(1,1,.22),dark);g.add(m);for(const z of [-.25,.25]){const edge=new THREE.Mesh(new THREE.BoxGeometry(.82,.05,.03),light);edge.position.y=z;g.add(edge);}}
  else if(kind==="barrel"){const body=new THREE.Mesh(new THREE.CylinderGeometry(.5,.5,1,12),dark);body.rotation.z=Math.PI/2;g.add(body);for(const x of [-.28,.28]){const ring=new THREE.Mesh(new THREE.CylinderGeometry(.53,.53,.06,12),light);ring.rotation.z=Math.PI/2;ring.position.x=x;g.add(ring);}}
  else if(kind==="box"){const body=new THREE.Mesh(new THREE.BoxGeometry(1,1,.24),dark);g.add(body);for(const rot of [Math.PI/4,-Math.PI/4]){const line=new THREE.Mesh(new THREE.BoxGeometry(.08,1.08,.03),light);line.rotation.z=rot;g.add(line);}}
  else if(kind==="rock"||kind==="fallingRock"){const rock=new THREE.Mesh(new THREE.DodecahedronGeometry(.52,0),dark);rock.rotation.z=.25;g.add(rock);const crack=new THREE.LineSegments(new THREE.BufferGeometry(),new THREE.LineBasicMaterial({color:0x9a9a9a}));const pos=new Float32Array(18);pos.set([-.18,.18,0,.02,.02,0,.02,.02,0,-.12,-.22,0,.02,.02,0,.20,.26,0]);crack.geometry.setAttribute("position",new THREE.BufferAttribute(pos,3));g.add(crack);}
  else if(kind==="vent"){const plate=new THREE.Mesh(new THREE.BoxGeometry(1,.18,.2),dark);g.add(plate);for(const x of [-.3,0,.3]){const vent=new THREE.Mesh(new THREE.BoxGeometry(.08,.3,.03),light);vent.position.set(x,-.04,.04);g.add(vent);}}
  else if(kind==="bounce"){const base=new THREE.Mesh(new THREE.BoxGeometry(1,.2,.2),dark);g.add(base);for(const x of [-.28,0,.28]){const spring=new THREE.Mesh(new THREE.BoxGeometry(.06,.36,.05),white);spring.position.set(x,.13,.02);spring.rotation.z=x*.8;g.add(spring);}}
  else if(kind==="crumble"){const slab=new THREE.Mesh(new THREE.BoxGeometry(1,.24,.2),dark);g.add(slab);const crack=new THREE.LineSegments(new THREE.BufferGeometry(),new THREE.LineBasicMaterial({color:0xffffff}));this.setLines(crack,segmentPositions([[[-.42,.08],[-.12,-.02]],[[-.12,-.02],[.03,.09]],[[.03,.09],[.18,-.08]],[[.18,-.08],[.42,.03]]]));g.add(crack);}
  else if(kind==="fan"){const ring=new THREE.Mesh(new THREE.RingGeometry(.28,.38,24),light);g.add(ring);for(let i=0;i<4;i++){const blade=new THREE.Mesh(new THREE.BoxGeometry(.36,.08,.04),white);blade.position.x=.18;blade.rotation.z=i*Math.PI/2;const pivot=new THREE.Group();pivot.rotation.z=i*Math.PI/2;pivot.add(blade);g.add(pivot);}g.add(new THREE.Mesh(new THREE.CircleGeometry(.09,16),dark));}
  else if(kind==="gravity"){g.add(new THREE.Mesh(new THREE.RingGeometry(.31,.38,28),white));g.add(new THREE.Mesh(new THREE.RingGeometry(.48,.52,30),light));g.add(new THREE.Mesh(new THREE.CircleGeometry(.13,20),dark));}
  else {const plate=new THREE.Mesh(new THREE.BoxGeometry(1,.16,.2),dark);g.add(plate);for(let i=-3;i<=3;i++){const spike=new THREE.Mesh(new THREE.ConeGeometry(.07,.28,3),white);spike.position.set(i*.17,.18,.03);g.add(spike);}}
  const indicator=new THREE.Group();
  const rim=new THREE.Mesh(new THREE.RingGeometry(.47,.55,24),new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.75,depthTest:false}));
  rim.position.z=.45;indicator.add(rim);
  if(kind==="fallingRock"){
   const beam=new THREE.Mesh(new THREE.BoxGeometry(.037,5.6,.02),new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.55,depthTest:false}));
   beam.position.set(0,-2.85,.4);indicator.add(beam);
  }
  if(kind==="vent"){
   for(const x of [-.30,0,.30]){
    const plume=new THREE.Mesh(new THREE.ConeGeometry(.12,.72,3),new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.65,depthTest:false}));
    plume.position.set(x,.46,.3);indicator.add(plume);
   }
  }
  indicator.visible=false;g.add(indicator);g.userData.warning=indicator;
  return g;
 }
 private drawPlatformInk(state:GameRenderState,p:GameRenderState["platforms"][number],index:number){
  const art=this.platformInk.get(state.arena,p,index),theme=getArenaTheme(state.arena),palette=platformColors(theme,p.surface);
  if(this.platformInkKeys[index]!==art.key){
   const old=this.platformInkGroups[index];
   if(old){this.scene.remove(old);old.traverse(o=>{if(o instanceof THREE.LineSegments){o.geometry.dispose();(o.material as THREE.Material).dispose();}});}
   const group=new THREE.Group(),layers:Array<{line:THREE.LineSegments;strokes:readonly PlatformInkStroke[];positions:Float32Array}>=[];
   for(const tone of ["edge","detail","accent"] as const){
    const strokes=art.strokes.filter(mark=>mark.tone===tone);
    if(!strokes.length)continue;
    const positions=new Float32Array(strokes.length*6);
    strokes.forEach((mark,i)=>{const at=i*6;positions[at]=mark.x1;positions[at+1]=mark.y1;positions[at+3]=mark.x2;positions[at+4]=mark.y2;});
    const geometry=new THREE.BufferGeometry();
    geometry.setAttribute("position",new THREE.BufferAttribute(positions,3));
    geometry.computeBoundingSphere();
    const color=tone==="accent"?(art.material==="earth"?theme.secondary:art.material==="frost"?"#e2f8ff":palette.edge):palette.edge;
    const material=new THREE.LineBasicMaterial({color,transparent:true,opacity:tone==="edge"?.87:tone==="detail"?.55:.75});
    const line=new THREE.LineSegments(geometry,material);
    group.add(line);layers.push({line,strokes,positions});
   }
   this.platformInkGroups[index]=group;this.platformInkKeys[index]=art.key;
   this.platformInkLayers[index]=layers;this.platformInkActive[index]=false;
   this.scene.add(group);
  }
  const group=this.platformInkGroups[index];
  group.visible=true;
  // Local-space marks follow a moving platform without re-seeding or allocations.
  group.position.set(p.x,p.y,.065);
  const active=this.animateDecorations&&(
   state.player.landingTime>0||state.opponent.landingTime>0||
   state.combatCues.some(c=>c.kind==="hit"||c.kind==="slam"||c.kind==="explosion"||c.kind==="throw")
  );
  if(!active&&!this.platformInkActive[index])return;
  this.platformInkActive[index]=active;
  for(const layer of this.platformInkLayers[index]){
   layer.strokes.forEach((mark,j)=>{
    if(mark.motion==="none")return;
    const offset=platformInkReaction(mark,p,state,this.animateDecorations);
    const dx=mark.motion==="pebble"?offset*.045:0;
    const dy=mark.motion==="pebble"?Math.abs(offset)*.025:0;
    const tip=mark.motion==="tip"?offset*.12:0;
    const at=j*6,buffer=layer.positions;
    buffer[at]=mark.x1+dx;buffer[at+1]=mark.y1+dy;
    buffer[at+3]=mark.x2+dx+tip;buffer[at+4]=mark.y2+dy;
   });
   (layer.line.geometry.getAttribute("position") as THREE.BufferAttribute).needsUpdate=true;
  }
 }
 private drawArenaDebris(state:GameRenderState){
  while(this.debrisVisuals.length<state.debris.length){
   const mesh=new THREE.Mesh(new THREE.BoxGeometry(1,1,.04),new THREE.MeshBasicMaterial({color:0xbebebe,transparent:true,opacity:1,depthTest:false}));
   this.debrisVisuals.push(mesh);this.scene.add(mesh);
  }
  this.debrisVisuals.forEach((mesh,i)=>{
   const d=state.debris[i];mesh.visible=Boolean(d);if(!d)return;
   mesh.position.set(d.x,d.y,.36);mesh.rotation.z=d.rotation;mesh.scale.set(d.size,d.size,1);
   (mesh.material as THREE.MeshBasicMaterial).opacity=Math.max(0,1-d.age/d.life)*.9;
  });
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
   const r=cue.kind==="slam"?1.4:cue.kind==="explosion"?1.15:cue.kind==="attack"?.22:cue.kind==="deflect"?.48:cue.kind==="block"?.44:.56;
   const size=r*cue.intensity*(.4+t*1.4);
   g.scale.set(size,size,1);
   g.rotation.z=cue.direction<0?Math.PI:0;
   const ring=g.children[0] as THREE.Mesh,sparks=g.children[1] as THREE.LineSegments;
   (ring.material as THREE.MeshBasicMaterial).opacity=(cue.kind==="attack"?.3:.75)*fade;
   (sparks.material as THREE.LineBasicMaterial).opacity=(cue.kind==="explosion"?.65:1)*fade;
   sparks.visible=cue.kind!=="attack";
  }
 }
 resize(){if(!this.contextLifecycle.canRender())return;const w=Math.max(1,this.canvas.clientWidth),h=Math.max(1,this.canvas.clientHeight),a=w/h;this.renderer.setSize(w,h,false);const vh=this.cameraFrame?.height??10;this.camera.left=-a*vh/2;this.camera.right=a*vh/2;this.camera.top=vh/2;this.camera.bottom=-vh/2;this.camera.updateProjectionMatrix();}
 private applyArenaTheme(arena:GameRenderState["arena"]){
  const backgroundImage=getDownloadedImage(arena);
  if(this.themeArena===arena&&this.themeBackgroundImage===backgroundImage&&this.themeArtRevision===svgBackdropRevision())return;
  this.themeArena=arena;
  this.themeBackgroundImage=backgroundImage;
  this.themeArtRevision=svgBackdropRevision();
  const t=getArenaTheme(arena);
  this.platformMaterial.color.set(t.platform);
  this.icePlatformMaterial.color.set(platformColors(t,"ice").body);
  this.slipperyPlatformMaterial.color.set(platformColors(t,"slippery").body);
  this.oneWayPlatformMaterial.color.set(platformColors(t,"oneWay").body);
  this.conveyorLeftPlatformMaterial.color.set(platformColors(t,"conveyorLeft").body);
  this.conveyorRightPlatformMaterial.color.set(platformColors(t,"conveyorRight").body);
  const surface=document.createElement("canvas");surface.width=640;surface.height=360;
  const ctx=surface.getContext("2d");
  if(ctx){
   paintArenaBackdrop(ctx,surface.width,surface.height,t,arena);
   const texture=new THREE.CanvasTexture(surface);
   texture.colorSpace=THREE.SRGBColorSpace;
   this.scene.background=texture;
   this.themeTexture?.dispose();this.themeTexture=texture;
  }else{
   this.scene.background=new THREE.Color(t.skyTop);
   this.themeTexture?.dispose();this.themeTexture=null;
  }
 }
 render(state:GameRenderState){if(!this.contextLifecycle.canRender())return;this.applyArenaTheme(state.arena);this.fortressGroup.visible=state.arena==="fortress";if(this.environmentArena!==state.arena){for(const g of this.environmentVisuals){this.environmentGroup.remove(g);g.traverse(o=>{if(o instanceof THREE.Mesh||o instanceof THREE.LineSegments){o.geometry.dispose();if(Array.isArray(o.material))o.material.forEach(m=>m.dispose());else o.material.dispose();}});}this.environmentVisuals=[];this.environmentArena=state.arena;}this.draw(this.player,state.player);this.draw(this.opponent,state.opponent);for(let i=0;i<this.platforms.length;i++){const p=state.platforms[i],m=this.platforms[i];const edge=this.platformEdges[i];if(!p){m.visible=false;edge.visible=false;if(this.platformInkGroups[i])this.platformInkGroups[i].visible=false;continue;}m.visible=true;edge.visible=true;m.material=p.surface==="ice"?this.icePlatformMaterial:p.surface==="slippery"?this.slipperyPlatformMaterial:p.surface==="oneWay"?this.oneWayPlatformMaterial:p.surface==="conveyorLeft"?this.conveyorLeftPlatformMaterial:p.surface==="conveyorRight"?this.conveyorRightPlatformMaterial:this.platformMaterial;m.position.set(p.x+p.width/2,p.y+p.height/2,-.05);m.scale.set(p.width,p.height,1);edge.position.set(p.x+p.width/2,p.y+p.height-Math.min(.055,p.height*.3),.01);edge.scale.set(p.width,.07,1);(edge.material as THREE.MeshBasicMaterial).color.set(platformColors(getArenaTheme(state.arena),p.surface).edge);this.drawPlatformInk(state,p,i);}while(this.projectiles.length<state.projectiles.length){const m=new THREE.Mesh(this.projectileGeometry,new THREE.MeshBasicMaterial({color:0xffffff}));this.projectiles.push(m);this.scene.add(m);
 const boomerangIcon=this.buildProjectileIcon("boomerang");this.boomerangIcons.push(boomerangIcon);this.scene.add(boomerangIcon);
 const missileIcon=this.buildProjectileIcon("missile");this.missileIcons.push(missileIcon);this.scene.add(missileIcon);
 const spearIcon=this.buildProjectileIcon("spear");this.spearIcons.push(spearIcon);this.scene.add(spearIcon);
 const arrowGeometry=new THREE.BufferGeometry();arrowGeometry.setAttribute("position",new THREE.BufferAttribute(new Float32Array(36),3));// Shaft, yellow tip and green fletching use vertex colors without extra draw calls.
 const arrowColors=new Float32Array(36);
 const hues=[[.85,.84,.73],[.96,.76,.21],[.96,.76,.21],[.42,.80,.27],[.42,.80,.27],[.85,.84,.73]];
 for(let k=0;k<6;k++){const [r,g,b]=hues[k];arrowColors.set([r,g,b,r,g,b],k*6);}
 arrowGeometry.setAttribute("color",new THREE.BufferAttribute(arrowColors,3));
 const arrow=new THREE.LineSegments(arrowGeometry,new THREE.LineBasicMaterial({vertexColors:true,transparent:true,opacity:.95}));this.bowProjectiles.push(arrow);this.scene.add(arrow);const trail=new THREE.Mesh(new THREE.BoxGeometry(1,.045,.02),new THREE.MeshBasicMaterial({color:0xffc431,transparent:true,opacity:.34,depthTest:false}));this.missileTrails.push(trail);this.scene.add(trail);const flash=new THREE.Mesh(new THREE.CircleGeometry(.16,8),new THREE.MeshBasicMaterial({color:0xffb13d,transparent:true,opacity:0,depthTest:false}));this.missileFlashes.push(flash);this.scene.add(flash);const bomb=this.buildBomb();this.bombVisuals.push(bomb);this.scene.add(bomb);}while(this.environmentVisuals.length<state.environment.length){const env=state.environment[this.environmentVisuals.length];const g=this.buildEnvironment(env.kind);this.environmentVisuals.push(g);this.environmentGroup.add(g);}while(this.explosionVisuals.length<state.explosions.length){const g=this.buildExplosion();this.explosionVisuals.push(g);this.scene.add(g);}this.explosionVisuals.forEach((g,i)=>{const e=state.explosions[i];if(!e){g.visible=false;return;}this.drawExplosion(g,e);});this.environmentVisuals.forEach((g,i)=>{const e=state.environment[i];if(!e){g.visible=false;return;}g.visible=e.active;g.position.set(e.x,e.y,.02);g.rotation.z=e.rotation;g.scale.set(e.width,e.height,1);if(e.pulse>0)g.scale.multiplyScalar(1+Math.min(.08,e.pulse*.04));const warn=g.userData.warning as THREE.Group;const strength=e.kind==="vent"?Math.max(e.warning,e.pulse):e.warning;warn.visible=e.active&&strength>0;if(warn.visible){warn.scale.setScalar(1+strength*.16);for(const child of warn.children){const mat=(child as THREE.Mesh).material as THREE.MeshBasicMaterial;mat.opacity=Math.min(.9,.32+strength*.6);}}});this.projectiles.forEach((m,i)=>{const p=state.projectiles[i];m.visible=Boolean(p&&p.weapon!=="bomb"&&p.weapon!=="boomerang"&&p.weapon!=="missile"&&p.weapon!=="spear");
 const boomerangIcon=this.boomerangIcons[i],missileIcon=this.missileIcons[i];
 boomerangIcon.visible=Boolean(p&&p.weapon==="boomerang");
 missileIcon.visible=Boolean(p&&p.weapon==="missile");
 const spearIcon=this.spearIcons[i];spearIcon.visible=Boolean(p&&p.weapon==="spear");
 if(p&&(p.weapon==="boomerang"||p.weapon==="missile"||p.weapon==="spear")){
  const icon=p.weapon==="boomerang"?boomerangIcon:p.weapon==="spear"?spearIcon:missileIcon;
  icon.position.set(p.x,p.y,.16);icon.rotation.z=p.rotation;
 }
 const bomb=this.bombVisuals[i];bomb.visible=Boolean(p&&p.weapon==="bomb");if(p&&p.weapon==="bomb"){bomb.position.set(p.x,p.y,.2);bomb.rotation.z=p.rotation;const warning=p.life<.55?1+Math.sin(p.age*45)*.1:1;bomb.scale.setScalar(warning);bomb.children[3].scale.setScalar(.7+.6*Math.abs(Math.sin(p.age*38)));}this.missileTrails[i].visible=Boolean(p&&p.weapon==="missile");this.missileFlashes[i].visible=false;if(this.bowProjectiles[i])this.bowProjectiles[i].visible=Boolean(p&&p.weapon==="bow");if(p){m.position.set(p.x,p.y,.1);m.rotation.z=p.rotation;const speed=Math.hypot(p.vx,p.vy);if(p.weapon==="bow"&&this.bowProjectiles[i]){const q=this.bowProjectiles[i],a=q.geometry.attributes.position.array as Float32Array,L=.56,H=.11;a.set([-L,0,0,L,0,0,L,0,0,L-H,-H*.65,0,L,0,0,L-H,H*.65,0,-L,0,0,-L+H*.9,-H,0,-L,0,0,-L+H*.9,H,0]);q.position.set(p.x,p.y,.14);q.rotation.z=p.rotation;q.geometry.attributes.position.needsUpdate=true;}m.scale.set(Math.max(1,speed/10),1,1);const size=p.weapon==="bomb"?.1:p.weapon==="boomerang"?.13:p.weapon==="bow"?.055:p.weapon==="missile"?.12:.09;m.scale.set(p.weapon==="bow"?2.8:p.weapon==="missile"?4.6:1,p.weapon==="bow"?.45:p.weapon==="missile"?.72:1,1);m.scale.multiplyScalar(size/.09);if(p.weapon==="missile"){const len=Math.max(.45,Math.min(1.6,.38+speed*.055));const nx=speed>0.01?p.vx/speed:0,ny=speed>0.01?p.vy/speed:0;const trail=this.missileTrails[i];trail.position.set(p.x-nx*(.38+len*.35),p.y-ny*(.38+len*.35),.06);trail.rotation.z=p.rotation;trail.scale.set(len,1,1);const flame=this.missileFlashes[i];flame.position.set(p.x-nx*.34,p.y-ny*.34,.08);flame.rotation.z=p.rotation;flame.scale.setScalar(.7+Math.min(1.2,speed/12));flame.visible=true;((flame.material as THREE.MeshBasicMaterial).opacity)=.55*(.72+.28*Math.sin(p.age*55));}if(p.weapon==="bomb"&&p.life<.6)m.scale.multiplyScalar(Math.floor(p.life*18)%2===0?.35:1);}});this.drawArenaDebris(state);this.drawCombatCues(state);const aspect=Math.max(1,this.canvas.clientWidth)/Math.max(1,this.canvas.clientHeight);const previous=this.framedArena===state.arena?this.cameraFrame:null;this.cameraFrame=combatCameraFrame(state,aspect,previous);this.framedArena=state.arena;const vh=this.cameraFrame.height;this.camera.left=-aspect*vh/2;this.camera.right=aspect*vh/2;this.camera.top=vh/2;this.camera.bottom=-vh/2;this.camera.updateProjectionMatrix();this.camera.position.x=this.cameraFrame.x+state.cameraShake.x;this.camera.position.y=this.cameraFrame.y+state.cameraShake.y;this.drawGrapples(state);this.renderer.render(this.scene,this.camera);}
 private drawGrapples(state:GameRenderState){
  for(const [i,s] of [state.player,state.opponent].entries()){
   const rope=this.grappleLines[i],hook=this.grappleHooks[i],g=s.grapple;
   rope.visible=Boolean(g);hook.visible=Boolean(g);
   if(!g)continue;
   const points=rope.geometry.getAttribute("position") as THREE.BufferAttribute;
   points.setXYZ(0,s.x+s.facing*.57,s.y+.23,.36);
   points.setXYZ(1,g.x,g.y,.36);
   points.needsUpdate=true;
   hook.position.set(g.x,g.y,.37);
   hook.rotation.z=g.angle;
   const material=hook.material as THREE.MeshBasicMaterial;
   const map=g.phase==="latched"?this.grappleTextures.open:this.grappleTextures.flight;
   if(material.map!==map){material.map=map;material.needsUpdate=true;}
  }
 }
 private draw(view:ReturnType<ThreeRenderer['fighter']>,s:DuelistRenderState){
  const pose=fighterVisual(s),width=FIGHTER_INK_WIDTH,ink=fighterInkPalette(view.enemy,s.characterId,s.mummyStyle);
  view.grappleGun.visible=weaponDrawPose(s).weapon==="grapple"&&s.grabPhase===null;
  view.grappleGun.position.set(pose.hand[0]+.205,pose.hand[1]-.045,.084);
  view.grappleGun.rotation.z=pose.toolAngle;
  view.group.position.set(s.x,s.y,.1);
  // Recolor existing meshes; do not rebuild materials or GPU geometry per frame.
  (view.bodyHalo.material as THREE.MeshBasicMaterial).color.set(ink.halo);
  (view.bodyCore.material as THREE.MeshBasicMaterial).color.set(ink.core);
  (view.headHalo.material as THREE.MeshBasicMaterial).color.set(ink.halo);
  (view.headOutline.material as THREE.MeshBasicMaterial).color.set(ink.outline);
  (view.head.material as THREE.MeshBasicMaterial).color.set(ink.face);
  (view.vestCore.material as THREE.MeshBasicMaterial).color.set(ink.suit);
  (view.gearCore.material as THREE.MeshBasicMaterial).color.set(ink.armor);
  (view.trim.material as THREE.MeshBasicMaterial).color.set(ink.trim);
  view.group.scale.set(pose.visualFacing*pose.scale*pose.scaleX,pose.scale*pose.scaleY,1);
  view.group.rotation.z=-Math.sign(pose.visualFacing)*pose.lean;
  this.setCapsules(view.bodyHalo,pose.body,width.body.halo);
  this.setCapsules(view.bodyOutline,pose.body,width.body.outline);
  this.setCapsules(view.bodyCore,pose.body,width.body.core);
  const outfit=fighterOutfit(s,pose);
  this.setCapsules(view.vestOutline,outfit.vest,width.vest.outline);
  this.setCapsules(view.vestCore,outfit.vest,width.vest.core);
  this.setCapsules(view.gearOutline,outfit.gear,width.gear.outline);
  this.setCapsules(view.gearCore,outfit.gear,width.gear.core);
  this.setCapsules(view.trim,outfit.trim,width.trim);
  this.setCapsules(view.costumeOutline,pose.costume,width.costume.outline);
  this.setCapsules(view.costumeCore,pose.costume,width.costume.core);
  for(const circle of [view.headHalo,view.headOutline,view.head]){
   circle.position.x=pose.head[0];circle.position.y=pose.head[1];
   circle.scale.setScalar(1+pose.hit*.08);
  }
  this.setCapsules(view.hairOutline,outfit.hair,width.hair.outline);
  this.setCapsules(view.hairCore,outfit.hair,width.hair.core);
  (view.hairCore.material as THREE.MeshBasicMaterial).color.set(ink.hair);
  view.otherEye.position.x=pose.head[0]-.105;view.otherEye.position.y=pose.head[1]+.03;
  view.otherEyeGlint.position.x=pose.head[0]-.095;view.otherEyeGlint.position.y=pose.head[1]+.05;
  view.eye.position.x=pose.head[0]+.105;view.eye.position.y=pose.head[1]+.04;
  view.eyeGlint.position.x=pose.head[0]+.12;view.eyeGlint.position.y=pose.head[1]+.057;
  view.eye.scale.y=pose.blink;view.otherEye.scale.y=pose.blink;
  // Smooth featureless faces match the reference artworks.
  view.eye.visible=false;view.otherEye.visible=false;
  view.eyeGlint.visible=false;view.otherEyeGlint.visible=false;
  const marks=characterMarkings(s,pose.head);
  this.setCapsules(view.markingOutline,marks,width.marking.outline);
  this.setCapsules(view.markingCore,marks,width.marking.core);
  (view.markingCore.material as THREE.MeshBasicMaterial).color.set(ink.accent);
  const skinLayers=characterSkinLayers(s,pose);
  for(let i=0;i<view.skinMeshes.length;i++){
   const layer=skinLayers[i],mesh=view.skinMeshes[i];
   this.setCapsules(mesh,layer?.segments??[],layer?.width??.01);
   if(layer)(mesh.material as THREE.MeshBasicMaterial).color.set(layer.color);
  }
  const weapon=view.grappleGun.visible?[]:toolSegments(s);
  const baseInk=weaponBaseInk(s);
  this.setCapsules(view.toolOutline,weapon,baseInk.outline);
  this.setCapsules(view.toolCore,weapon,baseInk.core);
  (view.toolCore.material as THREE.MeshBasicMaterial).color.set(baseInk.metal);
  const styleLayers=weaponStyleLayers(s);
  for(let i=0;i<view.styleMeshes.length;i++){
   const layer=styleLayers[i],mesh=view.styleMeshes[i];
   this.setCapsules(mesh,layer?.segments??[],layer?.width??.01);
   if(layer)(mesh.material as THREE.MeshBasicMaterial).color.set(layer.color);
  }
  this.setCapsules(view.weaponAccent,weaponAccentSegments(s),width.weapon.accent);
  (view.weaponAccent.material as THREE.MeshBasicMaterial).color.set(weaponAccentColor(s));
  for(const part of [view.toolOutline,view.toolCore,...view.styleMeshes,view.weaponAccent]){
   part.position.x=pose.hand[0];part.position.y=pose.hand[1];
   part.rotation.z=pose.toolAngle;
  }
  const effect=[...telegraphSegments(s),...kickEffectSegments(s),...slamEffectSegments(s),...grabEffectSegments(s)] as Segment[];
  if(s.attackTime>0&&(s.weapon==="blaster"||s.weapon==="uzi")){
   const x=pose.hand[0]+(s.weapon==="uzi"?.54:.66),y=pose.hand[1];
   effect.push([[x,y],[x+.22,y+.1]],[[x,y],[x+.22,y-.1]],[[x,y],[x+.3,y]]);
  }
  if(Math.abs(s.velocityX)>9)for(const y of [-.3,0,.3])effect.push([[-.45,y],[-1.1,y]]);
  if(pose.land>0)effect.push([[-.3,-.88],[-.6-pose.land*.2,-.82]],[[.3,-.88],[.6+pose.land*.2,-.82]]);
  this.setLines(view.effect,segmentPositions(effect));
  (view.effect.material as THREE.LineBasicMaterial).opacity=effect.length?(s.attackTelegraph>0?.95:.6):0;
 }
 dispose(){for(const line of this.grappleLines){line.geometry.dispose();(line.material as THREE.Material).dispose();}for(const texture of Object.values(this.grappleTextures))texture.dispose();this.platformInk.clear();this.contextLifecycle.dispose();this.themeTexture?.dispose();this.themeTexture=null;for(const m of this.missileTrails)this.scene.remove(m);for(const m of this.missileFlashes)this.scene.remove(m);for(const m of this.bowProjectiles)this.scene.remove(m);this.renderer.dispose();this.renderer.forceContextLoss();this.scene.traverse(o=>{if(o instanceof THREE.Mesh){o.geometry.dispose();if(Array.isArray(o.material))o.material.forEach(m=>m.dispose());else o.material.dispose();}if(o instanceof THREE.LineSegments){o.geometry.dispose();if(Array.isArray(o.material))o.material.forEach(m=>m.dispose());else o.material.dispose();}});this.scene.clear();this.projectileGeometry.dispose();this.platformMaterial.dispose();this.icePlatformMaterial.dispose();this.slipperyPlatformMaterial.dispose();this.oneWayPlatformMaterial.dispose();this.conveyorLeftPlatformMaterial.dispose();this.conveyorRightPlatformMaterial.dispose();this.environmentVisuals.forEach(g=>g.traverse(o=>{if(o instanceof THREE.Mesh){o.geometry.dispose();if(Array.isArray(o.material))o.material.forEach(m=>m.dispose());else o.material.dispose();}if(o instanceof THREE.LineSegments){o.geometry.dispose();if(Array.isArray(o.material))o.material.forEach(m=>m.dispose());else o.material.dispose();}}));}
}