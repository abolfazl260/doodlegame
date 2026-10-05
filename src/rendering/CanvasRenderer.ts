import type {Renderer} from "./Renderer";
import type {GameRenderState,DuelistRenderState} from "../gameplay/GameSession";
export class CanvasRenderer implements Renderer{
 private readonly context:CanvasRenderingContext2D;private width=1;private height=1;private dpr=1;private playerVisual={x:0,y:0,ready:false};private opponentVisual={x:0,y:0,ready:false};private cameraX=0;private cameraY=0;
 constructor(private readonly canvas:HTMLCanvasElement){const c=canvas.getContext("2d");if(!c)throw new Error("2D canvas rendering is unavailable.");this.context=c;this.resize();}
 resize(){this.width=Math.max(1,this.canvas.clientWidth);this.height=Math.max(1,this.canvas.clientHeight);this.dpr=Math.min(window.devicePixelRatio||1,2);this.canvas.width=Math.floor(this.width*this.dpr);this.canvas.height=Math.floor(this.height*this.dpr);}
 render(state:GameRenderState){const playerDash=Math.abs(state.player.velocityX)>9;const opponentDash=Math.abs(state.opponent.velocityX)>9;const ps=this.playerVisual,os=this.opponentVisual;if(!ps.ready){ps.x=state.player.x;ps.y=state.player.y;ps.ready=true;}else{const b=playerDash?.46:state.player.grounded?.18:.24;ps.x+=(state.player.x-ps.x)*b;ps.y+=(state.player.y-ps.y)*b;}if(!os.ready){os.x=state.opponent.x;os.y=state.opponent.y;os.ready=true;}else{const b=opponentDash?.46:state.opponent.grounded?.18:.24;os.x+=(state.opponent.x-os.x)*b;os.y+=(state.opponent.y-os.y)*b;}const cx=(ps.x+os.x)*.5;const cy=(ps.y+os.y)*.5;this.cameraX+=(Math.max(-.9,Math.min(.9,cx*.10))-this.cameraX)*.08;this.cameraY+=(Math.max(-.5,Math.min(.7,(cy-3)*.08))-this.cameraY)*.08;const c=this.context;c.setTransform(this.dpr,0,0,this.dpr,0,0);c.fillStyle="#000";c.fillRect(0,0,this.width,this.height);const vh=10,vw=vh*this.width/Math.max(1,this.height),scale=this.height/vh,toX=(x:number)=>(x+vw/2-this.cameraX)*scale,toY=(y:number)=>(vh-y+this.cameraY)*scale;c.fillStyle="#777";if(state.arena==="fortress")this.drawFortress(c,scale,toX,toY);for(const p of state.platforms){c.fillStyle=p.surface==="ice"?"#999":p.surface==="slippery"?"#666":p.surface==="oneWay"?"#555":"#777";c.fillRect(toX(p.x),toY(p.y+p.height),p.width*scale,p.height*scale);if(p.surface==="ice"){c.strokeStyle="#fff";c.globalAlpha=.32;c.lineWidth=Math.max(1,scale*.025);c.beginPath();c.moveTo(toX(p.x),toY(p.y+p.height*.65));c.lineTo(toX(p.x+p.width*.35),toY(p.y+p.height*.15));c.moveTo(toX(p.x+p.width*.55),toY(p.y+p.height*.85));c.lineTo(toX(p.x+p.width),toY(p.y+p.height*.25));c.stroke();c.globalAlpha=1;}else if(p.surface==="slippery"){c.strokeStyle="#fff";c.globalAlpha=.22;c.lineWidth=Math.max(1,scale*.025);c.beginPath();c.moveTo(toX(p.x+.15),toY(p.y+p.height*.2));c.lineTo(toX(p.x+p.width-.15),toY(p.y+p.height*.8));c.stroke();c.globalAlpha=1;}else if(p.surface==="oneWay"){c.strokeStyle="#fff";c.globalAlpha=.38;c.lineWidth=Math.max(1,scale*.025);for(let x=p.x+.25;x<p.x+p.width-.1;x+=.65){c.beginPath();c.moveTo(toX(x),toY(p.y+p.height+.06));c.lineTo(toX(x+.18),toY(p.y+p.height+.02));c.stroke();}c.globalAlpha=1;}}this.drawEnvironment(c,state.environment,toX,toY,scale);this.draw(c,state.player,toX,toY,scale,false);this.draw(c,state.opponent,toX,toY,scale,true);c.fillStyle="#fff";for(const p of state.projectiles){
      const px=toX(p.x),py=toY(p.y);c.lineWidth=Math.max(1,scale*.035);
      if(p.weapon==="boomerang"){
        c.save();c.translate(px,py);c.rotate(p.rotation);c.beginPath();c.arc(0,0,Math.max(3,scale*.18),-.95,.95);c.stroke();c.beginPath();c.arc(0,0,Math.max(2,scale*.11),.95,2.15);c.stroke();c.restore();
      }else if(p.weapon==="bow"){const len=scale*.58;c.save();c.translate(px,py);c.rotate(p.rotation);c.lineWidth=Math.max(2,scale*.045);c.beginPath();c.moveTo(-len,0);c.lineTo(len,0);c.stroke();c.beginPath();c.moveTo(len,0);c.lineTo(len-scale*.16,-scale*.11);c.moveTo(len,0);c.lineTo(len-scale*.16,scale*.11);c.stroke();c.beginPath();c.moveTo(-len,0);c.lineTo(-len+scale*.11,-scale*.09);c.moveTo(-len,0);c.lineTo(-len+scale*.11,scale*.09);c.stroke();c.globalAlpha=.22;c.lineWidth=Math.max(1,scale*.03);c.beginPath();c.moveTo(-len*.85,0);c.lineTo(-len*1.65,0);c.stroke();c.restore();}else if(p.weapon==="missile"){const speed=Math.hypot(p.vx,p.vy);const trail=Math.max(scale*.55,Math.min(scale*1.9,scale*(.55+speed*.045)));const nx=speed>.01?p.vx/speed:1,ny=speed>.01?p.vy/speed:0;c.save();c.globalAlpha=.28;c.lineWidth=Math.max(2,scale*.075);c.beginPath();c.moveTo(px-nx*.10*scale,py-ny*.10*scale);c.lineTo(px-nx*trail,py-ny*trail);c.stroke();c.globalAlpha=.9;c.fillStyle="#fff";c.beginPath();c.arc(px-nx*trail,py-ny*trail,Math.max(2,scale*.055),0,Math.PI*2);c.fill();c.globalAlpha=.9;c.save();c.translate(px,py);c.rotate(p.rotation);const len=scale*.62;c.beginPath();c.moveTo(-len,0);c.lineTo(len,0);c.stroke();c.beginPath();c.moveTo(-len,0);c.lineTo(-len+scale*.14,-scale*.09);c.moveTo(-len,0);c.lineTo(-len+scale*.14,scale*.09);c.stroke();c.beginPath();c.moveTo(len,0);c.lineTo(len-scale*.12,-scale*.07);c.moveTo(len,0);c.lineTo(len-scale*.12,scale*.07);c.stroke();c.beginPath();c.moveTo(-len,0);c.lineTo(-len-scale*.18,-scale*.10);c.moveTo(-len,0);c.lineTo(-len-scale*.18,scale*.10);c.stroke();c.restore();}else if(p.weapon==="bomb"){
        const blink=p.life<.6&&Math.floor(p.life*18)%2===0;
        if(!blink){c.beginPath();c.arc(px,py,Math.max(3,scale*.12),0,Math.PI*2);c.fill();}
        c.beginPath();c.arc(px,py,Math.max(5,scale*(.16+(1-p.life/1.5)*.06)),0,Math.PI*2);c.stroke();
      }else{
        const r=Math.max(2,scale*.075),speed=Math.hypot(p.vx,p.vy),len=Math.max(scale*.12,Math.min(scale*.55,scale*.12+speed*scale*.018));
        c.beginPath();c.moveTo(px-Math.sign(p.vx)*len,py);c.lineTo(px,py);c.stroke();c.beginPath();c.arc(px,py,r,0,Math.PI*2);c.fill();
      }
    }this.drawExplosions(c,state.explosions,toX,toY,scale);}
 private drawExplosions(c:CanvasRenderingContext2D,items:GameRenderState["explosions"],toX:(x:number)=>number,toY:(y:number)=>number,scale:number){
  for(const e of items){
    const progress=Math.max(0,Math.min(1,e.age/e.life));
    const fade=1-progress;
    const x=toX(e.x),y=toY(e.y),r=e.radius*scale*(.55+progress*1.65);
    c.save();c.strokeStyle="#fff";c.fillStyle="#fff";c.lineWidth=Math.max(2,scale*.05);
    c.globalAlpha=.14*fade;c.beginPath();c.arc(x,y,r*.48,0,Math.PI*2);c.fill();
    c.globalAlpha=.92*fade;c.beginPath();c.arc(x,y,r*.72,0,Math.PI*2);c.stroke();
    c.globalAlpha=.78*fade;c.lineWidth=Math.max(2,scale*.035);c.beginPath();c.arc(x,y,r*.34,0,Math.PI*2);c.fill();
    c.restore();
  }
 }
 private drawEnvironment(c:CanvasRenderingContext2D,items:GameRenderState["environment"],toX:(x:number)=>number,toY:(y:number)=>number,scale:number){
  for(const e of items){if(!e.active)continue;const x=toX(e.x),y=toY(e.y);c.save();c.translate(x,y);c.rotate(e.rotation);const ratio=e.maxHp>0?Math.max(.38,e.hp/e.maxHp):1;c.scale(e.width*ratio*scale,e.height*ratio*scale);c.strokeStyle="#fff";c.fillStyle="#444";c.lineWidth=Math.max(1.5,1.8/Math.max(.2,Math.min(1,e.width)));if(e.kind==="barrel"){c.fillRect(-.5,-.5,1,1);c.strokeRect(-.5,-.5,1,1);c.fillStyle="#888";c.fillRect(-.5,-.26,1,.1);c.fillRect(-.5,.16,1,.1);}else if(e.kind==="box"){c.fillRect(-.5,-.5,1,1);c.strokeRect(-.5,-.5,1,1);c.beginPath();c.moveTo(-.42,-.42);c.lineTo(.42,.42);c.moveTo(.42,-.42);c.lineTo(-.42,.42);c.stroke();}else if(e.kind==="wall"){c.fillRect(-.5,-.5,1,1);c.strokeRect(-.5,-.5,1,1);for(let y2=-.3;y2<=.3;y2+=.3){c.beginPath();c.moveTo(-.42,y2);c.lineTo(.42,y2);c.stroke();}}else if(e.kind==="rock"){c.beginPath();c.moveTo(-.45,.25);c.lineTo(-.24,-.5);c.lineTo(.25,-.42);c.lineTo(.48,.12);c.lineTo(.12,.5);c.closePath();c.fill();c.stroke();c.beginPath();c.moveTo(-.18,-.05);c.lineTo(.03,.10);c.lineTo(-.08,.30);c.moveTo(.03,.10);c.lineTo(.25,.02);c.stroke();}else if(e.kind==="bounce"){c.fillRect(-.5,-.18,1,.36);c.strokeRect(-.5,-.18,1,.36);c.beginPath();c.moveTo(-.34,-.12);c.lineTo(-.17,.12);c.lineTo(0,-.12);c.lineTo(.17,.12);c.lineTo(.34,-.12);c.stroke();if(e.pulse>0){c.globalAlpha=.6*e.pulse;c.beginPath();c.arc(0,-.18,.48,0,Math.PI*2);c.stroke();}}else{c.fillRect(-.5,-.12,1,.24);c.strokeRect(-.5,-.12,1,.24);c.beginPath();for(let i=-3;i<=3;i++){c.moveTo(i*.14,-.1);c.lineTo(i*.14+.07,-.38);}c.stroke();}if(e.maxHp>1&&e.hp<e.maxHp){c.globalAlpha=.65;c.fillStyle="#fff";c.fillRect(-.5,-.64,1,.05);c.fillStyle="#000";c.fillRect(-.5,-.64,(1-Math.max(0,e.hp/e.maxHp)),.05);}if(e.pulse>0){c.globalAlpha=.35*e.pulse;c.beginPath();c.arc(0,0,Math.max(.55,.8*e.pulse),0,Math.PI*2);c.stroke();}c.restore();}
 }
 private drawFortress(c:CanvasRenderingContext2D,scale:number,toX:(x:number)=>number,toY:(y:number)=>number){c.save();c.fillStyle="#444";c.strokeStyle="#777";c.lineWidth=Math.max(1,scale*.04);for(const side of [-1,1]){const x=side*10.2;c.fillRect(toX(x-1.35),toY(2.95),2.7*scale,3.2*scale);for(let i=0;i<3;i++){const tx=side*(9.65+i*.75);c.fillRect(toX(tx-.375),toY(4.2),.75*scale,4.4*scale);}for(let i=0;i<5;i++){const mx=side*(8.95+i*.62);c.fillRect(toX(mx-.16),toY(4.38),.32*scale,.55*scale);}c.strokeRect(toX(side*8.1),toY(2.65),.95*scale,.35*scale);}c.restore();}
 private draw(c:CanvasRenderingContext2D,s:DuelistRenderState,toX:(x:number)=>number,toY:(y:number)=>number,scale:number,enemy:boolean){
  const x=toX(s.x),y=toY(s.y),dir=s.facing;
  const moving=Math.abs(s.velocityX)>.25;
  const speed=Math.min(1,Math.abs(s.velocityX)/8);
  const airborne=!s.grounded;
  const cycle=s.animationTime*(7+speed*5);
  const stride=moving&&s.grounded?Math.sin(cycle)*(.16+.1*speed):0;
  const bounce=moving&&s.grounded?Math.abs(Math.sin(cycle))*.025:0;
  const jumpPhase=airborne?Math.max(-1,Math.min(1,s.velocityY/9.2)):0;
  const lean=airborne?-jumpPhase*.08:(moving?s.velocityX/8*.06:0);
  const armSwing=moving&&s.grounded?Math.sin(cycle)*.18:0;
  const landing=Math.abs(s.velocityY)<1.5&&!s.grounded;
  const dash=Math.abs(s.velocityX)>9;
  const stretchY=airborne?(1+Math.min(.16,Math.abs(s.velocityY)*.012)):(dash?.78:1);
  const stretchX=airborne?(1-Math.min(.10,Math.abs(s.velocityY)*.007)):(dash?1.34:1);
  const enemyScale=enemy?(s.enemyType==="tank"?1.12:s.enemyType==="boss"?1.3:s.enemyType==="runner"?0.92:s.enemyType==="ninja"?0.96:1):1;const visualScale=.8;c.save();c.translate(x,y);c.scale(dir*enemyScale*stretchX*visualScale,enemyScale*stretchY*visualScale);c.rotate(lean);
  c.strokeStyle="#fff";c.fillStyle="#fff";c.lineWidth=Math.max(2,scale*.055);c.lineCap="round";c.lineJoin="round";
  if(!airborne&&Math.abs(s.velocityX)>1){c.save();c.globalAlpha=Math.min(.18,Math.abs(s.velocityX)/45);c.beginPath();c.ellipse(-dir*.34*scale,.95*scale,.48*scale,.07*scale,0,0,Math.PI*2);c.stroke();c.restore();}
  if(!airborne){c.save();c.globalAlpha=.12;c.beginPath();c.ellipse(0,.93*scale,(.28+Math.min(.55,Math.abs(s.velocityX)*.035))*scale,.055*scale,0,0,Math.PI*2);c.stroke();c.restore();}
  const hipY=.08-bounce,shoulderY=-.42-bounce,headY=-.82-bounce;
  c.beginPath();c.arc(0,headY*scale,.24*scale,0,Math.PI*2);c.fill();
  if(enemy){c.save();if(s.enemyType==="tank"||s.enemyType==="boss"){c.strokeStyle="#fff";c.lineWidth=Math.max(3,scale*.08);c.beginPath();c.moveTo(-.30*scale,-.42*scale);c.lineTo(-.38*scale,.30*scale);c.moveTo(.30*scale,-.42*scale);c.lineTo(.38*scale,.30*scale);c.stroke();}if(s.enemyType==="ninja"){c.strokeStyle="#fff";c.lineWidth=Math.max(2,scale*.045);c.beginPath();c.moveTo(-.30*scale,-.72*scale);c.lineTo(.30*scale,-.72*scale);c.stroke();}const headbandDrag=Math.min(1,Math.abs(s.velocityX)/8);const headbandAir=Math.min(1,Math.abs(s.velocityY)/9.2);const headbandWave=Math.sin(s.animationTime*11+(s.enemyType==="ninja"?1.7:.4));const headbandTilt=Math.max(-.18,Math.min(.18,s.velocityX*.012-s.velocityY*.006));c.fillStyle="#d11f2f";c.save();c.rotate(headbandTilt);c.fillRect(-.28*scale,(headY-.01)*scale,.56*scale,.10*scale);c.beginPath();const trailY=.12+headbandWave*(.05+.08*headbandDrag)+(-s.velocityY*.008);const trailReach=.52+.24*headbandDrag+.10*headbandAir;c.moveTo(-.18*scale,(headY+.02)*scale);c.lineTo((-trailReach)*scale,(headY+trailY)*scale);c.lineTo((-.80-.10*headbandDrag)*scale,(headY+.20+headbandWave*.06)*scale);c.lineTo(-.12*scale,(headY+.10)*scale);c.fill();c.beginPath();c.moveTo(.18*scale,(headY+.02)*scale);c.lineTo(trailReach*scale,(headY+trailY)*scale);c.lineTo((.80+.10*headbandDrag)*scale,(headY+.20+headbandWave*.06)*scale);c.lineTo(.12*scale,(headY+.10)*scale);c.fill();c.restore();c.restore();}
  const hipX=0,shoulderX=0;
  const legBack=-.28+stride,legFront=.28-stride;
  const footY=.9-bounce;
  c.beginPath();
  c.moveTo(hipX*scale,hipY*scale);c.lineTo(shoulderX*scale,shoulderY*scale);
  if(airborne){
   const tuck=Math.max(0,Math.min(1,Math.abs(jumpPhase)));
   c.moveTo(0,hipY*scale);c.lineTo((-0.28+tuck*.08)*scale,(.55-tuck*.18)*scale);
   c.moveTo(0,hipY*scale);c.lineTo((.28-tuck*.08)*scale,(.5-tuck*.12)*scale);
  }else{
   c.moveTo(0,hipY*scale);c.lineTo(legBack*scale,footY*scale);
   c.moveTo(0,hipY*scale);c.lineTo(legFront*scale,footY*scale);
  }
  const armOffset=airborne?-jumpPhase*.12:armSwing;
  c.moveTo(-.22*scale,shoulderY*scale);c.lineTo((-.42-armOffset)*scale,(airborne?-.02:.02)*scale);
  c.moveTo(.22*scale,shoulderY*scale);c.lineTo((.42+armOffset)*scale,(airborne?.04:-.02)*scale);
  c.stroke();
  if(dash){c.save();c.globalAlpha=.18;c.lineWidth=Math.max(2,scale*.04);c.beginPath();c.moveTo(-dir*.15*scale,.15*scale);c.lineTo(-dir*.85*scale,.15*scale);c.moveTo(-dir*.18*scale,.02*scale);c.lineTo(-dir*.72*scale,.02*scale);c.stroke();c.restore();}
  this.drawWeapon(c,s,scale);
  if(s.attackTime>0){
   const attack=Math.min(1,s.attackTime/.14);
   c.lineWidth=Math.max(2,scale*(.055+.025*(1-attack)));
   c.beginPath();c.moveTo(.28*scale,0);c.lineTo((.8+.35*(1-attack))*scale,(-.04-.1*(1-attack))*scale);c.stroke();
  }
  if(landing){c.globalAlpha=.35;c.beginPath();c.ellipse(0,.93*scale,.38*scale,.08*scale,0,0,Math.PI*2);c.stroke();}
  c.restore();
 }
 private drawWeapon(c:CanvasRenderingContext2D,s:DuelistRenderState,scale:number){
  c.save();c.strokeStyle="#fff";c.fillStyle="#fff";c.lineWidth=Math.max(2,scale*.055);c.lineCap="round";c.lineJoin="round";
  const attackProgress=s.attackTime>0?1-s.attackTime/(s.weapon==="hammer"?.24:s.weapon==="blade"?.22:.14):0;
  const snap=s.attackTime>0?Math.sin(Math.min(1,attackProgress)*Math.PI):0;
  const pulse=1+Math.sin(s.animationTime*18)*.04;
  c.beginPath();
  if(s.weapon==="blade"){
   const variant=s.attackVariant;
   c.save();c.rotate((variant===1?-1.05:variant===2?.62:variant===3?.04:.98)-(snap*(variant===2?1.8:2.1)));
   c.moveTo(.26*scale,0);c.lineTo(.38*scale,-.08*scale);
   c.moveTo(.36*scale,-.09*scale);c.lineTo(1.02*scale,-.13*scale);c.lineTo(1.18*scale,0);c.lineTo(1.02*scale,.13*scale);c.lineTo(.36*scale,.09*scale);
   c.moveTo(.32*scale,-.10*scale);c.lineTo(.32*scale,.10*scale);
   c.stroke();c.restore();
  }else if(s.weapon==="hammer"){
   c.save();c.rotate(-.78+snap*2.2+(s.attackVariant===1?.12:s.attackVariant===2?-.12:0));
   c.moveTo(.22*scale,0);c.lineTo(.86*scale,0);
   c.moveTo(.72*scale,-.23*scale);c.lineTo(1.06*scale,-.23*scale);c.lineTo(1.16*scale,-.08*scale);c.lineTo(1.16*scale,.16*scale);c.lineTo(1.04*scale,.28*scale);c.lineTo(.72*scale,.23*scale);c.closePath();
   c.moveTo(.70*scale,-.16*scale);c.lineTo(.70*scale,.16*scale);
   c.stroke();c.restore();
  }else if(s.weapon==="blaster"){
   c.strokeRect(.18*scale,-.13*scale,.48*scale,.24*scale);c.strokeRect(.28*scale,-.20*scale,.20*scale,.07*scale);c.strokeRect(.36*scale,-.08*scale,.14*scale,.08*scale);c.strokeRect(.42*scale,.11*scale,.12*scale,.23*scale);c.strokeRect(.68*scale,-.05*scale,.32*scale,.10*scale);c.beginPath();c.moveTo(.74*scale,-.05*scale);c.lineTo(.74*scale,.05*scale);c.moveTo(.82*scale,-.05*scale);c.lineTo(.82*scale,.05*scale);c.stroke();
   if(s.attackTime>0){c.globalAlpha=.9;c.beginPath();c.moveTo(1.02*scale,0);c.lineTo(1.34*scale,-.10*scale);c.lineTo(1.34*scale,.10*scale);c.closePath();c.stroke();}
  }else if(s.weapon==="uzi"){
   c.strokeRect(.18*scale,-.12*scale,.44*scale,.24*scale);c.strokeRect(.28*scale,-.19*scale,.18*scale,.07*scale);c.strokeRect(.36*scale,-.06*scale,.12*scale,.07*scale);c.strokeRect(.43*scale,.11*scale,.13*scale,.24*scale);c.strokeRect(.62*scale,-.05*scale,.20*scale,.10*scale);c.strokeRect(.82*scale,-.04*scale,.24*scale,.08*scale);c.beginPath();c.moveTo(.30*scale,-.12*scale);c.lineTo(.30*scale,.12*scale);c.moveTo(.54*scale,-.12*scale);c.lineTo(.54*scale,.12*scale);c.moveTo(.88*scale,-.04*scale);c.lineTo(.88*scale,.04*scale);c.stroke();
   if(s.attackTime>0){c.globalAlpha=.9;c.beginPath();c.moveTo(1.06*scale,0);c.lineTo(1.34*scale,-.09*scale);c.lineTo(1.34*scale,.09*scale);c.closePath();c.stroke();}
  }else if(s.weapon==="boomerang"){
   c.save();c.translate(.62*scale,0);c.rotate(s.animationTime*10+snap*1.8);
   c.beginPath();c.moveTo(-.58*scale,.03*scale);c.quadraticCurveTo(-.26*scale,-.36*scale,.12*scale,-.31*scale);c.quadraticCurveTo(.36*scale,-.28*scale,.44*scale,0);c.quadraticCurveTo(.36*scale,.28*scale,.12*scale,.31*scale);c.quadraticCurveTo(-.26*scale,.36*scale,-.58*scale,-.03*scale);c.stroke();
   c.beginPath();c.moveTo(-.33*scale,-.07*scale);c.lineTo(.14*scale,-.16*scale);c.moveTo(-.33*scale,.07*scale);c.lineTo(.14*scale,.16*scale);c.stroke();c.restore();
  }else if(s.weapon==="bow"){
   const pull=.30*s.bowCharge;const nock=.02-pull;
   c.save();c.lineWidth=Math.max(2,scale*.055);
   c.beginPath();c.moveTo(.02*scale,-.48*scale);c.quadraticCurveTo(.30*scale,-.20*scale,.30*scale,0);c.quadraticCurveTo(.30*scale,.20*scale,.02*scale,.48*scale);c.stroke();
   c.lineWidth=Math.max(1,scale*.035);c.beginPath();c.moveTo(.02*scale,-.48*scale);c.lineTo(nock*scale,0);c.lineTo(.02*scale,.48*scale);c.stroke();
   c.lineWidth=Math.max(2,scale*.06);c.beginPath();c.moveTo(-.04*scale,-.12*scale);c.lineTo(.10*scale,.12*scale);c.stroke();
   c.lineWidth=Math.max(1,scale*.035);c.beginPath();c.moveTo(nock*scale,0);c.lineTo(.92*scale,0);c.moveTo(.92*scale,0);c.lineTo(.76*scale,-.11*scale);c.moveTo(.92*scale,0);c.lineTo(.76*scale,.11*scale);c.moveTo(nock*scale,0);c.lineTo((nock+.10)*scale,-.08*scale);c.moveTo(nock*scale,0);c.lineTo((nock+.10)*scale,.08*scale);c.stroke();
   if(s.attackTime>0){c.globalAlpha=.35;c.beginPath();c.arc(.30*scale,0,.20*scale,0,Math.PI*2);c.stroke();}c.restore();
  }else if(s.weapon==="missile"){
   c.save();c.translate(.60*scale,.02*scale);c.rotate(-.05);c.beginPath();c.moveTo(-.48*scale,-.10*scale);c.lineTo(.42*scale,-.10*scale);c.lineTo(.62*scale,0);c.lineTo(.42*scale,.10*scale);c.lineTo(-.48*scale,.10*scale);c.closePath();c.stroke();c.beginPath();c.moveTo(-.48*scale,-.10*scale);c.lineTo(-.62*scale,0);c.lineTo(-.48*scale,.10*scale);c.stroke();c.restore();
  }else if(s.weapon==="bomb"){
   c.save();c.translate(.62*scale,.02*scale);c.scale(pulse,pulse);
   c.beginPath();c.arc(0,0,.20*scale,0,Math.PI*2);c.fill();c.beginPath();c.arc(0,0,.25*scale,0,Math.PI*2);c.stroke();
   c.beginPath();c.moveTo(.10*scale,-.17*scale);c.quadraticCurveTo(.20*scale,-.29*scale,.13*scale,-.38*scale);c.stroke();
   c.beginPath();c.arc(.13*scale,-.39*scale,.055*scale,0,Math.PI*2);c.fill();c.restore();
   if(s.attackTime>0){const flash=.34+(1-Math.min(1,s.attackTime/.22))*.25;c.globalAlpha=.7;c.beginPath();c.arc(.82*scale,.02*scale,flash*scale,0,Math.PI*2);c.stroke();c.beginPath();c.moveTo(.58*scale,.02*scale);c.lineTo(1.22*scale,-.14*scale);c.moveTo(.58*scale,.02*scale);c.lineTo(1.22*scale,.18*scale);c.stroke();}
  }
  c.restore();
 }
 dispose(){}
}