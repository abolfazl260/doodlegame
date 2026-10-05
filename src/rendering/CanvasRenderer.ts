import {fighterVisual,toolSegments,type Segment} from './FighterVisual';
import type {Renderer} from "./Renderer";
import type {GameRenderState,DuelistRenderState} from "../gameplay/GameSession";
export class CanvasRenderer implements Renderer{
 private readonly context:CanvasRenderingContext2D;private width=1;private height=1;private dpr=1;private playerVisual={x:0,y:0,ready:false};private opponentVisual={x:0,y:0,ready:false};private cameraX=0;private cameraY=0;
 constructor(private readonly canvas:HTMLCanvasElement){const c=canvas.getContext("2d");if(!c)throw new Error("2D canvas rendering is unavailable.");this.context=c;this.resize();}
 resize(){this.width=Math.max(1,this.canvas.clientWidth);this.height=Math.max(1,this.canvas.clientHeight);this.dpr=Math.min(window.devicePixelRatio||1,2);this.canvas.width=Math.floor(this.width*this.dpr);this.canvas.height=Math.floor(this.height*this.dpr);}
 render(state:GameRenderState){const playerDash=Math.abs(state.player.velocityX)>9;const opponentDash=Math.abs(state.opponent.velocityX)>9;const ps=this.playerVisual,os=this.opponentVisual;if(!ps.ready){ps.x=state.player.x;ps.y=state.player.y;ps.ready=true;}else{const b=playerDash?.46:state.player.grounded?.18:.24;ps.x+=(state.player.x-ps.x)*b;ps.y+=(state.player.y-ps.y)*b;}if(!os.ready){os.x=state.opponent.x;os.y=state.opponent.y;os.ready=true;}else{const b=opponentDash?.46:state.opponent.grounded?.18:.24;os.x+=(state.opponent.x-os.x)*b;os.y+=(state.opponent.y-os.y)*b;}const cx=(ps.x+os.x)*.5;const cy=(ps.y+os.y)*.5;this.cameraX+=(Math.max(-.9,Math.min(.9,cx*.10))-this.cameraX)*.08;this.cameraY+=(Math.max(-.5,Math.min(.7,(cy-3)*.08))-this.cameraY)*.08;const c=this.context;c.setTransform(this.dpr,0,0,this.dpr,0,0);c.fillStyle="#000";c.fillRect(0,0,this.width,this.height);const vh=10,vw=vh*this.width/Math.max(1,this.height),scale=this.height/vh,toX=(x:number)=>(x+vw/2-this.cameraX)*scale,toY=(y:number)=>(vh-y+this.cameraY)*scale;c.fillStyle="#777";if(state.arena==="fortress")this.drawFortress(c,scale,toX,toY);for(const p of state.platforms){c.fillStyle=p.surface==="ice"?"#999":p.surface==="slippery"?"#666":p.surface==="oneWay"?"#555":"#777";c.fillRect(toX(p.x),toY(p.y+p.height),p.width*scale,p.height*scale);if(p.surface==="ice"){c.strokeStyle="#fff";c.globalAlpha=.32;c.lineWidth=Math.max(1,scale*.025);c.beginPath();c.moveTo(toX(p.x),toY(p.y+p.height*.65));c.lineTo(toX(p.x+p.width*.35),toY(p.y+p.height*.15));c.moveTo(toX(p.x+p.width*.55),toY(p.y+p.height*.85));c.lineTo(toX(p.x+p.width),toY(p.y+p.height*.25));c.stroke();c.globalAlpha=1;}else if(p.surface==="slippery"){c.strokeStyle="#fff";c.globalAlpha=.22;c.lineWidth=Math.max(1,scale*.025);c.beginPath();c.moveTo(toX(p.x+.15),toY(p.y+p.height*.2));c.lineTo(toX(p.x+p.width-.15),toY(p.y+p.height*.8));c.stroke();c.globalAlpha=1;}else if(p.surface==="oneWay"){c.strokeStyle="#fff";c.globalAlpha=.38;c.lineWidth=Math.max(1,scale*.025);for(let x=p.x+.25;x<p.x+p.width-.1;x+=.65){c.beginPath();c.moveTo(toX(x),toY(p.y+p.height+.06));c.lineTo(toX(x+.18),toY(p.y+p.height+.02));c.stroke();}c.globalAlpha=1;}}this.drawEnvironment(c,state.environment,toX,toY,scale);this.draw(c,state.player,toX,toY,scale,false);this.draw(c,state.opponent,toX,toY,scale,true);c.fillStyle="#fff";for(const p of state.projectiles){
      const px=toX(p.x),py=toY(p.y);c.lineWidth=Math.max(1,scale*.035);
      if(p.weapon==="boomerang"){
        c.save();c.translate(px,py);c.rotate(-p.rotation);c.beginPath();c.arc(0,0,Math.max(3,scale*.18),-.95,.95);c.stroke();c.beginPath();c.arc(0,0,Math.max(2,scale*.11),.95,2.15);c.stroke();c.restore();
      }else if(p.weapon==="bow"){const len=scale*.58;c.save();c.translate(px,py);c.rotate(-p.rotation);c.lineWidth=Math.max(2,scale*.045);c.beginPath();c.moveTo(-len,0);c.lineTo(len,0);c.stroke();c.beginPath();c.moveTo(len,0);c.lineTo(len-scale*.16,-scale*.11);c.moveTo(len,0);c.lineTo(len-scale*.16,scale*.11);c.stroke();c.beginPath();c.moveTo(-len,0);c.lineTo(-len+scale*.11,-scale*.09);c.moveTo(-len,0);c.lineTo(-len+scale*.11,scale*.09);c.stroke();c.globalAlpha=.22;c.lineWidth=Math.max(1,scale*.03);c.beginPath();c.moveTo(-len*.85,0);c.lineTo(-len*1.65,0);c.stroke();c.restore();}else if(p.weapon==="missile"){const speed=Math.hypot(p.vx,p.vy);const trail=Math.max(scale*.55,Math.min(scale*1.9,scale*(.55+speed*.045)));const nx=speed>.01?p.vx/speed:1,ny=speed>.01?p.vy/speed:0;c.save();c.globalAlpha=.28;c.lineWidth=Math.max(2,scale*.075);c.beginPath();c.moveTo(px-nx*.10*scale,py+ny*.10*scale);c.lineTo(px-nx*trail,py+ny*trail);c.stroke();c.globalAlpha=.9;c.fillStyle="#fff";c.beginPath();c.arc(px-nx*trail,py+ny*trail,Math.max(2,scale*.055),0,Math.PI*2);c.fill();c.globalAlpha=.9;c.save();c.translate(px,py);c.rotate(-p.rotation);const len=scale*.62;c.beginPath();c.moveTo(-len,0);c.lineTo(len,0);c.stroke();c.beginPath();c.moveTo(-len,0);c.lineTo(-len+scale*.14,-scale*.09);c.moveTo(-len,0);c.lineTo(-len+scale*.14,scale*.09);c.stroke();c.beginPath();c.moveTo(len,0);c.lineTo(len-scale*.12,-scale*.07);c.moveTo(len,0);c.lineTo(len-scale*.12,scale*.07);c.stroke();c.beginPath();c.moveTo(-len,0);c.lineTo(-len-scale*.18,-scale*.10);c.moveTo(-len,0);c.lineTo(-len-scale*.18,scale*.10);c.stroke();c.restore();c.restore();}else if(p.weapon==="bomb"){
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
  const pose=fighterVisual(s);
  c.save();c.translate(toX(s.x),toY(s.y));
  c.scale(s.facing*pose.scale*pose.scaleX,pose.scale*pose.scaleY);c.rotate(pose.lean);
  c.strokeStyle=enemy?'#aaa':'#fff';c.fillStyle=enemy?'#aaa':'#fff';
  c.lineWidth=Math.max(2,scale*.045);c.lineCap='round';c.lineJoin='round';
  const lines=(segments:readonly Segment[])=>{c.beginPath();for(const [a,b] of segments){c.moveTo(a[0]*scale,-a[1]*scale);c.lineTo(b[0]*scale,-b[1]*scale);}c.stroke();};
  lines(pose.joints);
  c.beginPath();c.arc(pose.head[0]*scale,-pose.head[1]*scale,.24*scale*(1+pose.hit*.08),0,Math.PI*2);c.fill();
  c.fillStyle=enemy?'#fff':'#000';c.beginPath();c.arc((pose.head[0]+.08)*scale,-(pose.head[1]+.04)*scale,.035*scale,0,Math.PI*2);c.fill();
  if(enemy){c.strokeStyle='#d11f2f';const wave=Math.sin(s.animationTime*11)*(.04+Math.abs(s.velocityX)*.01);lines([[[ -.24,pose.head[1]+.06],[.24,pose.head[1]+.06]],[[ -.2,pose.head[1]+.06],[-.55,pose.head[1]+wave]],[[ -.55,pose.head[1]+wave],[-.76,pose.head[1]-.08+wave]]]);}
  c.strokeStyle='#fff';
  c.save();c.translate(pose.hand[0]*scale,-pose.hand[1]*scale);c.rotate(-pose.toolAngle);lines(toolSegments(s));
  if(s.attackTime>0&&(s.weapon==='blaster'||s.weapon==='uzi')){const x=s.weapon==='uzi'?.54:.66;lines([[[x,0],[x+.22,.1]],[[x,0],[x+.22,-.1]],[[x,0],[x+.3,0]]]);}
  c.restore();
  c.globalAlpha=.5;
  if(Math.abs(s.velocityX)>9)lines([[[-.45,-.3],[-1.1,-.3]],[[-.45,0],[-1.1,0]],[[-.45,.3],[-1.1,.3]]]);
  if(pose.land>0)lines([[[-.3,-.88],[-.6-pose.land*.2,-.82]],[[.3,-.88],[.6+pose.land*.2,-.82]]]);
  c.restore();
 }
 dispose(){}
}