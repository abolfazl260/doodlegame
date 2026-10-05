import type {DuelistRenderState} from '../gameplay/GameSession';
export type Point = readonly [number, number];
export type Segment = readonly [Point, Point];
const clamp=(v:number)=>Math.max(0,Math.min(1,v));
export function attackDuration(weapon:DuelistRenderState['weapon']) {
 return weapon==='hammer'?.24:weapon==='blade'||weapon==='bow'||weapon==='missile'?.22:.14;
}
/** World-space, articulated monochrome pose shared by WebGL and Canvas. */
export function fighterVisual(s:DuelistRenderState) {
 const speed=clamp(Math.abs(s.velocityX)/8), air=!s.grounded;
 const phase=s.gaitPhase, stride=air?0:Math.sin(phase)*speed;
 const land=clamp(s.landingTime/.18), hit=clamp(s.hitTime/.22);
 const progress=clamp(1-s.attackTime/attackDuration(s.weapon));
 const swing=s.attackTime>0?Math.sin(progress*Math.PI):0;
 const breathe=Math.sin(s.animationTime*2.8)*.018;
 const hip:Point=[0,-.05-land*.15], shoulder:Point=[-.04,.4+breathe-land*.15];
 const head:Point=[-.02,.82+breathe-land*.15];
 const joints:Segment[]=[[hip,shoulder]];
 const add=(a:Point,b:Point,c:Point)=>joints.push([a,b],[b,c]);
 for(const side of [-1,1]) {
  const step=stride*side;
  const foot:Point=air?[side*.32,-.52+(s.velocityY>0?.14:0)]:[side*.25+step*.42,-.9+Math.max(0,step)*.2];
  const knee:Point=[side*.18+step*.16,-.43+(air?.14:land*.12)];
  add(hip,knee,foot);
 }
 let hand:Point=[.46,.03];
 let back:Point=[-.45-stride*.16,.05+stride*.1];
 let toolAngle=Math.sin(phase)*speed*.06;
 if(s.weapon==='blade'||s.weapon==='hammer') {
  const angles=s.weapon==='hammer'?(s.attackVariant===2?[.9,-1.2]:[-1.1,1.25]):(s.attackVariant===0?[.9,-1.2]:[-1.15,1.1]);
  toolAngle=s.attackTime>0?angles[0]+swing*(angles[1]-angles[0]):-.35;
  if(s.weapon==='blade'&&s.attackVariant===2)toolAngle=-toolAngle;
  if(s.weapon==='blade'&&s.attackVariant===3)toolAngle=.08;
  hand=[.34+swing*.18,.09+swing*.08];
 } else if(s.weapon==='bow') {hand=[.45,.22];back=[.1-s.bowCharge*.3,.22];toolAngle=0;}
 else if(s.weapon==='blaster'||s.weapon==='uzi'||s.weapon==='missile') {
  hand=[.43-swing*.09,.18+swing*.03];back=[.23-swing*.09,.12];
  toolAngle=s.weapon==='missile'?s.missileAngle*Math.PI/180:swing*.09;
 } else {hand=[.45-swing*.2,.05+swing*.3];toolAngle=-swing*.8;}
 if(air&&s.attackTime<=0&&s.weapon!=='bow'){back=[-.48,s.velocityY>0?.32:-.15];}
 if(Math.abs(s.velocityX)>9){back=[-.62,.28];}
 add([-.18,shoulder[1]],[-.3,.19],back);
 add([.18,shoulder[1]],[.32,.2],hand);
 const scale=s.enemyType==='boss'?1.18:s.enemyType==='tank'?1.08:1;
 const squash=land*.16;
 const lean=s.velocityX*s.facing*.012-hit*.18+(air?-s.velocityY*.008:0);
 return {joints,head,hand,toolAngle,swing,scale,scaleX:1+squash,scaleY:1-squash,lean,hit,land};
}
/** Each segment is a real pair of 3D vertices; buffers are sized from these arrays. */
export function toolSegments(s:DuelistRenderState):Segment[] {
 const lines:Segment[]=[];
 const line=(a:Point,b:Point)=>lines.push([a,b]);
 const path=(points:Point[])=>{for(let i=1;i<points.length;i++)line(points[i-1],points[i]);};
 const rect=(x:number,y:number,w:number,h:number)=>path([[x,y],[x+w,y],[x+w,y+h],[x,y+h],[x,y]]);
 switch(s.weapon) {
  case 'blade':
   rect(-.12,-.045,.25,.09);line([.12,-.16],[.12,.16]);
   path([[.15,-.08],[.78,-.07],[1.02,0],[.78,.07],[.15,.08]]);line([.2,0],[.88,0]);
   for(let x=-.08;x<.1;x+=.06)line([x,-.04],[x+.03,.04]);break;
  case 'hammer':
   rect(-.12,-.035,.7,.07);rect(.52,-.23,.38,.46);rect(.57,-.16,.28,.32);
   for(let x=0;x<.3;x+=.07)line([x,-.06],[x+.03,.06]);
   line([.63,-.12],[.77,.12]);line([.77,-.12],[.63,.12]);break;
  case 'blaster':case 'uzi': {
   const length=s.weapon==='uzi'?.42:.54;
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
   rect(-.05,.18,.1,.07);path([[0,.25],[.09,.31],[.06,.4]]);break;
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
