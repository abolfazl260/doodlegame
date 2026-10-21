import {weaponDrawPose,fighterVisual,fighterInkPalette,FIGHTER_INK_WIDTH,characterMarkings,characterSkinLayers,fighterOutfit,weaponAccentColor,weaponAccentSegments,weaponStyleLayers,weaponBaseInk,toolSegments,telegraphSegments,kickEffectSegments,slamEffectSegments,grabEffectSegments,type Segment} from './FighterVisual';
import type {Renderer} from "./Renderer";
import {GRAPPLE_GUN_URL,GRAPPLE_FLIGHT_URL,GRAPPLE_OPEN_URL} from "./GrappleAssets.js";
import {PlatformInkCache,platformInkReaction} from "./PlatformDecorations.js";
import {getArenaTheme,paintArenaBackdrop,platformColors,svgBackdropRevision} from "../themes/ArenaThemes";
import {getDownloadedImage} from "../gameplay/DownloadableArenas.js";
import {combatCameraFrame,type CombatCameraFrame} from "./CombatCamera.js";
import type {GameRenderState,DuelistRenderState} from "../gameplay/GameSession";
export class CanvasRenderer implements Renderer{
 private grappleImages:{gun:HTMLImageElement;flight:HTMLImageElement;open:HTMLImageElement}|null=null;
 private readonly platformInk=new PlatformInkCache();private readonly context:CanvasRenderingContext2D;private width=1;private height=1;private dpr=1;private playerVisual={x:0,y:0,ready:false};private opponentVisual={x:0,y:0,ready:false};private cameraFrame:CombatCameraFrame|null=null;private framedArena:GameRenderState["arena"]|null=null;private backdropArena:GameRenderState["arena"]|null=null;private backdropCanvas:HTMLCanvasElement|null=null;private lastBackgroundImage:HTMLImageElement|undefined;private backdropArtRevision=-1;
 constructor(private readonly canvas:HTMLCanvasElement,private readonly animateDecorations=true){const c=canvas.getContext("2d");if(!c)throw new Error("2D canvas rendering is unavailable.");this.context=c;if(typeof Image!=="undefined"){
  const load=(src:string)=>{const image=new Image();image.src=src;return image;};
  this.grappleImages={gun:load(GRAPPLE_GUN_URL),flight:load(GRAPPLE_FLIGHT_URL),open:load(GRAPPLE_OPEN_URL)};
 }this.resize();}
 resize(){this.width=Math.max(1,this.canvas.clientWidth);this.height=Math.max(1,this.canvas.clientHeight);this.dpr=Math.min(window.devicePixelRatio||1,2);this.canvas.width=Math.floor(this.width*this.dpr);this.canvas.height=Math.floor(this.height*this.dpr);this.backdropArena=null;}
 render(state:GameRenderState){const playerDash=Math.abs(state.player.velocityX)>9;const opponentDash=Math.abs(state.opponent.velocityX)>9;const ps=this.playerVisual,os=this.opponentVisual;if(!ps.ready){ps.x=state.player.x;ps.y=state.player.y;ps.ready=true;}else{const b=playerDash?.46:state.player.grounded?.18:.24;ps.x+=(state.player.x-ps.x)*b;ps.y+=(state.player.y-ps.y)*b;}if(!os.ready){os.x=state.opponent.x;os.y=state.opponent.y;os.ready=true;}else{const b=opponentDash?.46:state.opponent.grounded?.18:.24;os.x+=(state.opponent.x-os.x)*b;os.y+=(state.opponent.y-os.y)*b;}const aspect=this.width/Math.max(1,this.height);const previous=this.framedArena===state.arena?this.cameraFrame:null;this.cameraFrame=combatCameraFrame(state,aspect,previous);this.framedArena=state.arena;const c=this.context;c.setTransform(this.dpr,0,0,this.dpr,0,0);const theme=getArenaTheme(state.arena);this.paintBackdrop(state.arena,theme);const frame=this.cameraFrame,vh=frame.height,vw=vh*aspect,scale=this.height/vh,toX=(x:number)=>(x+vw/2-frame.x-state.cameraShake.x)*scale,toY=(y:number)=>(frame.y+vh/2-y+state.cameraShake.y)*scale;c.fillStyle="#777";if(state.arena==="fortress")this.drawFortress(c,scale,toX,toY);for(const p of state.platforms){const palette=platformColors(theme,p.surface);c.fillStyle=palette.body;c.fillRect(toX(p.x),toY(p.y+p.height),p.width*scale,p.height*scale);c.fillStyle=palette.edge;c.fillRect(toX(p.x),toY(p.y+p.height),p.width*scale,Math.max(1.5,scale*.065));if(p.surface==="ice"){c.strokeStyle="#fff";c.globalAlpha=.32;c.lineWidth=Math.max(1,scale*.025);c.beginPath();c.moveTo(toX(p.x),toY(p.y+p.height*.65));c.lineTo(toX(p.x+p.width*.35),toY(p.y+p.height*.15));c.moveTo(toX(p.x+p.width*.55),toY(p.y+p.height*.85));c.lineTo(toX(p.x+p.width),toY(p.y+p.height*.25));c.stroke();c.globalAlpha=1;}else if(p.surface==="slippery"){c.strokeStyle="#fff";c.globalAlpha=.22;c.lineWidth=Math.max(1,scale*.025);c.beginPath();c.moveTo(toX(p.x+.15),toY(p.y+p.height*.2));c.lineTo(toX(p.x+p.width-.15),toY(p.y+p.height*.8));c.stroke();c.globalAlpha=1;}else if(p.surface==="oneWay"){c.strokeStyle="#fff";c.globalAlpha=.38;c.lineWidth=Math.max(1,scale*.025);for(let x=p.x+.25;x<p.x+p.width-.1;x+=.65){c.beginPath();c.moveTo(toX(x),toY(p.y+p.height+.06));c.lineTo(toX(x+.18),toY(p.y+p.height+.02));c.stroke();}c.globalAlpha=1;}else if(p.surface==="conveyorLeft"||p.surface==="conveyorRight"){const dir=p.surface==="conveyorRight"?1:-1;c.strokeStyle=dir>0?"#111":"#fff";c.globalAlpha=.72;c.lineWidth=Math.max(1,scale*.025);for(let x=p.x+.45;x<p.x+p.width-.25;x+=.8){const y=p.y+p.height*.52;c.beginPath();c.moveTo(toX(x-dir*.18),toY(y+.09));c.lineTo(toX(x),toY(y));c.lineTo(toX(x-dir*.18),toY(y-.09));c.stroke();}c.globalAlpha=1;}}for(let index=0;index<state.platforms.length;index++)this.drawPlatformInk(c,state,state.platforms[index],index,toX,toY,scale);this.drawEnvironment(c,state.environment,toX,toY,scale);this.drawArenaHazards(c,state,toX,toY,scale);this.drawArenaDebris(c,state,toX,toY,scale);this.draw(c,state.player,toX,toY,scale,false);this.draw(c,state.opponent,toX,toY,scale,true);this.drawGrapple(c,state.player,toX,toY,scale);this.drawGrapple(c,state.opponent,toX,toY,scale);c.fillStyle="#fff";for(const p of state.projectiles){
      const px=toX(p.x),py=toY(p.y);c.lineWidth=Math.max(1,scale*.035);
      if(p.weapon==="boomerang"){
        // Rounded V-shaped blue boomerang, matching the held weapon.
        c.save();c.translate(px,py);c.rotate(-p.rotation);
        c.fillStyle="#253244";c.strokeStyle="#0c1525";c.lineWidth=Math.max(1.4,scale*.026);
        c.beginPath();c.moveTo(-scale*.35,scale*.22);c.lineTo(-scale*.11,-scale*.12);
        c.lineTo(0,-scale*.19);c.lineTo(scale*.10,-scale*.12);
        c.lineTo(scale*.40,scale*.22);c.lineTo(scale*.34,scale*.29);
        c.lineTo(0,scale*.05);c.lineTo(-scale*.30,scale*.29);c.closePath();c.fill();c.stroke();
        c.strokeStyle="#31aaff";c.lineWidth=Math.max(1.2,scale*.045);
        c.beginPath();c.moveTo(-scale*.30,scale*.22);c.lineTo(-scale*.04,-scale*.10);
        c.moveTo(scale*.08,-scale*.08);c.lineTo(scale*.36,scale*.20);c.stroke();c.restore();
      }else if(p.weapon==="spear"){
        // Thrown spear matches its held design: thin dark shaft, blue grip,
        // gold fittings and a faceted silver spearhead.
        c.save();c.translate(px,py);c.rotate(-p.rotation);
        const unit=scale;c.lineJoin="round";c.lineCap="round";
        c.strokeStyle="#18202a";c.lineWidth=Math.max(1.25,scale*.012);
        c.fillStyle="#553a31";c.beginPath();
        c.rect(-unit*.54,-unit*.040,unit*.96,unit*.080);c.fill();c.stroke();
        c.fillStyle="#1858bf";c.fillRect(-unit*.54,-unit*.045,unit*.26,unit*.09);
        c.fillStyle="#f6bf35";
        c.fillRect(-unit*.57,-unit*.067,unit*.06,unit*.134);
        c.fillRect(-unit*.30,-unit*.065,unit*.06,unit*.13);
        c.fillRect(unit*.39,-unit*.080,unit*.07,unit*.16);
        c.fillStyle="#d1dae3";c.beginPath();
        c.moveTo(unit*.46,-unit*.11);c.lineTo(unit*.67,-unit*.18);
        c.lineTo(unit*1.05,0);c.lineTo(unit*.67,unit*.18);
        c.lineTo(unit*.46,unit*.11);c.closePath();c.fill();c.stroke();
        c.strokeStyle="#f7fbff";c.lineWidth=Math.max(1,scale*.018);
        c.beginPath();c.moveTo(unit*.55,-unit*.040);c.lineTo(unit*.97,0);c.stroke();
        c.restore();
      }else if(p.weapon==="bow"){const len=scale*.58;c.save();c.translate(px,py);c.rotate(-p.rotation);c.lineWidth=Math.max(2,scale*.045);c.strokeStyle="#d9d5bb";c.beginPath();c.moveTo(-len,0);c.lineTo(len,0);c.stroke();c.strokeStyle="#f6c235";c.beginPath();c.moveTo(len,0);c.lineTo(len-scale*.16,-scale*.11);c.moveTo(len,0);c.lineTo(len-scale*.16,scale*.11);c.stroke();c.strokeStyle="#70c94a";c.beginPath();c.moveTo(-len,0);c.lineTo(-len+scale*.11,-scale*.09);c.moveTo(-len,0);c.lineTo(-len+scale*.11,scale*.09);c.stroke();c.globalAlpha=.22;c.lineWidth=Math.max(1,scale*.03);c.beginPath();c.moveTo(-len*.85,0);c.lineTo(-len*1.65,0);c.stroke();c.restore();}else if(p.weapon==="missile"){
        // White/red rocket and warm exhaust; coordinates remain the projectile physics state.
        const speed=Math.hypot(p.vx,p.vy),trail=Math.max(scale*.55,Math.min(scale*1.9,scale*(.55+speed*.045)));
        const nx=speed>.01?p.vx/speed:1,ny=speed>.01?p.vy/speed:0;
        c.save();c.strokeStyle="#ffc431";c.globalAlpha=.4;c.lineWidth=Math.max(1.4,scale*.052);
        c.beginPath();c.moveTo(px-nx*.22*scale,py+ny*.22*scale);c.lineTo(px-nx*trail,py+ny*trail);c.stroke();
        c.globalAlpha=1;c.translate(px,py);c.rotate(-p.rotation);
        c.fillStyle="#f1f5f8";c.strokeStyle="#101722";c.lineWidth=Math.max(1.3,scale*.028);
        c.beginPath();c.moveTo(-scale*.29,-scale*.11);c.lineTo(scale*.32,-scale*.11);
        c.lineTo(scale*.51,0);c.lineTo(scale*.32,scale*.11);c.lineTo(-scale*.29,scale*.11);c.closePath();c.fill();c.stroke();
        c.fillStyle="#ee3f48";c.beginPath();c.moveTo(scale*.32,-scale*.11);c.lineTo(scale*.51,0);
        c.lineTo(scale*.32,scale*.11);c.closePath();c.fill();
        c.beginPath();c.moveTo(-scale*.19,-scale*.11);c.lineTo(-scale*.33,-scale*.25);
        c.lineTo(-scale*.03,-scale*.11);c.closePath();c.fill();
        c.beginPath();c.moveTo(-scale*.19,scale*.11);c.lineTo(-scale*.33,scale*.25);
        c.lineTo(-scale*.03,scale*.11);c.closePath();c.fill();
        c.fillStyle="#ffcb3a";c.beginPath();c.moveTo(-scale*.29,-scale*.07);
        c.lineTo(-scale*.42,0);c.lineTo(-scale*.29,scale*.07);c.closePath();c.fill();c.restore();
      }else if(p.weapon==="bomb"){
        c.save();c.translate(px,py);c.rotate(-p.rotation);
        const warning=p.life<.55?1+Math.sin(p.age*45)*.1:1;c.scale(warning,warning);
        c.fillStyle='#252a33';c.strokeStyle='#101722';c.lineWidth=Math.max(1.1,scale*.02);
        c.beginPath();c.arc(0,0,scale*.18,0,Math.PI*2);c.fill();c.stroke();
        c.beginPath();c.moveTo(-.08*scale,-.07*scale);c.lineTo(-.03*scale,-.12*scale);
        c.moveTo(0,-.17*scale);c.lineTo(0,-.25*scale);c.lineTo(.08*scale,-.3*scale);c.lineTo(.06*scale,-.36*scale);c.stroke();
        c.fillStyle='#ff9a3d';c.beginPath();c.arc(.06*scale,-.36*scale,scale*.055*(.7+.6*Math.abs(Math.sin(p.age*38))),0,Math.PI*2);c.fill();c.restore();
      }else{
        const r=Math.max(2,scale*.075),speed=Math.hypot(p.vx,p.vy),len=Math.max(scale*.12,Math.min(scale*.55,scale*.12+speed*scale*.018));
        c.beginPath();c.moveTo(px-Math.sign(p.vx)*len,py);c.lineTo(px,py);c.stroke();c.beginPath();c.arc(px,py,r,0,Math.PI*2);c.fill();
      }
    }this.drawExplosions(c,state.explosions,toX,toY,scale);this.drawCombatCues(c,state,toX,toY,scale);}
 private drawPlatformInk(c:CanvasRenderingContext2D,state:GameRenderState,p:GameRenderState["platforms"][number],index:number,toX:(x:number)=>number,toY:(y:number)=>number,scale:number){
  if(toX(p.x+p.width)<-scale*.3||toX(p.x)>this.width+scale*.3)return;
  const art=this.platformInk.get(state.arena,p,index),theme=getArenaTheme(state.arena),palette=platformColors(theme,p.surface);
  c.save();c.lineCap="round";c.lineJoin="round";c.lineWidth=Math.max(1,scale*.026);
  for(const tone of ["edge","detail","accent"] as const){
   c.strokeStyle=tone==="accent"?(art.material==="earth"?theme.secondary:art.material==="frost"?"#e2f8ff":palette.edge):palette.edge;
   c.globalAlpha=tone==="edge"?.87:tone==="detail"?.55:.75;
   c.beginPath();
   for(const stroke of art.strokes){
    if(stroke.tone!==tone)continue;
    const motion=platformInkReaction(stroke,p,state,this.animateDecorations);
    const dx=stroke.motion==="pebble"?motion*.045:0;
    const dy=stroke.motion==="pebble"?Math.abs(motion)*.025:0;
    const tip=stroke.motion==="tip"?motion*.12:0;
    c.moveTo(toX(p.x+stroke.x1+dx),toY(p.y+stroke.y1+dy));
    c.lineTo(toX(p.x+stroke.x2+dx+tip),toY(p.y+stroke.y2+dy));
   }
   c.stroke();
  }
  c.restore();
 }
 private paintBackdrop(arena:GameRenderState["arena"],theme:ReturnType<typeof getArenaTheme>){
  const screen=this.context;
  const backgroundImage=getDownloadedImage(arena);
  if(typeof document!=="undefined"&&typeof screen.drawImage==="function"){
   try{
    const cache=this.backdropCanvas??document.createElement("canvas");
    this.backdropCanvas=cache;
    if(this.backdropArena!==arena||this.lastBackgroundImage!==backgroundImage||this.backdropArtRevision!==svgBackdropRevision()||cache.width!==this.canvas.width||cache.height!==this.canvas.height){
     cache.width=this.canvas.width;
     cache.height=this.canvas.height;
     const cachedContext=cache.getContext("2d");
     if(!cachedContext){paintArenaBackdrop(screen,this.width,this.height,theme,arena);return;}
     cachedContext.setTransform(this.dpr,0,0,this.dpr,0,0);
     paintArenaBackdrop(cachedContext,this.width,this.height,theme,arena);
     this.backdropArena=arena;
     this.lastBackgroundImage=backgroundImage;
     this.backdropArtRevision=svgBackdropRevision();
    }
    screen.drawImage(cache,0,0,this.width,this.height);
    return;
   }catch{
    // If backing-canvas allocation fails, preserve the live 2D fallback.
    this.backdropArena=null;
   }
  }
  paintArenaBackdrop(screen,this.width,this.height,theme,arena);
 }
 private drawCombatCues(c:CanvasRenderingContext2D,state:GameRenderState,toX:(x:number)=>number,toY:(y:number)=>number,scale:number){
  for(const cue of state.combatCues){
   const t=Math.min(1,cue.age/cue.life),fade=(1-t)*(1-t);
   const radius=(cue.kind==="slam"?1.4:cue.kind==="explosion"?1.15:cue.kind==="attack"?.22:cue.kind==="deflect"?.48:cue.kind==="block"?.44:.56)*cue.intensity*(.4+1.4*t)*scale;
   c.save();c.translate(toX(cue.x),toY(cue.y));c.rotate(cue.direction<0?Math.PI:0);
   c.strokeStyle="#fff";c.fillStyle="#fff";c.lineWidth=Math.max(1.4,scale*.035);
   c.globalAlpha=(cue.kind==="attack"?.3:.75)*fade;
   c.beginPath();c.arc(0,0,Math.max(2,radius*.82),0,Math.PI*2);c.stroke();
   if(cue.kind!=="attack"){
    c.globalAlpha=fade;
    for(let i=0;i<8;i++){
     const a=i*Math.PI/4,inner=radius*.4,outer=radius*1.1;
     c.beginPath();c.moveTo(Math.cos(a)*inner,Math.sin(a)*inner);
     c.lineTo(Math.cos(a)*outer,Math.sin(a)*outer);c.stroke();
    }
   }
   c.restore();
  }
 }
 private drawExplosions(c:CanvasRenderingContext2D,items:GameRenderState['explosions'],toX:(x:number)=>number,toY:(y:number)=>number,scale:number){
  for(const e of items){
   const t=Math.max(0,Math.min(1,e.age/e.life)),fade=1-t,r=e.radius*scale;
   c.save();c.translate(toX(e.x),toY(e.y));c.strokeStyle='#fff';c.fillStyle='#fff';
   c.globalAlpha=.8*Math.max(0,1-t*5);c.beginPath();c.arc(0,0,r*.38*(1+t*2),0,Math.PI*2);c.fill();
   c.globalAlpha=.85*fade;c.lineWidth=Math.max(2,r*.06);c.beginPath();c.arc(0,0,r*(.15+.85*Math.min(1,t*2.5)),0,Math.PI*2);c.stroke();
   c.globalAlpha=.9*Math.max(0,1-t*3);c.beginPath();c.arc(0,0,r*.25*(1+t*3),0,Math.PI*2);c.fill();
   c.globalAlpha=fade*fade;c.lineWidth=Math.max(2,r*.035);
   for(let i=0;i<12;i++){const a=i*Math.PI/6,d=.15+t*(.65+((i+3)%3)*.12),x=Math.cos(a)*d,y=Math.sin(a)*d-t*t*.35,len=.09*(1-t*.7);c.beginPath();c.moveTo((x-Math.cos(a)*len)*r,-(y-Math.sin(a)*len)*r);c.lineTo((x+Math.cos(a)*len)*r,-(y+Math.sin(a)*len)*r);c.stroke();}
   c.globalAlpha=.35*fade;c.lineWidth=Math.max(1,r*.035);
   for(let i=0;i<6;i++){const a=i*Math.PI/3,d=.2+t*.48;c.beginPath();c.arc(Math.cos(a)*d*r,-(Math.sin(a)*d+t*.35)*r,r*.175*(.7+t*1.5),0,Math.PI*2);c.stroke();}
   c.restore();
  }
 }
 private drawArenaHazards(c:CanvasRenderingContext2D,state:GameRenderState,toX:(x:number)=>number,toY:(y:number)=>number,scale:number){
  for(const e of state.environment){
   if(!e.active)continue;
   const pulse=e.kind==="vent"?Math.max(e.warning,e.pulse):e.warning;
   if(pulse<=0)continue;
   const x=toX(e.x),y=toY(e.y),radius=Math.max(4,e.width*scale*(.48+pulse*.23));
   c.save();c.strokeStyle="#fff";c.lineWidth=Math.max(2,scale*.045);c.globalAlpha=.25+.7*pulse;
   c.beginPath();c.arc(x,y,radius,0,Math.PI*2);c.stroke();
   if(e.kind==="fallingRock"){
    c.setLineDash([Math.max(3,scale*.09),Math.max(3,scale*.09)]);
    c.beginPath();c.moveTo(x,y);c.lineTo(x,toY(.6));c.stroke();c.setLineDash([]);
    c.beginPath();c.arc(x,toY(.6),radius*.7,0,Math.PI*2);c.stroke();
   }
   if(e.kind==="vent"&&e.pulse>0){
    for(let i=-1;i<=1;i++){const offset=i*e.width*scale*.3;
     c.beginPath();c.moveTo(x+offset,y);c.lineTo(x+offset+Math.sin(e.pulse*8+i)*scale*.14,y-scale*(.35+e.pulse*.75));c.stroke();
    }
   }
   c.restore();
  }
 }
 private drawArenaDebris(c:CanvasRenderingContext2D,state:GameRenderState,toX:(x:number)=>number,toY:(y:number)=>number,scale:number){
  c.save();c.fillStyle="#bbb";
  for(const d of state.debris){
   c.save();c.globalAlpha=Math.max(0,1-d.age/d.life)*.9;
   c.translate(toX(d.x),toY(d.y));c.rotate(-d.rotation);
   c.fillRect(-d.size*scale*.5,-d.size*scale*.5,d.size*scale,d.size*scale);
   c.restore();
  }
  c.restore();
 }
 private drawEnvironment(c:CanvasRenderingContext2D,items:GameRenderState["environment"],toX:(x:number)=>number,toY:(y:number)=>number,scale:number){
  for(const e of items){if(!e.active)continue;const x=toX(e.x),y=toY(e.y);c.save();c.translate(x,y);c.rotate(e.rotation);c.scale(e.width*scale,e.height*scale);c.strokeStyle="#fff";c.fillStyle="#444";c.lineWidth=Math.max(1.5,1.8/Math.max(.2,Math.min(1,e.width)));if(e.kind==="barrel"){c.fillRect(-.5,-.5,1,1);c.strokeRect(-.5,-.5,1,1);c.fillStyle="#888";c.fillRect(-.5,-.26,1,.1);c.fillRect(-.5,.16,1,.1);}else if(e.kind==="box"){c.fillRect(-.5,-.5,1,1);c.strokeRect(-.5,-.5,1,1);c.beginPath();c.moveTo(-.42,-.42);c.lineTo(.42,.42);c.moveTo(.42,-.42);c.lineTo(-.42,.42);c.stroke();}else if(e.kind==="wall"){c.fillRect(-.5,-.5,1,1);c.strokeRect(-.5,-.5,1,1);for(let y2=-.3;y2<=.3;y2+=.3){c.beginPath();c.moveTo(-.42,y2);c.lineTo(.42,y2);c.stroke();}}else if(e.kind==="rock"||e.kind==="fallingRock"){c.beginPath();c.moveTo(-.45,.25);c.lineTo(-.24,-.5);c.lineTo(.25,-.42);c.lineTo(.48,.12);c.lineTo(.12,.5);c.closePath();c.fill();c.stroke();c.beginPath();c.moveTo(-.18,-.05);c.lineTo(.03,.10);c.lineTo(-.08,.30);c.moveTo(.03,.10);c.lineTo(.25,.02);c.stroke();}else if(e.kind==="vent"){c.fillRect(-.5,-.14,1,.28);c.strokeRect(-.5,-.14,1,.28);for(let i=-1;i<=1;i++){c.beginPath();c.moveTo(i*.26,-.10);c.lineTo(i*.26+.08,-.35);c.stroke();}}else if(e.kind==="bounce"){c.fillRect(-.5,-.18,1,.36);c.strokeRect(-.5,-.18,1,.36);c.beginPath();c.moveTo(-.34,-.12);c.lineTo(-.17,.12);c.lineTo(0,-.12);c.lineTo(.17,.12);c.lineTo(.34,-.12);c.stroke();if(e.pulse>0){c.globalAlpha=.6*e.pulse;c.beginPath();c.arc(0,-.18,.48,0,Math.PI*2);c.stroke();}}else if(e.kind==="crumble"){c.fillRect(-.5,-.14,1,.28);c.strokeRect(-.5,-.14,1,.28);c.beginPath();c.moveTo(-.42,-.05);c.lineTo(-.16,.04);c.lineTo(-.02,-.06);c.lineTo(.17,.07);c.lineTo(.42,-.02);c.stroke();}else if(e.kind==="fan"){c.beginPath();c.arc(0,0,.38,0,Math.PI*2);c.stroke();for(let i=0;i<4;i++){c.save();c.rotate(i*Math.PI/2);c.fillRect(.06,-.055,.32,.11);c.restore();}c.fillStyle="#888";c.beginPath();c.arc(0,0,.09,0,Math.PI*2);c.fill();}else if(e.kind==="gravity"){c.beginPath();c.arc(0,0,.34,0,Math.PI*2);c.stroke();c.globalAlpha=.48;c.beginPath();c.arc(0,0,.5,0,Math.PI*2);c.stroke();c.globalAlpha=1;c.fillStyle="#111";c.beginPath();c.arc(0,0,.13,0,Math.PI*2);c.fill();c.stroke();}else{c.fillRect(-.5,-.12,1,.24);c.strokeRect(-.5,-.12,1,.24);c.beginPath();for(let i=-3;i<=3;i++){c.moveTo(i*.14,-.1);c.lineTo(i*.14+.07,-.38);}c.stroke();}if(e.maxHp>1&&e.hp<e.maxHp){c.globalAlpha=.65;c.fillStyle="#fff";c.fillRect(-.5,-.64,1,.05);c.fillStyle="#000";c.fillRect(-.5,-.64,(1-Math.max(0,e.hp/e.maxHp)),.05);}if(e.pulse>0){c.globalAlpha=.35*e.pulse;c.beginPath();c.arc(0,0,Math.max(.55,.8*e.pulse),0,Math.PI*2);c.stroke();}c.restore();}
 }
 private drawFortress(c:CanvasRenderingContext2D,scale:number,toX:(x:number)=>number,toY:(y:number)=>number){c.save();c.fillStyle="#444";c.strokeStyle="#777";c.lineWidth=Math.max(1,scale*.04);for(const side of [-1,1]){const x=side*10.2;c.fillRect(toX(x-1.35),toY(2.95),2.7*scale,3.2*scale);for(let i=0;i<3;i++){const tx=side*(9.65+i*.75);c.fillRect(toX(tx-.375),toY(4.2),.75*scale,4.4*scale);}for(let i=0;i<5;i++){const mx=side*(8.95+i*.62);c.fillRect(toX(mx-.16),toY(4.38),.32*scale,.55*scale);}c.strokeRect(toX(side*8.1),toY(2.65),.95*scale,.35*scale);}c.restore();}
 private drawGrapple(c:CanvasRenderingContext2D,s:DuelistRenderState,toX:(x:number)=>number,toY:(y:number)=>number,scale:number){
  const g=s.grapple;if(!g)return;
  const x=toX(g.x),y=toY(g.y);
  const startX=toX(s.x+s.facing*.57),startY=toY(s.y+.23);
  c.save();c.lineCap="round";
  c.strokeStyle="#101820";c.lineWidth=Math.max(2,scale*.067);
  c.beginPath();c.moveTo(startX,startY);c.lineTo(x,y);c.stroke();
  c.strokeStyle="#f6f3e9";c.lineWidth=Math.max(1,scale*.022);c.stroke();
  c.translate(x,y);c.rotate(-g.angle);
  const img=g.phase==="latched"?this.grappleImages?.open:this.grappleImages?.flight;
  if(img?.complete&&img.naturalWidth>0){
   c.drawImage(img,-scale*.24,-scale*.17,scale*.48,scale*.34);
  }else{
   c.strokeStyle="#f4f6f9";c.lineWidth=Math.max(1.4,scale*.042);
   c.beginPath();c.moveTo(-scale*.14,0);c.lineTo(scale*.17,0);
   c.moveTo(scale*.08,-scale*.1);c.lineTo(scale*.2,0);c.lineTo(scale*.08,scale*.1);c.stroke();
  }
  c.restore();
 }
 private draw(c:CanvasRenderingContext2D,s:DuelistRenderState,toX:(x:number)=>number,toY:(y:number)=>number,scale:number,enemy:boolean){
  const pose=fighterVisual(s),ink=fighterInkPalette(enemy,s.characterId),width=FIGHTER_INK_WIDTH;
  // A subtle ground marker helps track fighters against detailed arena art.
  if(s.grounded){
   c.save();c.globalAlpha=.25;c.fillStyle=ink.halo;
   c.beginPath();c.ellipse(toX(s.x),toY(s.y-.9*pose.scale*pose.scaleY),scale*.43*pose.scale,Math.max(1,scale*.047),0,0,Math.PI*2);c.fill();
   c.restore();
  }
  c.save();c.translate(toX(s.x),toY(s.y));
  c.scale(pose.visualFacing*pose.scale*pose.scaleX,pose.scale*pose.scaleY);c.rotate(pose.lean);
  c.lineCap="round";c.lineJoin="round";
  const lines=(segments:readonly Segment[],color:string,weight:number,minPx=1.6)=>{
   c.strokeStyle=color;c.lineWidth=Math.max(minPx,scale*weight);c.beginPath();
   for(const [a,b] of segments){c.moveTo(a[0]*scale,-a[1]*scale);c.lineTo(b[0]*scale,-b[1]*scale);}
   c.stroke();
  };
  // Pale halo / dark border / saturated core: readable over bright *and* dark backgrounds.
  lines(pose.body,ink.halo,width.body.halo);
  lines(pose.body,ink.outline,width.body.outline);
  lines(pose.body,ink.core,width.body.core);
  const outfit=fighterOutfit(s,pose);
  lines(outfit.vest,ink.outline,width.vest.outline);
  lines(outfit.vest,ink.suit,width.vest.core);
  lines(outfit.gear,ink.outline,width.gear.outline);
  lines(outfit.gear,ink.armor,width.gear.core);
  lines(outfit.trim,ink.trim,width.trim);
  lines(pose.costume,ink.outline,width.costume.outline);
  lines(pose.costume,ink.core,width.costume.core);
  const head=(radius:number,color:string)=>{
   c.fillStyle=color;c.beginPath();c.arc(pose.head[0]*scale,-pose.head[1]*scale,radius*scale*(1+pose.hit*.08),0,Math.PI*2);c.fill();
  };
  head(width.head.halo,ink.halo);
  head(width.head.outline,ink.outline);
  head(width.head.core,ink.face);
  lines(outfit.hair,ink.outline,width.hair.outline);
  lines(outfit.hair,ink.hair,width.hair.core);
  // Featureless white face (Soldier) and black mask (Ninja).
  const accent=ink.accent;
  const marks=characterMarkings(s,pose.head);
  lines(marks,ink.outline,width.marking.outline);
  lines(marks,accent,width.marking.core);
  // Shared articulated cosmetic layers follow the real head, shoulders and limbs.
  for(const layer of characterSkinLayers(s,pose))lines(layer.segments,layer.color,layer.width,1);
  if(s.attackTelegraph>0){c.globalAlpha=.95;lines(telegraphSegments(s),ink.halo,.047);c.globalAlpha=1;}
  c.save();c.translate(pose.hand[0]*scale,-pose.hand[1]*scale);c.rotate(-pose.toolAngle);
  const sprite=weaponDrawPose(s).weapon==="grapple"&&s.grabPhase===null?this.grappleImages?.gun:null;
  const hasSprite=Boolean(sprite?.complete&&sprite.naturalWidth>0);
  const weapon=hasSprite?[]:toolSegments(s);
  const baseInk=weaponBaseInk(s);
  // Narrow, muted outlines prevent a bright white rim around the hammer.
  lines(weapon,ink.outline,baseInk.outline,.85);
  lines(weapon,baseInk.metal,baseInk.core,.85);
  // Shared four-color vector styling matches the approved weapon reference sheet.
  for(const layer of weaponStyleLayers(s))lines(layer.segments,layer.color,layer.width);
  lines(weaponAccentSegments(s),weaponAccentColor(s),width.weapon.accent);
  if(hasSprite&&sprite)c.drawImage(sprite,-scale*.32,-scale*.31,scale*1.05,scale*.537);
  if(s.attackTime>0&&(s.weapon==="blaster"||s.weapon==="uzi")){
   const x=s.weapon==="uzi"?.54:.66;
   lines([[[x,0],[x+.22,.1]],[[x,0],[x+.22,-.1]],[[x,0],[x+.3,0]]],ink.halo,.052);
  }
  c.restore();
  c.globalAlpha=.6;
  if(Math.abs(s.velocityX)>9)lines([[[-.45,-.3],[-1.1,-.3]],[[-.45,0],[-1.1,0]],[[-.45,.3],[-1.1,.3]]],ink.halo,.05);
  if(pose.land>0)lines([[[-.3,-.88],[-.6-pose.land*.2,-.82]],[[.3,-.88],[.6+pose.land*.2,-.82]]],ink.halo,.05);
  lines(kickEffectSegments(s),ink.halo,.06);
  lines(slamEffectSegments(s),ink.halo,.055);
  lines(grabEffectSegments(s),ink.halo,.055);
  c.restore();
 }
 dispose(){this.platformInk.clear();this.backdropCanvas=null;this.backdropArena=null;}
}