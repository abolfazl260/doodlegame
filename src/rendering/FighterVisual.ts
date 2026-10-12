import type {DuelistRenderState} from '../gameplay/GameSession';
import {WEAPON_DRAW_DURATION,DOUBLE_JUMP_POSE_DURATION,WALL_JUMP_POSE_DURATION,TURN_POSE_DURATION,SLAM} from '../gameplay/GameSession.js';
import {KICK_SPECS,kickIsActive} from '../gameplay/KickCombat.js';
export type Point = readonly [number, number];
export type Segment = readonly [Point, Point];
const clamp=(v:number)=>Math.max(0,Math.min(1,v));
export function attackDuration(weapon:DuelistRenderState['weapon']) {
 return weapon==='hammer'?.24:weapon==='blade'||weapon==='bow'||weapon==='missile'?.22:.14;
}
/** Shared, legible overhead tell for committed attacks and boss phase changes. */
export function telegraphSegments(s:DuelistRenderState):Segment[]{
 if(s.attackTelegraph<=0)return[];
 const size=.18+.11*s.attackTelegraph,top=1.45;
 const result:Segment[]=[
  [[-size,top],[0,top+size]],
  [[0,top+size],[size,top]],
  [[size,top],[0,top-size]],
  [[0,top-size],[-size,top]]
 ];
 if(s.enemyType==="boss"){
  result.push([[-.45,top+.38],[.45,top+.38]]);
  if(s.bossPhase>=1)result.push([[-.30,top+.50],[.30,top+.50]]);
  if(s.bossPhase>=2)result.push([[-.18,top+.62],[.18,top+.62]]);
 }
 return result;
}
/** The first 55 ms lower the outgoing tool; the remaining 125 ms draw the
 * newly equipped tool. Actual weapon logic always uses s.weapon. An attack
 * immediately takes visual precedence, so no projectile comes from an old tool.
 */
export function weaponDrawPose(s:DuelistRenderState){
 const remaining=s.weaponDrawTime??0;
 const from=s.weaponHolsterFrom??null;
 if(remaining<=0||!from||from===s.weapon||s.attackTime>0||s.bowCharge>0||s.slamPhase!==null||
   s.kickKind||s.grabPhase!==null)return {weapon:s.weapon,phase:"ready" as const,progress:1};
 const progress=clamp(1-remaining/WEAPON_DRAW_DURATION);
 if(progress<.31)return {weapon:from,phase:"holster" as const,progress:progress/.31};
 return {weapon:s.weapon,phase:"draw" as const,progress:(progress-.31)/.69};
}
const interpolate=(a:number,b:number,t:number)=>a+(b-a)*t;

/** One visual state machine for both renderers, driven by actual movement only. */
export function airbornePose(s:DuelistRenderState){
 if(s.grounded||s.health<=0)return{phase:"grounded" as const,progress:0};
 const interrupted=s.hitTime>0||s.kickKind!==null||s.grabPhase!==null||s.attackTime>0||s.slamPhase!==null;
 if(!interrupted&&s.jumpStage===2&&s.doubleJumpPoseTime>0){
  return {phase:"double" as const,progress:clamp(1-s.doubleJumpPoseTime/DOUBLE_JUMP_POSE_DURATION)};
 }
 if(!interrupted&&s.wallJumpPoseTime>0){
  return {phase:"wall" as const,progress:clamp(1-s.wallJumpPoseTime/WALL_JUMP_POSE_DURATION)};
 }
 if(s.velocityY>1.2)return{phase:"rise" as const,progress:clamp(s.velocityY/12)};
 if(s.velocityY< -1.2)return{phase:"fall" as const,progress:clamp((-s.velocityY-1.2)/10)};
 return{phase:"apex" as const,progress:1-clamp(Math.abs(s.velocityY)/1.2)};
}
/** World-space, articulated monochrome pose shared by WebGL and Canvas. */
export function fighterVisual(s:DuelistRenderState) {
 const draw=weaponDrawPose(s),flight=airbornePose(s),weapon=draw.weapon;
 const speed=clamp(Math.abs(s.velocityX)/8), air=!s.grounded;
 const fastRun=clamp((Math.abs(s.velocityX)-4.2)/4);
 const hitOverride=s.hitTime>0||s.attackTime>0||s.kickKind!==null||
  s.grabPhase!==null||s.health<=0||Math.abs(s.velocityX)>9;
 const pivot=!air&&!hitOverride?clamp((s.turnPoseTime??0)/TURN_POSE_DURATION):0;
 const idle=!air&&!hitOverride?Math.pow(1-speed,2):0;
 const facing=Number.isFinite(s.visualFacing)?s.visualFacing:s.facing;
 const grabbing=s.grabPhase==="attempt"||s.grabPhase==="hold"||s.grabPhase==="windup";
 const held=s.grabPhase==="held";
 const phase=s.gaitPhase, stride=air?0:Math.sin(phase)*speed;
 const land=clamp(s.landingTime/.18), hit=clamp(s.hitTime/.22);
 const progress=clamp(1-s.attackTime/attackDuration(s.weapon));
 const kick=s.kickKind??null;
 const kickProgress=kick?clamp(s.kickElapsed/KICK_SPECS[kick].duration):0;
 const kickExtension=kick?Math.sin(Math.PI*clamp((kickProgress-(kick==="spin"?.2:.1))/(kick==="spin"?.65:.78))):0;
 const spinTurn=kick==="spin"?Math.sin(kickProgress*Math.PI*2):0;
 const swing=s.attackTime>0?Math.sin(progress*Math.PI):0;
 // Stationary breathing is subtle, tied to rendered time, never to world position.
 const inhale=Math.sin(s.animationTime*2.7);
 const breathe=inhale*.025*idle;
 const hip:Point=[-.012*breathe,-.05-land*.15+breathe*.12];
 const shoulder:Point=[-.04+breathe*.5,.4+breathe-land*.15];
 const head:Point=[-.02+breathe*.32,.82+breathe*1.25-land*.15];
 const joints:Segment[]=[[hip,shoulder]];
 const add=(a:Point,b:Point,c:Point)=>joints.push([a,b],[b,c]);
 for(const side of [-1,1]) {
  const step=stride*side;
  let foot:Point=air?[side*.32,-.52+(s.velocityY>0?.14:0)]:
   [side*.25+step*(.42+fastRun*.23),-.9+Math.max(0,step)*(.2+fastRun*.20)];
  let knee:Point=[side*.18+step*(.16+fastRun*.12),-.43+(air?.14:land*.12)+(!air?Math.max(0,step)*fastRun*.12:0)];
  if(pivot>0){
   // Keep the planted foot close to the body for a readable, brief pivot.
   const plant=pivot*.35;
   foot=[foot[0]*(1-plant)+side*.18*plant,foot[1]+plant*.09];
   knee=[knee[0]*(1-plant),knee[1]+plant*.05];
  }
  if(air&&flight.phase==="double"){
   const tuck=Math.sin(Math.PI*flight.progress);
   knee=[side*(.18+tuck*.08),-.3+tuck*.23];
   foot=[side*(.31-tuck*.08),-.55+tuck*.33];
  }else if(air&&flight.phase==="wall"){
   const kickAway=Math.sin(Math.PI*flight.progress);
   knee=[side*(.2+kickAway*.14),-.29+kickAway*.1];
   foot=[side*(.32+kickAway*.27),-.52+kickAway*.12];
  }else if(air&&flight.phase==="fall"){
   const spread=flight.progress;
   knee=[side*(.18+spread*.17),-.28+spread*.03];
   foot=[side*(.32+spread*.25),-.56-spread*.14];
  }else if(air&&flight.phase==="apex"){
   knee=[side*.23,-.26];
   foot=[side*.42,-.57];
  }else if(air&&flight.phase==="rise"){
   knee=[side*.19,-.32];
   foot=[side*.3,-.48+(side===1?.10:0)];
  }
  if(s.slamPhase!==null){
   const phase=s.slamPhase,elapsed=s.slamElapsed;
   const anticipation=Math.min(1,elapsed/SLAM.startup);
   const curl=phase==="startup"?.35+anticipation*.5:phase==="impact"?.9:phase==="recovery"?.6*(1-Math.min(1,elapsed/SLAM.recovery)):0;
   knee=[side*(.14+curl*.12),-.39+curl*.24];
   foot=[side*(.17+curl*.22),-.83+curl*.32];
  }
  if(kick&&side===1){
   const sweep=kick==="spin"?Math.sin(kickProgress*Math.PI*2)*.48:0;
   knee=[.26+kickExtension*.25,-.43+kickExtension*.16+sweep*.12];
   foot=[.27+kickExtension*(kick==="spin"?1.02:.92),-.88+kickExtension*.46+sweep*.27];
  }else if(kick&&side===-1){
   foot=[-.36,-.91];
   knee=[-.26,-.42];
  }
  add(hip,knee,foot);
 }
 let hand:Point=[.46,.03];
 let back:Point=[-.45-stride*(.16+fastRun*.29),.05+stride*(.1+fastRun*.19)+breathe*.45];
 let toolAngle=Math.sin(phase)*speed*.06;
 if(weapon==='blade'||weapon==='hammer') {
  const angles=weapon==='hammer'?(s.attackVariant===2?[.9,-1.2]:[-1.1,1.25]):(s.attackVariant===0?[.9,-1.2]:[-1.15,1.1]);
  toolAngle=s.attackTime>0?angles[0]+swing*(angles[1]-angles[0]):-.35;
  if(weapon==='blade'&&s.attackVariant===2)toolAngle=-toolAngle;
  if(weapon==='blade'&&s.attackVariant===3)toolAngle=.08;
  hand=[.34+swing*.18,.09+swing*.08];
 } else if(weapon==='bow') {hand=[.45,.22];back=[.1-s.bowCharge*.3,.22];toolAngle=0;}
 else if(weapon==='blaster'||weapon==='uzi'||weapon==='missile') {
  hand=[.43-swing*.09,.18+swing*.03];back=[.23-swing*.09,.12];
  toolAngle=weapon==='missile'?s.missileAngle*Math.PI/180:swing*.09;
 } else {hand=[.45-swing*.2,.05+swing*.3];toolAngle=-swing*.8;}
 if(s.aimAngle!=null&&!['blade','hammer'].includes(weapon)){
  toolAngle=Math.atan2(Math.sin(s.aimAngle),Math.abs(Math.cos(s.aimAngle)));
  hand=[Math.cos(toolAngle)*.48,.18+Math.sin(toolAngle)*.48];
  back=[Math.cos(toolAngle)*.23,.12+Math.sin(toolAngle)*.23];
 }
 if(air&&s.attackTime<=0&&weapon!=='bow'){back=[-.48,s.velocityY>0?.32:-.15];}
 if(Math.abs(s.velocityX)>9){back=[-.62,.28];}
 if(kick){back=kick==="spin"?[-.58,.18+spinTurn*.13]:[-.52,.19];hand=[.24,.28+kickExtension*.14];}
 if(grabbing){
  // Paired motion: reaching forward, then raising the victim for wind-up.
  const lift=s.grabPhase==="windup"?.29:s.grabPhase==="hold"?.13:0;
  back=[.05,.36+lift];hand=[.78,.36+lift];toolAngle=0;
 }
 if(held){back=[-.33,.51];hand=[.55,.5];toolAngle=0;}
 if(!air&&!hitOverride&&!held&&!grabbing){
  // Off-hand follows a longer counter-swing during fast running.
  const counter=stride*fastRun;
  back=[back[0]-.13*counter,back[1]+.13*counter];
  if(s.aimAngle===null&&s.bowCharge<=0){
   hand=[hand[0]+counter*.11+breathe*.27,hand[1]-counter*.11+breathe*.4];
  }
  // A grounded reversal briefly drops the shoulders and shifts weight.
  if(pivot>0){
   const turnEase=Math.sin(pivot*Math.PI);
   back=[back[0]-.11*pivot,back[1]-.1*pivot-.06*turnEase];
   if(s.aimAngle===null&&s.bowCharge<=0)hand=[hand[0]-.1*pivot,hand[1]-.05*pivot];
  }
 }
 // A free-falling fighter opens the off-hand and legs; attacking and weapon
 // aiming retain their live weapon pose, rather than sacrificing accuracy.
 if(air&&!kick&&!grabbing&&!held&&s.hitTime<=0&&s.health>0){
  if(flight.phase==="double"){
   const tuck=Math.sin(Math.PI*flight.progress);
   back=[-.48+tuck*.20,.30+tuck*.37];
   if(s.attackTime<=0&&s.aimAngle===null&&s.bowCharge<=0)hand=[hand[0]-tuck*.11,hand[1]+tuck*.36];
  }else if(flight.phase==="wall"){
   const push=Math.sin(Math.PI*flight.progress);
   back=[-.58,.34+push*.2];
  }else if(flight.phase==="fall"){
   back=[-.5-flight.progress*.17,.22+flight.progress*.29];
   if(s.attackTime<=0&&s.aimAngle===null&&s.bowCharge<=0)hand=[hand[0]+flight.progress*.09,hand[1]+flight.progress*.12];
  }else if(flight.phase==="apex"){
   back=[-.56,.31];
  }else if(flight.phase==="rise"){
   back=[-.46,.28];
  }
 }
 if(s.slamPhase!==null){
  const stage=s.slamPhase,elapsed=s.slamElapsed;
  const wind=stage==="startup"?Math.min(1,elapsed/SLAM.startup):1;
  if(stage==="startup"){back=[-.49,.32+wind*.35];hand=[.36,.23+wind*.37];toolAngle=-.7;}
  else if(stage==="descent"){back=[-.5,.64];hand=[.29,.67];toolAngle=-1.1;}
  else if(stage==="impact"){back=[-.6,-.15];hand=[.38,-.36];toolAngle=-1.25;}
  else{const release=Math.min(1,elapsed/SLAM.recovery);back=[-.6+release*.15,-.15+release*.20];hand=[.38,-.36+release*.52];}
 }
 if(draw.phase!=="ready"){
  const amount=draw.phase==="holster"?draw.progress:1-draw.progress;
  const ease=amount*amount*(3-2*amount);
  hand=[interpolate(hand[0],.1,ease),interpolate(hand[1],-.55,ease)];
  toolAngle=interpolate(toolAngle,-1.35,ease);
  // Keep the weapon below the torso during holster and then raise it.
  back=[interpolate(back[0],-.33,ease*.25),interpolate(back[1],-.12,ease*.25)];
 }
 add([-.18,shoulder[1]],[-.3,.19],back);
 add([.18,shoulder[1]],[.32,.2],hand);
 const scale=s.enemyType==='boss'?1.18:s.enemyType==='tank'?1.08:1;
 const squash=land*.16;
 const aerialTilt=flight.phase==="double"?.36*Math.sin(Math.PI*flight.progress):
  flight.phase==="wall"?-.18*Math.sin(Math.PI*flight.progress):
  flight.phase==="fall"?-.08*flight.progress:0;
 const runLean=fastRun*.065*(!air&&!hitOverride?1:0);
 const turnLean=pivot*.16*Math.sign(s.velocityX||s.facing);
 const slamLean=s.slamPhase==="startup"?-.2:s.slamPhase==="descent"?-.09:s.slamPhase==="impact"?.18:
  s.slamPhase==="recovery"?.18*(1-Math.min(1,s.slamElapsed/SLAM.recovery)):0;
 const lean=s.velocityX*s.facing*.012-hit*.18+(air?-s.velocityY*.008:0)+aerialTilt+runLean+turnLean+slamLean+
  (kick==="spin"?spinTurn*.3:kick?-.11*kickExtension:0)+(held?-.22:s.grabPhase==="windup"?-.13:0);
 // The silhouette narrows as it pivots through its edge-on midpoint. A
 // continuous signed factor avoids snapping even on rapid left/right taps.
 const visualFacing=Math.abs(facing)<.06?(facing<0?-.06:.06):facing;
 const slamSquash=s.slamPhase==="impact"?.14:s.slamPhase==="recovery"?
  .14*(1-Math.min(1,s.slamElapsed/SLAM.recovery)):0;
 return {joints,head,hand,toolAngle,swing,scale,scaleX:1+squash+slamSquash,scaleY:1-squash-slamSquash,lean,hit,land,
  visualFacing,pivot,fastRun,idle};
}
/** Motion arcs use the same segment coordinates in both Canvas and WebGL. */
export function kickEffectSegments(s:DuelistRenderState):Segment[]{
 const kind=s.kickKind;
 if(!kind||!kickIsActive(kind,s.kickElapsed))return[];
 const trail:Segment[]=[];
 const radius=kind==="spin"?.97:.78;
 const begin=kind==="spin"?-.85:-.45,end=kind==="spin"?1.0:.20;
 for(let i=0;i<5;i++){
  const a=begin+(end-begin)*i/5,b=begin+(end-begin)*(i+1)/5;
  trail.push([[.35+radius*Math.cos(a),-.44+radius*.52*Math.sin(a)],
   [.35+radius*Math.cos(b),-.44+radius*.52*Math.sin(b)]]);
 }
 return trail;
}
/** Common downward speed lines; the impact ring uses CombatFeedback's event. */
export function slamEffectSegments(s:DuelistRenderState):Segment[]{
 if(s.slamPhase!=="descent"&&s.slamPhase!=="startup")return [];
 const r=s.slamPhase==="startup"?.25:.65;
 return [
  [[-.52,.62],[-.52,-r]],
  [[.52,.62],[.52,-r]],
  [[-.25,1.0],[-.25,.52-r*.2]],
  [[.25,1.0],[.25,.52-r*.2]]
 ];
}
/** Short shared grab wind-up traces in both WebGL and Canvas fallback. */
export function grabEffectSegments(s:DuelistRenderState):Segment[]{
 if(s.grabPhase!=="attempt"&&s.grabPhase!=="hold"&&s.grabPhase!=="windup")return[];
 const r=s.grabPhase==="windup"?.57:.36;
 return [
  [[.6,-.05],[.68+r,.03]],
  [[.6,.21],[.68+r,.38]],
  [[.68+r,.03],[.75+r,.2]]
 ];
}
/** Each segment is a real pair of 3D vertices; buffers are sized from these arrays. */
export function toolSegments(s:DuelistRenderState):Segment[] {
 if(s.grabPhase!==null&&s.grabPhase!==undefined)return [];
 const weapon=weaponDrawPose(s).weapon;
 const lines:Segment[]=[];
 const line=(a:Point,b:Point)=>lines.push([a,b]);
 const path=(points:Point[])=>{for(let i=1;i<points.length;i++)line(points[i-1],points[i]);};
 const rect=(x:number,y:number,w:number,h:number)=>path([[x,y],[x+w,y],[x+w,y+h],[x,y+h],[x,y]]);
 switch(weapon) {
  case 'blade':
   rect(-.12,-.045,.25,.09);line([.12,-.16],[.12,.16]);
   path([[.15,-.08],[.78,-.07],[1.02,0],[.78,.07],[.15,.08]]);line([.2,0],[.88,0]);
   for(let x=-.08;x<.1;x+=.06)line([x,-.04],[x+.03,.04]);break;
  case 'hammer':
   rect(-.12,-.035,.7,.07);rect(.52,-.23,.38,.46);rect(.57,-.16,.28,.32);
   for(let x=0;x<.3;x+=.07)line([x,-.06],[x+.03,.06]);
   line([.63,-.12],[.77,.12]);line([.77,-.12],[.63,.12]);break;
  case 'blaster':case 'uzi': {
   const length=weapon==='uzi'?.42:.54;
   rect(-.16,-.08,length,.21);rect(.04,-.3,.12,.22);rect(length-.16,-.03,.27,.08);
   rect(-.06,.13,.17,.055);rect(.18,-.14,.12,.065);
   for(let x=-.1;x<.13;x+=.055)line([x,.02],[x,.09]);
   path([[-.16,.08],[-.31,.07],[-.31,-.04],[-.16,-.04]]);
   for(let y=-.27;y<-.1;y+=.06)line([.06,y],[.14,y]);break;
  }
  case 'bow': {
   path([[.05,-.48],[.18,-.36],[.26,-.18],[.28,0],[.26,.18],[.18,.36],[.05,.48]]);
   path([[.05,-.48],[-s.bowCharge*.3,0],[.05,.48]]);rect(-.04,-.1,.1,.2);
   line([-s.bowCharge*.3,0],[.85,0]);path([[.7,-.07],[.85,0],[.7,.07]]);
   for(const side of [-1,1])line([-.2-s.bowCharge*.3,0],[-.1-s.bowCharge*.3,side*.08]);break;
  }
  case 'boomerang':
   path([[-.12,0],[.12,-.3],[.4,-.35],[.54,-.2],[.25,-.18],[.02,.04],[-.12,0]]);
   line([.12,-.24],[.4,-.28]);break;
  case 'bomb':
   for(let i=0;i<16;i++){const a=i*Math.PI/8,b=(i+1)*Math.PI/8;line([Math.cos(a)*.2,Math.sin(a)*.2],[Math.cos(b)*.2,Math.sin(b)*.2]);}
   rect(-.05,.18,.1,.07);path([[0,.25],[.09,.31],[.06,.4]]);
   for(let i=0;i<4;i++){const a=i*Math.PI/2+s.animationTime*8,r=.035+.025*Math.abs(Math.sin(s.animationTime*19));line([.06,.4],[.06+Math.cos(a)*r,.4+Math.sin(a)*r]);}break;
  case 'missile':
   rect(-.2,-.11,.68,.22);path([[.48,-.11],[.68,0],[.48,.11]]);
   path([[-.15,-.11],[-.3,-.23],[.03,-.11]]);path([[-.15,.11],[-.3,.23],[.03,.11]]);
   line([.35,-.11],[.35,.11]);rect(-.24,-.25,.18,.13);break;
 }
 return lines;
}
export function segmentPositions(segments:readonly Segment[]) {
 const data=new Float32Array(segments.length*6);
 segments.forEach(([a,b],i)=>data.set([a[0],a[1],0,b[0],b[1],0],i*6));
 return data;
}
