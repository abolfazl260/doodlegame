import type {DuelistRenderState} from '../gameplay/GameSession';
import {WEAPON_DRAW_DURATION,DOUBLE_JUMP_POSE_DURATION,WALL_JUMP_POSE_DURATION,TURN_POSE_DURATION,SLAM} from '../gameplay/GameSession.js';
import {KICK_SPECS,kickIsActive} from '../gameplay/KickCombat.js';
export type Point = readonly [number, number];
export type Segment = readonly [Point, Point];
const clamp=(v:number)=>Math.max(0,Math.min(1,v));
export function attackDuration(weapon:DuelistRenderState['weapon']) {
 return weapon==='hammer'?.24:weapon==='blade'||weapon==='bow'||weapon==='missile'||weapon==='spear'?.22:.14;
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
/** Blue or red headband with animated twin ribbons, matching the reference. */
export function characterMarkings(s:DuelistRenderState,head:Point):Segment[]{
 const [x,y]=head;
 const flutter=Math.sin(s.animationTime*8-s.gaitPhase)*.055-Math.min(1,Math.abs(s.velocityX)/9)*.055;
 const tailAngle=s.characterId==="ninja"?.085:0;
 return [
  [[x-.27,y+.045],[x+.27,y+.045]],
  [[x-.26,y+.04],[x-.44,y+.145+flutter]],
  [[x-.44,y+.145+flutter],[x-.69,y+.105+flutter*1.5+tailAngle]],
  [[x-.26,y+.015],[x-.47,y-.085+flutter*.5]],
  [[x-.47,y-.085+flutter*.5],[x-.64,y-.17+flutter]]
 ];
}
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
 // Layered animation: gait lift, landing recoil and head inertia all remain
 // visual-only, so collisions, aiming, and network state are unchanged.
 const gaitLift=!air?Math.abs(Math.sin(phase))*speed*.038:0;
 const headLag=-Math.sign(s.velocityX)*speed*.035;
 const recoil=hit*.055;
 const hip:Point=[-.012*breathe,-.05-land*.15+breathe*.12+gaitLift*.35];
 const shoulder:Point=[-.04+breathe*.5-recoil*.32,.4+breathe-land*.15+gaitLift*.7];
 const head:Point=[-.02+breathe*.32+headLag-recoil,.82+breathe*1.25-land*.15+gaitLift];
 const joints:Segment[]=[[hip,shoulder]];
 const add=(a:Point,b:Point,c:Point)=>joints.push([a,b],[b,c]);
 for(const side of [-1,1]) {
  const step=stride*side;
  let foot:Point=air?[side*.32,-.52+(s.velocityY>0?.14:0)]:
   [side*.25+step*(.42+fastRun*.23),-.9+Math.max(0,step)*(.2+fastRun*.20)+Math.max(0,-step)*fastRun*.05];
  let knee:Point=[side*.18+step*(.16+fastRun*.12),-.43+(air?.14:land*.12)+(!air?Math.max(0,step)*fastRun*.12+gaitLift*.22:0)];
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
 else if(weapon==='spear'){
  // Spear is thrown forward with a brief extended throwing arm.
  hand=[.45+swing*.24,.22+swing*.08];
  back=[.1-swing*.1,.18];toolAngle=.08+swing*.04;
 }
 else if(weapon==='blaster'||weapon==='uzi'||weapon==='missile') {
  hand=[.43-swing*.09,.18+swing*.03];back=[.23-swing*.09,.12];
  toolAngle=weapon==='missile'?s.missileAngle*Math.PI/180:swing*.09;
 } else {hand=[.45-swing*.2,.05+swing*.3];toolAngle=-swing*.8;}
 if(s.aimAngle!=null&&!['blade','hammer','missile'].includes(weapon)){
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
 // Weapon kickback is eased to zero within the attack window, independent
 // of any actual projectile trajectory or fire rate.
 const gunRecoil=(weapon==="blaster"||weapon==="uzi"||weapon==="missile")&&s.attackTime>0?
  Math.sin(progress*Math.PI)*.08:0;
 hand=[hand[0]-gunRecoil,hand[1]+gunRecoil*.35];
 add([-.18,shoulder[1]],[-.3,.19],back);
 add([.18,shoulder[1]],[.32,.2],hand);
 // Body and costume marks use different ink widths: arms and legs stay bold,
 // while hoods, scarves and armor keep their identifying contours.
 const bodyCount=joints.length;
 // One compact stick rig for both characters; headbands are rendered over the round heads.
  joints.push([[-.2,.24],[-.33,.18]],[[.2,.24],[.34,.16]]);
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
 const blink=s.health<=0?.12:s.hitTime>0?.6:(s.animationTime%4.6>4.48?.12:1);
 return {joints,body:joints.slice(0,bodyCount),costume:joints.slice(bodyCount),head,hand,toolAngle,swing,scale,scaleX:1+squash+slamSquash,scaleY:1-squash-slamSquash,lean,hit,land,blink,
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
   if(s.characterId==="ninja"){
    // Short, bright dagger with a red guard as shown in Ninja's reference card.
    rect(-.12,-.04,.24,.08);line([.12,-.12],[.12,.12]);
    path([[.15,-.067],[.46,-.056],[.64,0],[.46,.056],[.15,.067]]);
    line([.2,0],[.52,0]);
   }else{
    // Soldier's reference sword: long tapered silver blade, blue grip and gold crossguard.
    rect(-.24,-.065,.35,.13);rect(-.285,-.085,.075,.17);
    path([[.10,-.18],[.18,-.18],[.18,.18],[.10,.18],[.10,-.18]]);
    path([[.19,-.105],[.84,-.105],[1.06,0],[.84,.105],[.19,.105],[.19,-.105]]);
    line([.26,0],[.96,0]);
   }
   break;
  case 'hammer':
   // Rectangular faceted steel head, dark wood handle, gold pommel and collar.
   rect(-.34,-.065,.99,.13);
   rect(-.35,-.115,.10,.23);
   rect(.48,-.12,.10,.24);
   path([[.53,-.30],[.62,-.38],[.89,-.38],[.99,-.28],[.99,.28],[.89,.38],[.62,.38],[.53,.30],[.53,-.30]]);
   path([[.62,-.38],[.68,-.29],[.88,-.29],[.99,-.28]]);
   line([.66,-.23],[.66,.23]);line([.66,.23],[.84,.27]);break;
  case 'blaster': {
   // Compact dark graphite sidearm with a glowing red status window.
   path([[-.21,-.065],[.51,-.065],[.57,.00],[.68,.00],[.68,.18],[.52,.18],[.48,.23],[-.17,.23],[-.21,.16],[-.21,-.065]]);
   path([[-.09,-.065],[-.025,-.33],[.18,-.33],[.20,-.065]]);
   rect(.56,.035,.21,.10);
   rect(.18,.075,.22,.065);
   line([-.13,.15],[.05,.15]);line([.11,-.12],[.24,-.12]);
   break;
  }
  case 'uzi': {
   // Compact graphite submachine gun with a green status panel.
   path([[-.26,-.055],[.37,-.055],[.41,0],[.57,0],[.57,.14],[.39,.14],[.33,.19],[-.20,.19],[-.26,.13],[-.26,-.055]]);
   path([[-.045,-.055],[.02,-.31],[.18,-.31],[.20,-.055]]);
   rect(.40,.035,.20,.075);rect(.04,.075,.20,.055);
   line([-.19,.14],[-.09,.14]);line([.18,-.11],[.31,-.11]);
   break;
  }
  case 'bow': {
   // Warm wooden recurve bow with green grip and a gold-tipped arrow.
   path([[.07,-.55],[.18,-.49],[.29,-.30],[.36,-.11],[.36,.11],[.29,.30],[.18,.49],[.07,.55]]);
   path([[.07,-.55],[-s.bowCharge*.30,0],[.07,.55]]);
   rect(.30,-.12,.12,.24);
   line([-s.bowCharge*.30,0],[.93,0]);
   path([[.78,-.09],[.94,0],[.78,.09]]);
   for(const side of [-1,1])path([[-.17-s.bowCharge*.30,side*.10],[-.07-s.bowCharge*.30,0],[.015-s.bowCharge*.30,side*.09]]);
   break;
  }
  case 'boomerang':
   // Tapered V silhouette: black body with vibrant blue front edges.
   path([[-.37,-.25],[-.15,.13],[-.06,.23],[.04,.23],[.17,.16],[.59,-.22],[.51,-.33],[.12,-.05],[.025,.005],[-.075,-.015],[-.30,-.33],[-.37,-.25]]);
   line([-.21,-.10],[-.035,.11]);line([.15,.07],[.47,-.22]);
   break;
  case 'bomb':
   // Round charcoal bomb with short bright fuse, lightweight outlines.
   for(let i=0;i<20;i++){const a=i*Math.PI/10,b=(i+1)*Math.PI/10;
    line([Math.cos(a)*.195,Math.sin(a)*.195],[Math.cos(b)*.195,Math.sin(b)*.195]);}
   rect(-.047,.18,.094,.065);path([[0,.245],[.075,.315],[.045,.38]]);
   for(let i=0;i<6;i++){const a=i*Math.PI/3+s.animationTime*8,r=.032+.015*Math.abs(Math.sin(s.animationTime*18));
    line([.045,.38],[.045+Math.cos(a)*r,.38+Math.sin(a)*r]);}
   break;
  case 'spear':
   // Concept art: blue wrapped grip, dark slim shaft, golden fittings,
   // and a silver diamond-shaped pointed spearhead.
   rect(-.29,-.05,.30,.10);
   rect(-.31,-.078,.067,.156);rect(-.04,-.085,.055,.17);
   rect(.015,-.046,.77,.092);
   rect(.75,-.095,.09,.19);
   path([[.83,-.087],[.90,-.087],[1.04,-.16],[1.35,0],[1.04,.16],[.90,.087],[.83,.087],[.83,-.087]]);
   line([.93,0],[1.27,0]);break;
  case 'missile':
   // White rocket, red nose/fins and a small gold exhaust cone.
   rect(-.22,-.10,.64,.20);path([[.42,-.10],[.66,0],[.42,.10]]);
   path([[-.13,-.10],[-.25,-.23],[.025,-.10]]);
   path([[-.13,.10],[-.25,.23],[.025,.10]]);
   line([.30,-.10],[.30,.10]);
   path([[-.22,-.07],[-.36,0],[-.22,.07]]);
   break;}
 return lines;
}

/** Minimal black stick outfits, matching the two approved fighter silhouettes. */
export function fighterOutfit(_s:DuelistRenderState,pose:ReturnType<typeof fighterVisual>){
 const body=pose.body;
 const partial=(segment:Segment,start:number):Segment=>{
  const [a,b]=segment;
  return [[a[0]+(b[0]-a[0])*start,a[1]+(b[1]-a[1])*start],b];
 };
 const shoulder=(segment:Segment,end:number):Segment=>{
  const [a,b]=segment;
  return [a,[a[0]+(b[0]-a[0])*end,a[1]+(b[1]-a[1])*end]];
 };
 const vest=[body[0]];
 const gear=[partial(body[2],.48),partial(body[4],.48),
  partial(body[6],.42),partial(body[8],.42),
  shoulder(body[5],.58),shoulder(body[7],.58)];
 const trim:Segment[]=[[[-.12,.20],[0,.14]],[[0,.14],[.11,.2]]];
 const hair:Segment[]=[]; // No helmets or hair in the reference designs.
 return {vest,gear,trim,hair};
}

/** Distinct colored inlays for every equipped weapon. */
export function weaponAccentColor(s:DuelistRenderState):string {
 switch(weaponDrawPose(s).weapon){
  case "blade":return s.characterId==="ninja"?"#ef344d":"#f5bf35";
  case "hammer":return "#f1ba38";
  case "blaster":return "#f04454";
  case "uzi":return "#59d84f";
  case "bow":return "#f6c235";
  case "boomerang":return "#3ea7ff";
  case "bomb":return "#ff9a3d";
  case "missile":return "#ef4040";
  case "spear":return "#f6bf35";
 }
}
export function weaponAccentSegments(s:DuelistRenderState):Segment[]{
 if(s.grabPhase!==null&&s.grabPhase!==undefined)return [];
 switch(weaponDrawPose(s).weapon){
  case "blade":return s.characterId==="ninja"?
   [[[.21,-.02],[.5,0]],[[.12,-.1],[.12,.1]]]:
   [[[.14,-.18],[.14,.18]],[[-.24,-.08],[-.24,.08]]];
  case "hammer":return [
   [[.53,-.12],[.53,.12]],[[-.30,-.115],[-.30,.115]],[[.68,.25],[.87,.25]]
  ];
  case "blaster":return [
   [[.205,.11],[.375,.11]],[[.59,.09],[.73,.09]]
  ];
  case "uzi":return [
   [[.07,.10],[.23,.10]],[[.43,.075],[.57,.075]]
  ];
  case "bow":return [
   [[.78,-.085],[.94,0]],[[.94,0],[.78,.085]]
  ];
  case "boomerang":return [
   [[-.28,-.22],[-.055,.14]],[[.11,.11],[.49,-.25]]
  ];
  case "bomb":return [
   [[-.13,.07],[-.07,.14]],[[.045,.38],[.08,.42]]
  ];
  case "missile":return [
   [[.47,-.07],[.62,0]],[[.62,0],[.47,.07]],
   [[-.23,0],[-.34,0]]
  ];
  case "spear":return [
   [[-.27,-.055],[-.27,.055]],[[-.025,-.065],[-.025,.065]],
   [[.79,-.075],[.79,.075]],[[1.04,-.135],[1.29,0]]
  ]; }
 return [];
}

/** Four lightweight color passes for all eight approved weapon designs.
 * Procedural geometry follows animated equipment and never changes hitboxes.
 */
export interface WeaponStyleLayer { readonly color:string; readonly width:number; readonly segments:readonly Segment[]; }
export function weaponStyleLayers(s:DuelistRenderState):readonly WeaponStyleLayer[]{
 if(s.grabPhase!==null&&s.grabPhase!==undefined)return [];
 switch(weaponDrawPose(s).weapon){
  case "blade":
   return s.characterId==="ninja"?[]:[
    {color:"#c0d8eb",width:.105,segments:[[[.26,0],[.85,0]]]},
    {color:"#1766c3",width:.064,segments:[[[-.21,0],[.09,0]]]},
    {color:"#f2c34b",width:.081,segments:[[[.14,-.17],[.14,.17]]]},
    {color:"#f5fcff",width:.028,segments:[[[.31,.058],[.84,.058]]]}
   ];
  case "hammer":return [
   {color:"#a0aeba",width:.22,segments:[[[.77,-.22],[.77,.22]]]},
   {color:"#795032",width:.072,segments:[[[-.25,0],[.51,0]]]},
   {color:"#eab637",width:.055,segments:[[[.51,-.10],[.51,.10]],[[-.30,-.11],[-.30,.11]]]},
   {color:"#dce7f0",width:.028,segments:[[[.65,.24],[.87,.24]]]}
  ];
  case "blaster":return [
   {color:"#303a49",width:.126,segments:[[[-.15,.085],[.53,.085]]]},
   {color:"#1c2531",width:.086,segments:[[[.055,-.08],[.055,-.29]]]},
   {color:"#f14655",width:.053,segments:[[[.22,.11],[.38,.11]]]},
   {color:"#91a2b5",width:.025,segments:[[[-.12,.18],[.43,.18]]]}
  ];
  case "bow":return [
   {color:"#ad7138",width:.06,segments:[[[.075,-.55],[.19,-.46]],[[.19,-.46],[.30,-.26]],[[.30,-.26],[.36,0]],
     [[.36,0],[.30,.26]],[[.30,.26],[.19,.46]],[[.19,.46],[.075,.55]]]},
   {color:"#25ba79",width:.10,segments:[[[.36,-.105],[.36,.105]]]},
   {color:"#d9e1de",width:.028,segments:[[[-s.bowCharge*.30,0],[.77,0]]]},
   {color:"#72c944",width:.047,segments:[[[-.16-s.bowCharge*.30,-.09],[-.06-s.bowCharge*.30,0]],
      [[-.16-s.bowCharge*.30,.09],[-.06-s.bowCharge*.30,0]]]}
  ];
  case "uzi":return [
   {color:"#252e39",width:.119,segments:[[[-.18,.075],[.42,.075]]]},
   {color:"#35434e",width:.094,segments:[[[.085,-.06],[.085,-.28]]]},
   {color:"#59d84f",width:.053,segments:[[[.075,.10],[.24,.10]]]},
   {color:"#9aa9b5",width:.024,segments:[[[-.14,.155],[.30,.155]]]}
  ];
  case "boomerang":return [
   {color:"#253244",width:.081,segments:[[[-.29,-.23],[-.045,.125]],[[.12,.09],[.49,-.24]]]},
   {color:"#249fff",width:.064,segments:[[[-.28,-.22],[-.055,.14]],[[.11,.11],[.49,-.25]]]},
   {color:"#153752",width:.034,segments:[[[-.20,-.09],[-.04,.08]]]},
   {color:"#79d4ff",width:.026,segments:[[[.17,.10],[.40,-.14]]]}
  ];
  case "bomb":return [
   {color:"#222934",width:.22,segments:[[[-.08,-.075],[.08,.075]]]},
   {color:"#454d58",width:.037,segments:[[[-.105,.065],[-.045,.115]]]},
   {color:"#ff9a3d",width:.034,segments:[[[.045,.38],[.08,.415]],[[.045,.38],[.09,.37]]]},
   {color:"#d9e0e6",width:.021,segments:[[[-.09,.09],[-.025,.14]]]}
  ];
  case "missile":return [
   {color:"#f2f5f7",width:.132,segments:[[[-.17,0],[.43,0]]]},
   {color:"#ef4040",width:.068,segments:[[[.47,-.055],[.60,0]],[[.47,.055],[.60,0]]]},
   {color:"#dc3442",width:.055,segments:[[[-.12,-.11],[-.20,-.20]],[[-.12,.11],[-.20,.20]]]},
   {color:"#ffc430",width:.045,segments:[[[-.22,0],[-.34,0]]]}
  ];
  case "spear":return [
   {color:"#1858bf",width:.087,segments:[[[-.235,0],[-.035,0]]]},
   {color:"#553a31",width:.070,segments:[[[.04,0],[.73,0]]]},
   {color:"#d1dae3",width:.112,segments:[[[.91,0],[1.22,0]]]},
   {color:"#f6bf35",width:.065,segments:[[[.79,-.075],[.79,.075]],[[-.03,-.07],[-.03,.07]]]}
  ];
  default:return [];
 }
}

/** High-contrast 3-layer ink stays legible on both light and dark arenas. */
// Slim stick-fighter silhouette: thinner arms, legs, torso, accessories and weapons.
// The head and headband stay unchanged; all hitboxes and animation joints are unaffected.
// Canvas and WebGL both consume this shared set of stroke widths.
// Extra-slim stick-figure ink shared by Canvas and WebGL.
// Leave heads and collision/animation geometry untouched.
export const FIGHTER_INK_WIDTH={
 body:{halo:.16,outline:.118,core:.08},
 costume:{outline:.082,core:.037},
 weapon:{outline:.060,core:.028,accent:.028},
 vest:{outline:.24,core:.18},
 gear:{outline:.135,core:.092},
 hair:{outline:.145,core:.095},
 trim:.03,
 marking:{outline:.102,core:.057},
 head:{halo:.355,outline:.318,core:.274},
 eye:.062
} as const;
/**
 * Base metal outlines are painted over every polygon edge, so a bright and
 * thick core creates the white rim visible around the hammer. Keep the
 * interior artwork and contours, but use a thinner, muted metal line.
 * The hammer gets the narrowest/least bright stroke.
 */
export function weaponBaseInk(s:DuelistRenderState){
 if(weaponDrawPose(s).weapon==="hammer"){
  return {outline:.050,core:.015,metal:"#7c8b9a"} as const;
 }
 return {outline:FIGHTER_INK_WIDTH.weapon.outline,core:FIGHTER_INK_WIDTH.weapon.core,metal:"#b0bdc9"} as const;
}
export function fighterInkPalette(enemy:boolean,characterId:DuelistRenderState["characterId"]="soldier"){
 const ninja=characterId==="ninja";
 return {
  core:ninja?(enemy?"#171921":"#0b0e15"):(enemy?"#182333":"#0c1827"),
  outline:"#050a12",
  halo:ninja?"#f18088":"#9bdafc",
  face:ninja?"#12141b":"#f9fcff",
  accent:ninja?"#e72640":"#198fe8",
  eye:"#0b0d15",
  suit:ninja?"#12141c":"#111a29",
  armor:ninja?"#14161f":"#162131",
  trim:ninja?"#9b1c2c":"#1768af",
  hair:ninja?"#12141b":"#f9fcff",
  metal:"#dfe8f0"
 };
}

/**
 * Solid 2D capsules for WebGL. WebGL ignores LineBasicMaterial.linewidth on
 * many Android GPUs, so real triangles (not thick lines) are required.
 * A narrow rectangle and two four-facet round caps make each stroke.
 * The generated geometry is purely visual and does not affect hitboxes.
 */
export function capsulePositions(segments:readonly Segment[],width:number,reuse?:Float32Array):Float32Array{
 const size=segments.length*90;
 const positions=reuse?.length===size?reuse:new Float32Array(size);
 const radius=width*.5;
 let offset=0;
 const triangle=(ax:number,ay:number,bx:number,by:number,cx:number,cy:number)=>{
  positions[offset++]=ax;positions[offset++]=ay;positions[offset++]=0;
  positions[offset++]=bx;positions[offset++]=by;positions[offset++]=0;
  positions[offset++]=cx;positions[offset++]=cy;positions[offset++]=0;
 };
 // Four-segment semicircles; the trigonometric coefficients are constants.
 const c=[0,Math.SQRT1_2,1,Math.SQRT1_2,0];
 const si=[-1,-Math.SQRT1_2,0,Math.SQRT1_2,1];
 for(const [a,b] of segments){
  const dx=b[0]-a[0],dy=b[1]-a[1],len=Math.hypot(dx,dy);
  if(len<1e-7){positions.fill(0,offset,offset+90);offset+=90;continue;}
  const ux=dx/len,uy=dy/len,nx=-uy,ny=ux;
  const ax=a[0]+nx*radius,ay=a[1]+ny*radius;
  const bx=a[0]-nx*radius,by=a[1]-ny*radius;
  const cx=b[0]+nx*radius,cy=b[1]+ny*radius;
  const dx2=b[0]-nx*radius,dy2=b[1]-ny*radius;
  triangle(ax,ay,bx,by,cx,cy);
  triangle(cx,cy,bx,by,dx2,dy2);
  for(let end=0;end<2;end++){
   const x=end?b[0]:a[0],y=end?b[1]:a[1],direction=end?1:-1;
   for(let step=0;step<4;step++){
    const x1=x+radius*(direction*ux*c[step]+nx*si[step]);
    const y1=y+radius*(direction*uy*c[step]+ny*si[step]);
    const x2=x+radius*(direction*ux*c[step+1]+nx*si[step+1]);
    const y2=y+radius*(direction*uy*c[step+1]+ny*si[step+1]);
    triangle(x,y,x1,y1,x2,y2);
   }
  }
 }
 return positions;
}
export function segmentPositions(segments:readonly Segment[]) {
 const data=new Float32Array(segments.length*6);
 segments.forEach(([a,b],i)=>data.set([a[0],a[1],0,b[0],b[1],0],i*6));
 return data;
}
