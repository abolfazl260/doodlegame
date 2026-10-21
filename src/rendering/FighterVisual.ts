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
 // The Viking has a horned metal helmet, not a blue/red headband.
 if(!["soldier","ninja"].includes(s.characterId))return [];
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
 else if(weapon==='blaster'||weapon==='uzi'||weapon==='missile'||weapon==='grapple') {
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
  // Generic shoulder ticks belong only to the original simple stick skins.
  // Drawing them under the Ranger/Pharaoh/Knight layered costumes leaves
  // disconnected black strokes sticking out beside the shoulders.
  if(s.characterId==="soldier"||s.characterId==="ninja"||s.characterId==="viking")
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
   // Skin is cosmetic: Soldier and Ninja wield the same blade geometry.
   // Weapon selection, not character appearance, determines weapon size.
   rect(-.24,-.065,.35,.13);rect(-.285,-.085,.075,.17);
   path([[.10,-.18],[.18,-.18],[.18,.18],[.10,.18],[.10,-.18]]);
   path([[.19,-.105],[.84,-.105],[1.06,0],[.84,.105],[.19,.105],[.19,-.105]]);
   line([.26,0],[.96,0]);
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
 // Heavy special costumes paint their own breastplate, sleeves, cape and belt.
 // Do not draw the old vest/gear/neck trim underneath: the duplicate geometry
 // emerges as dark loose strokes at both sides of the animated fighters.
 if(["ranger","pharaoh","knight","mummy","archer"].includes(_s.characterId))
  return {vest:[] as Segment[],gear:[] as Segment[],trim:[] as Segment[],hair:[] as Segment[]};
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

/** Layered Viking helmet, curved ivory horns, gold ironwork and light fur armor.
 * These are purely visual local pose coordinates; no hitbox or weapon state changes.
 * Shared by the Canvas and WebGL renderers, with reusable GPU meshes.
 */
export function vikingSkinLayers(s:DuelistRenderState,pose:ReturnType<typeof fighterVisual>):readonly {
 color:string; width:number; segments:readonly Segment[];
}[]{
 if(s.characterId!=="viking")return [];
 const [hx,hy]=pose.head;
 const point=(dx:number,dy:number):Point=>[hx+dx,hy+dy];
 const p=(coords:readonly [number,number][]):Segment[]=>coords.slice(1).map((b,i)=>[point(...coords[i]),point(...b)]);
 const helmet=p([[-.275,.11],[-.24,.24],[-.12,.3],[0,.325],[.12,.3],[.24,.24],[.275,.11]]);
 const leftHorn=p([[-.25,.15],[-.40,.21],[-.48,.33],[-.48,.45],[-.42,.54]]);
 const rightHorn=p([[.25,.15],[.40,.21],[.48,.33],[.48,.45],[.42,.54]]);
 const band=p([[-.275,.09],[.275,.09]]);
 const ridge=p([[0,-.12],[0,.29]]);
 const rivets:Segment[]=[...[-.19,-.09,.09,.19].map(x=>[point(x,.09),point(x,.103)] as Segment)];
 const [sx,sy]=pose.body[0][1];
 const fur:Segment[]=[
  [[sx-.11,sy+.01],[sx-.33,sy+.015]],[[sx-.33,sy+.015],[sx-.46,sy-.12]],
  [[sx+.11,sy+.01],[sx+.33,sy+.015]],[[sx+.33,sy+.015],[sx+.46,sy-.12]]
 ];
 const furTips:Segment[]=[
  [[sx-.23,sy+.035],[sx-.39,sy-.095]],
  [[sx+.23,sy+.035],[sx+.39,sy-.095]]
 ];
 const boots:Segment[]= [pose.body[2],pose.body[4]].map(([a,b])=>[
  [a[0]+(b[0]-a[0])*.76,a[1]+(b[1]-a[1])*.76],b
 ]);
 const belt:Segment[]=[[[-.19,.04],[.18,.04]]];
 const goldBuckle:Segment[]=[[[-.035,-.02],[.035,-.02]],[[.035,-.02],[.035,.08]],[[.035,.08],[-.035,.08]],[[-.035,.08],[-.035,-.02]]];
 return [
  {color:"#07090d",width:.145,segments:[...helmet,...leftHorn,...rightHorn,...fur,...boots,...belt]},
  {color:"#3a434d",width:.085,segments:helmet},
  {color:"#f4e6c8",width:.081,segments:[...leftHorn,...rightHorn]},
  {color:"#dbad4c",width:.067,segments:[...band,...ridge,...goldBuckle]},
  {color:"#8c603b",width:.155,segments:fur},
  {color:"#a67545",width:.092,segments:boots},
  {color:"#edd8b5",width:.054,segments:furTips},
  {color:"#8c5e27",width:.028,segments:rivets}
 ];
}


/** Detailed cosmetic armor for the reference Ranger, Pharaoh and Knight artwork.
 * Pose-space lines follow the live head, shoulders and moving limbs. They are
 * visual-only: weapons, stats, hitboxes and movement remain character-neutral.
 * Colors and proportions are deliberately shared by Canvas and WebGL.
 */
export function characterSkinLayers(s:DuelistRenderState,pose:ReturnType<typeof fighterVisual>):
 readonly {color:string;width:number;segments:readonly Segment[]}[]{
 if(s.characterId==="viking")return vikingSkinLayers(s,pose);
 if(s.characterId==="soldier"||s.characterId==="ninja")return [];
 const [hx,hy]=pose.head;
 const path=(points:readonly Point[]):Segment[]=>points.slice(1).map((v,i)=>[points[i],v]);
 const head=(points:readonly Point[]):Segment[]=>
  path(points.map(([x,y])=>[hx+x,hy+y] as Point));
 const line=(a:Point,b:Point):Segment[]=>[[a,b]];
 const leg=[pose.body[2],pose.body[4]] as const;
 const arm=[pose.body[6],pose.body[8]] as const;
 const feet=leg.map(([a,b])=>[
  [a[0]+(b[0]-a[0])*.73,a[1]+(b[1]-a[1])*.73],b
 ] as Segment);
 const cuffs=arm.map(([a,b])=>[
  [a[0]+(b[0]-a[0])*.6,a[1]+(b[1]-a[1])*.6],b
 ] as Segment);
 const layer=(color:string,width:number,segments:readonly Segment[])=>({color,width,segments});
 // Wrap strips and cuffs sit on animated limbs, not on unrelated fixed world
 // coordinates. Each cosmetic segment travels with the underlying 9-part rig.
 const strip=(part:Segment,t:number,spread=.075):Segment=>{
  const [a,b]=part,x=a[0]+(b[0]-a[0])*t,y=a[1]+(b[1]-a[1])*t;
  const dx=b[0]-a[0],dy=b[1]-a[1],len=Math.hypot(dx,dy)||1;
  return [[x-dy/len*spread,y+dx/len*spread],[x+dy/len*spread,y-dx/len*spread]];
 };
 if(s.characterId==="mummy"){
  // Reference: wrapped ivory head, one cyan eye, asymmetrical trailing bandage,
  // crossing linen torso, golden cuffs and turquoise-gold central belt gem.
  const wrapContour=head([[-.29,-.13],[-.32,.13],[-.20,.30],[.03,.35],[.25,.22],[.31,.05],[.28,-.20]]);
  const forehead=head([[-.27,.23],[-.09,.32],[.16,.28],[.29,.18]]);
  const wraps=head([[-.31,.085],[-.09,.23],[.24,.12]]).concat(
   head([[-.28,-.08],[-.04,.04],[.27,-.045]]),
   head([[-.26,-.24],[.045,-.09],[.27,-.15]]),
   head([[-.18,.31],[.09,.17],[.29,.07]]));
  const eye=head([[.03,-.075],[.10,-.04],[.185,-.005]]);
  const loose=head([[-.29,.16],[-.40,.085],[-.38,-.045],[-.50,-.12]]);
  const looseEdge=head([[-.40,.085],[-.51,.055],[-.47,-.04]]);
  const chest=path([[-.21,.22],[-.14,-.19],[.16,-.19],[.24,.22]]);
  const crossover=path([[-.23,.16],[.16,-.14]]).concat(path([[.25,.15],[-.14,-.14]]));
  const shirtFolds=path([[-.16,.13],[.16,.055]]).concat(path([[-.17,-.05],[.15,-.12]]));
  const belt=line([-.20,-.20],[.21,-.20]);
  const buckle=path([[-.065,-.255],[.065,-.255],[.065,-.155],[-.065,-.155],[-.065,-.255]]);
  const loin=path([[-.105,-.27],[-.13,-.54],[0,-.72],[.13,-.54],[.105,-.27]]);
  const shinWraps=leg.flatMap(part=>[strip(part,.34,.08),strip(part,.47,.08),strip(part,.62,.075)]);
  const wristWraps=arm.flatMap(part=>[strip(part,.64,.065),strip(part,.78,.06)]);
  const limbOutline=[...feet,...cuffs];
  const legBand=leg.map(part=>strip(part,.79,.085));
  const gem=line([-.017,-.205],[.017,-.205]);
  return [
   layer("#070d13",.18,[...wrapContour,...loose,...chest,...loin]),
   layer("#e8dfc8",.155,[...wrapContour,...forehead,...loose]),
   layer("#f9f2e2",.083,[...wraps,...crossover,...shirtFolds]),
   layer("#b4a99a",.048,head([[-.23,.14],[.14,.065],[.27,.11]])),
   layer("#020b13",.142,head([[-.045,-.07],[.22,-.07]])),
   layer("#2ce8f4",.072,eye),
   layer("#e6d8bc",.144,[...chest,...loin]),
   layer("#f8f1df",.105,shinWraps),
   layer("#f5e9d2",.092,wristWraps),
   layer("#cfc2aa",.062,[...looseEdge,...shirtFolds,...legBand]),
   layer("#b78731",.092,[...belt,...limbOutline]),
   layer("#f0ba49",.06,buckle),
   layer("#23d7f1",.06,gem),
   layer("#fff8e9",.049,[...legBand,...head([[-.16,.28],[.04,.34]])])
  ];
 }
 if(s.characterId==="archer"){
  // Reference: olive hood with gold piping, white narrow eye, deep-green
  // cape/scarf, back-mounted quiver of bright green arrows, leather gear.
  // Quiver/arrows are ornamentation ONLY, independent of equipped weapons.
  const hood=head([[-.30,-.16],[-.37,.075],[-.21,.32],[.04,.46],[.24,.34],[.36,.11],[.31,-.17]]);
  const hoodRim=head([[-.31,-.075],[-.23,.17],[.04,.36],[.27,.17],[.33,-.05]]);
  const hoodInset=head([[-.27,-.12],[-.20,.105],[.04,.26],[.24,.11],[.27,-.13]]);
  const eye=head([[-.16,-.11],[.015,-.085],[.17,-.055]]);
  const cape=path([[-.24,.23],[-.40,.06],[-.42,-.27],[-.37,-.49],[-.18,-.40]]);
  const capeHem=path([[-.37,-.49],[-.28,-.42],[-.18,-.46],[-.09,-.36]]);
  const scarf=path([[-.30,.21],[-.13,.10],[.1,.11],[.28,.24]]);
  const shoulders=path([[-.19,.22],[-.30,.205],[-.38,.07]]).concat(
   path([[.18,.22],[.30,.19],[.36,.09]]));
  const quiver=path([[-.28,.23],[-.42,.36],[-.55,.24],[-.43,-.035]]);
  const quiverRim=line([-.43,.35],[-.55,.24]);
  const arrows=path([[-.46,.27],[-.58,.47]]).concat(path([[-.43,.27],[-.49,.50]]),
   path([[-.39,.23],[-.40,.49]]));
  const arrowTips=[...path([[-.63,.42],[-.58,.50],[-.51,.46]]),...path([[-.54,.45],[-.50,.53],[-.46,.47]]),
   ...path([[-.45,.44],[-.40,.53],[-.36,.45]])];
  const chest=path([[-.22,.14],[-.17,-.24],[.19,-.24],[.24,.14]]);
  const strap=path([[-.29,.17],[-.02,-.07],[.20,-.23]]);
  const belt=line([-.235,-.22],[.23,-.22]);
  const buckle=path([[-.055,-.275],[.055,-.275],[.055,-.165],[-.055,-.165],[-.055,-.275]]);
  const cloakPanels=path([[-.21,-.23],[-.27,-.47],[-.16,-.62]]).concat(
   path([[.18,-.23],[.28,-.47],[.16,-.62]]));
  const knees=leg.map(part=>strip(part,.47,.105));
  const forearms=arm.map(part=>strip(part,.76,.085));
  return [
   layer("#07130d",.183,[...hood,...cape,...quiver,...chest]),
   layer("#315737",.147,[...cape,...capeHem,...cloakPanels]),
   layer("#263c23",.177,hood),
   layer("#65884b",.112,hoodInset),
   layer("#d6ad50",.064,hoodRim),
   layer("#030b0d",.142,head([[-.18,-.11],[.21,-.11]])),
   layer("#f9ffed",.064,eye),
   layer("#5a8e39",.095,[...scarf,...shoulders,...knees]),
   layer("#754726",.10,[...quiver,...strap,...belt,...feet,...cuffs]),
   layer("#a57539",.061,[...quiverRim,...forearms]),
   layer("#c69341",.051,buckle),
   layer("#6ca844",.068,arrows),
   layer("#b5e657",.062,arrowTips),
   layer("#a9c96c",.033,head([[.12,.25],[.22,.17]]))
  ];
 }
 if(s.characterId==="ranger"){
  // Ranger is an ice-blue high-tech scout, not an olive hooded archer.
  // Angular helmet, cyan visor, radio aerial and armored field jacket.
  const helmet=head([[-.32,-.15],[-.35,.075],[-.22,.30],[-.04,.41],[.17,.38],[.32,.20],[.34,-.10],[.19,-.23]]);
  const brow=head([[-.33,.07],[-.20,.23],[.065,.31],[.31,.14]]);
  const visor=head([[-.255,-.055],[-.15,.015],[.02,.038],[.22,.01],[.265,-.085]]);
  const cheek=head([[-.22,-.115],[-.095,-.22],[.11,-.23],[.24,-.12]]);
  const aerial=head([[-.29,.24],[-.43,.35],[-.43,.60]]);
  const aerialTip=head([[-.485,.60],[-.375,.60]]);
  const earpiece=head([[-.34,.025],[-.41,-.03],[-.375,-.15]]);
  const jacket=path([[-.20,.28],[-.26,.04],[-.19,-.25],[.19,-.25],[.27,.04],[.20,.28]]);
  const coatTail=path([[-.22,.14],[-.38,-.02],[-.36,-.35],[-.24,-.47],[-.17,-.31]]);
  const chestPlates=path([[-.18,.18],[-.02,.13],[0,-.12],[-.16,-.18]]).concat(
   path([[.18,.18],[.025,.13],[0,-.12],[.17,-.18]]));
  const centerSeam=line([0,.12],[0,-.21]);
  const pauldron=path([[-.17,.27],[-.33,.32],[-.42,.17],[-.31,.07]]).concat(
   path([[.18,.27],[.31,.26],[.38,.12],[.28,.035]]));
  const shoulderLights=line([-.33,.22],[-.24,.18]).concat(line([.28,.20],[.35,.13]));
  const band=line([-.23,-.23],[.22,-.23]);
  const buckle=path([[-.065,-.28],[.065,-.28],[.065,-.18],[-.065,-.18],[-.065,-.28]]);
  const shins=leg.map(part=>strip(part,.47,.106));
  const boots=leg.map(part=>strip(part,.78,.093));
  const gauntlets=arm.map(part=>strip(part,.75,.086));
  return [
   layer("#041321",.174,[...helmet,...jacket,...coatTail,...pauldron]),
   layer("#143d58",.173,[...coatTail,...jacket]),
   layer("#25617f",.136,[...chestPlates,...centerSeam]),
   layer("#455f77",.194,helmet),
   layer("#09263b",.156,[...visor,...cheek]),
   layer("#43e5f0",.091,visor),
   layer("#b6d0df",.062,[...brow,...earpiece]),
   layer("#5d7b93",.092,cheek),
   layer("#1596b4",.130,pauldron),
   layer("#263d54",.101,[...band,...gauntlets,...boots]),
   layer("#a2c2d5",.104,[...shins,...aerial]),
   layer("#ff9c58",.067,[...buckle,...aerialTip]),
   layer("#65f6ed",.065,[...shoulderLights,...centerSeam]),
   layer("#eefcff",.034,head([[-.165,.015],[.04,.03],[.18,.005]]))
  ];
 }
 if(s.characterId==="pharaoh"){
  const crown=head([[-.35,-.02],[-.34,.28],[-.17,.43],[0,.52],[.16,.43],[.34,.28],[.35,-.02]]);
  const leftNemes=head([[-.29,.22],[-.50,.02],[-.43,-.34],[-.30,-.52]]);
  const rightNemes=head([[.29,.22],[.5,.02],[.43,-.34],[.30,-.52]]);
  const nemesBands=head([[-.435,.04],[-.31,.045]]).concat(head([[.30,.045],[.435,.04]]),
    head([[-.45,-.12],[-.31,-.12]]),head([[.31,-.12],[.45,-.12]]),
    head([[-.42,-.3],[-.29,-.3]]),head([[.29,-.3],[.42,-.3]]));
  const centerBand=head([[0,.47],[0,.16]]);
  const collar=path([[-.27,.36],[-.19,.20],[0,.11],[.18,.20],[.27,.36]]);
  const broadCollar=path([[-.27,.27],[0,.07],[.27,.27]]);
  const skirt=path([[-.2,-.23],[-.16,-.55],[0,-.78],[.15,-.55],[.19,-.23]]);
  const loin=path([[0,-.25],[0,-.73]]);
  // Narrow cloth folds stay within the kilt. The original wide V shapes
  // projected outside the legs as large detached white zigzags.
  const whitePanels=path([[-.16,-.29],[-.19,-.55],[-.11,-.60]]).concat(
   path([[.16,-.29],[.19,-.55],[.11,-.60]]));
  const belt=line([-.24,-.20],[.24,-.20]);
  const jewels=head([[0,.27],[0,.3]]);
  const wrists=cuffs;
  const boots=feet;
  return [
   layer("#060c19",.21,[...leftNemes,...rightNemes,...crown,...skirt]),
   layer("#d6a13b",.17,[...leftNemes,...rightNemes]),
   layer("#0754a1",.075,nemesBands),
   layer("#f5d06c",.074,[...crown,...centerBand]),
   layer("#07101c",.13,head([[-.18,-.09],[.19,-.09]])),
   layer("#f7c54d",.14,[...collar,...broadCollar]),
   layer("#064791",.074,broadCollar),
   layer("#32e8ff",.064,[...jewels,...head([[0,-.13],[0,-.1]])]),
   layer("#c9902b",.095,[...belt,...wrists]),
   layer("#f0c46b",.15,skirt),
   layer("#0b4c96",.092,loin),
   layer("#fff3da",.054,whitePanels),
   layer("#e7ba56",.094,boots),
   layer("#63e9fc",.049,[...head([[-.02,.28],[.02,.28]]),...line([-.02,-.2],[.02,-.2])])
  ];
 }
 // Knight: full iron visored helm, crimson plume/cape, gold-edged armor.
 const helmet=head([[-.28,-.24],[-.31,.18],[-.18,.36],[0,.43],[.2,.32],[.31,.15],[.29,-.2]]);
 const helmetPlate=head([[-.24,.12],[.22,.12],[.25,-.19],[-.24,-.19],[-.24,.12]]);
 const visor=head([[-.2,.02],[-.14,-.12],[-.02,-.18],[.12,-.12],[.20,.02]]);
 const visorSlits=head([[-.12,.04],[-.10,-.16]]).concat(head([[0,.04],[0,-.18]]),head([[.12,.04],[.10,-.16]]));
 const plume=head([[-.08,.38],[-.12,.56],[-.29,.60],[-.42,.50],[-.55,.31],[-.39,.35],[-.22,.41]]);
 const cape=path([[-.24,.30],[-.45,.10],[-.48,-.43],[-.59,-.76],[-.24,-.65]]).concat(
  path([[.24,.30],[.40,.12],[.46,-.40],[.39,-.69]]));
 const chest=path([[-.25,.25],[-.19,-.10],[0,-.19],[.2,-.10],[.27,.25]]);
 const pauldrons=path([[-.17,.32],[-.40,.27],[-.48,.12]]).concat(
  path([[.17,.32],[.39,.28],[.48,.13]]));
 const scarf=path([[-.30,.35],[0,.22],[.29,.35]]);
 const belt=line([-.25,-.21],[.25,-.21]);
 const buckle=path([[-.06,-.28],[.06,-.28],[.06,-.15],[-.06,-.15],[-.06,-.28]]);
 const knees=leg.map(([a,b])=>[
  [a[0]+(b[0]-a[0])*.35,a[1]+(b[1]-a[1])*.35],
  [a[0]+(b[0]-a[0])*.54,a[1]+(b[1]-a[1])*.54]
 ] as Segment);
 return [
  layer("#170c15",.17,[...cape,...plume]),
  layer("#b91f30",.173,cape),
  layer("#1b202a",.20,[...helmet,...chest,...pauldrons]),
  layer("#aeb8c5",.158,[...helmetPlate,...chest]),
  layer("#dce3ea",.088,helmet),
  layer("#101720",.107,visor),
  layer("#384554",.048,visorSlits),
  layer("#d5a946",.057,[...helmet,...pauldrons,...belt,...buckle]),
  layer("#efb743",.079,[...pauldrons,...knees]),
  layer("#d52937",.10,[...plume,...scarf]),
  layer("#f34b52",.066,head([[-.08,.44],[-.26,.51],[-.45,.43]])),
  layer("#e0a83f",.097,[...cuffs,...feet]),
  layer("#8a929e",.089,knees),
  layer("#fff0bd",.037,head([[-.16,.285],[0,.34],[.13,.285]]))
 ];
}

/** Distinct colored inlays for every equipped weapon. */
export function weaponAccentColor(s:DuelistRenderState):string {
 switch(weaponDrawPose(s).weapon){
  case "blade":return "#f5bf35";
  case "hammer":return "#f1ba38";
  case "blaster":return "#f04454";
  case "uzi":return "#59d84f";
  case "bow":return "#f6c235";
  case "boomerang":return "#3ea7ff";
  case "bomb":return "#ff9a3d";
  case "missile":return "#ef4040";
  case "spear":return "#f6bf35";
  case "grapple":return "#f3c967";
 }
}
export function weaponAccentSegments(s:DuelistRenderState):Segment[]{
 if(s.grabPhase!==null&&s.grabPhase!==undefined)return [];
 switch(weaponDrawPose(s).weapon){
  case "blade":return [
   [[.14,-.18],[.14,.18]],[[-.24,-.08],[-.24,.08]]
  ];
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
  case "blade":return [
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
 const palettes={
  soldier:{core:enemy?"#182333":"#0c1827",halo:"#9bdafc",face:"#f9fcff",accent:"#198fe8",suit:"#111a29",armor:"#162131",trim:"#1768af"},
  ninja:{core:enemy?"#171921":"#0b0e15",halo:"#f18088",face:"#12141b",accent:"#e72640",suit:"#12141c",armor:"#14161f",trim:"#9b1c2c"},
  viking:{core:enemy?"#17191e":"#0c1017",halo:"#b18b59",face:"#10131a",accent:"#d8ac4b",suit:"#11151c",armor:"#29262a",trim:"#ba8b48"},
  ranger:{core:enemy?"#152c40":"#0b1c2c",halo:"#66e4ef",face:"#061421",accent:"#43e5f0",suit:"#142d43",armor:"#25617f",trim:"#ff9c58"},
  pharaoh:{core:enemy?"#1c2231":"#0d1628",halo:"#dcb964",face:"#060b12",accent:"#34ddf7",suit:"#121d30",armor:"#12417a",trim:"#e3b74e"},
  knight:{core:enemy?"#282a33":"#141925",halo:"#d9a7a7",face:"#252c38",accent:"#e3b957",suit:"#303441",armor:"#788593",trim:"#bd3345"},
  mummy:{core:enemy?"#242326":"#141718",halo:"#e8dfc6",face:"#111317",accent:"#23d7f1",suit:"#39332f",armor:"#e5dbc8",trim:"#bc8a3b"},
  archer:{core:enemy?"#263129":"#151f18",halo:"#9dc277",face:"#0b1510",accent:"#b5e657",suit:"#14251a",armor:"#325a32",trim:"#d6ad50"}
 } as const;
 const style=palettes[characterId];
 return {...style,outline:"#050a12",eye:"#0b0d15",hair:style.face,metal:"#dfe8f0"};
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
