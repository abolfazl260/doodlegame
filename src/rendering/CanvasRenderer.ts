import type {Renderer} from "./Renderer";
import type {GameRenderState,DuelistRenderState} from "../gameplay/GameSession";
export class CanvasRenderer implements Renderer{
 private readonly context:CanvasRenderingContext2D;private width=1;private height=1;private dpr=1;
 constructor(private readonly canvas:HTMLCanvasElement){const c=canvas.getContext("2d");if(!c)throw new Error("2D canvas rendering is unavailable.");this.context=c;this.resize();}
 resize(){this.width=Math.max(1,this.canvas.clientWidth);this.height=Math.max(1,this.canvas.clientHeight);this.dpr=Math.min(window.devicePixelRatio||1,2);this.canvas.width=Math.floor(this.width*this.dpr);this.canvas.height=Math.floor(this.height*this.dpr);}
 render(state:GameRenderState){const c=this.context;c.setTransform(this.dpr,0,0,this.dpr,0,0);c.fillStyle="#000";c.fillRect(0,0,this.width,this.height);const vh=10,vw=vh*this.width/Math.max(1,this.height),scale=this.height/vh,toX=(x:number)=>(x+vw/2)*scale,toY=(y:number)=>(2+vh/2-y)*scale;c.fillStyle="#777";for(const p of state.platforms)c.fillRect(toX(p.x),toY(p.y+p.height),p.width*scale,p.height*scale);this.draw(c,state.player,toX,toY,scale);this.draw(c,state.opponent,toX,toY,scale);c.fillStyle="#fff";for(const p of state.projectiles){c.beginPath();c.arc(toX(p.x),toY(p.y),Math.max(2,scale*.09),0,Math.PI*2);c.fill();}}
 private draw(c:CanvasRenderingContext2D,s:DuelistRenderState,toX:(x:number)=>number,toY:(y:number)=>number,scale:number){
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
  c.save();c.translate(x,y);c.scale(dir,1);c.rotate(lean);
  c.strokeStyle="#fff";c.fillStyle="#fff";c.lineWidth=Math.max(2,scale*.055);c.lineCap="round";c.lineJoin="round";
  const hipY=.08-bounce,shoulderY=-.42-bounce,headY=-.82-bounce;
  c.beginPath();c.arc(0,headY*scale,.24*scale,0,Math.PI*2);c.fill();
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
  const active=s.attackTime>0?1.15:1;
  c.beginPath();
  if(s.weapon==="blade"){
   c.moveTo(.28*scale,0);c.lineTo(.95*active*scale,-.08*scale);c.lineTo(1.05*active*scale,.02*scale);
   c.stroke();
  }else if(s.weapon==="hammer"){
   c.moveTo(.22*scale,.02*scale);c.lineTo(.82*scale,-.02*scale);c.moveTo(.75*scale,-.22*scale);c.lineTo(.75*scale,.18*scale);c.lineTo(.98*scale,.18*scale);c.lineTo(.98*scale,-.18*scale);
   c.stroke();
  }else if(s.weapon==="blaster"){
   c.moveTo(.2*scale,-.03*scale);c.lineTo(.72*scale,-.03*scale);c.lineTo(.72*scale,.1*scale);c.lineTo(.2*scale,.1*scale);c.stroke();
  }else if(s.weapon==="boomerang"){
   c.arc(.62*scale,-.02*scale,.34*scale,-1.05,1.05);c.stroke();
  }else if(s.weapon==="bow"){
   c.moveTo(.38*scale,-.38*scale);c.quadraticCurveTo(.95*scale,0,.38*scale,.38*scale);c.moveTo(.38*scale,-.38*scale);c.lineTo(.38*scale,.38*scale);c.moveTo(.38*scale,0);c.lineTo(.98*scale,0);c.stroke();
  }else if(s.weapon==="bomb"){
   c.beginPath();c.arc(.62*scale,.02*scale,.2*scale,0,Math.PI*2);c.fill();c.beginPath();c.moveTo(.72*scale,-.17*scale);c.lineTo(.84*scale,-.3*scale);c.stroke();
  }
  c.restore();
 }
 dispose(){}
}