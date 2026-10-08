import {fighterVisual} from "../rendering/FighterVisual";
import type {DuelistRenderState} from "../gameplay/GameSession";
import {
 OPENING_DURATION_MS,
 REDUCED_MOTION_DURATION_MS,
 openingFrame,
 openingStars
} from "./OpeningIntroMotion";

/** Code-drawn cinematic shown once after initialization and before the menu. */
export class OpeningIntro{
 private readonly overlay=document.createElement("section");
 private readonly canvas=document.createElement("canvas");
 private readonly skip=document.createElement("button");
 private readonly stars=openingStars();
 private context:CanvasRenderingContext2D|null=null;
 private frameId:number|null=null;
 private lastTime=0;
 private elapsed=0;
 private duration=OPENING_DURATION_MS;
 private width=1;
 private height=1;
 private ratio=1;
 private active=false;
 private ambient=false;
 private reducedMotion=false;

 constructor(private readonly menuRoot:HTMLElement,locale:"en"|"fa"){
  this.overlay.className="opening-intro";
  this.overlay.setAttribute("role","dialog");
  this.overlay.setAttribute("aria-modal","true");
  this.overlay.setAttribute("aria-label",locale==="fa"?"معرفی بازی":"Game introduction");
  this.canvas.className="opening-intro__canvas";
  this.canvas.setAttribute("aria-hidden","true");
  this.skip.className="opening-intro__skip";
  this.skip.type="button";
  this.skip.textContent=locale==="fa"?"رد کردن":"Skip intro";
  this.skip.addEventListener("click",()=>this.finish());
  this.overlay.append(this.canvas,this.skip);
 }

 start(){
  if(this.active)return;
  this.context=this.canvas.getContext("2d");
  if(!this.context)return; // Canvas unavailable: leave the normal menu visible.
  this.reducedMotion=window.matchMedia?.("(prefers-reduced-motion: reduce)").matches??false;
  this.duration=this.reducedMotion?REDUCED_MOTION_DURATION_MS:OPENING_DURATION_MS;
  this.active=true;
  document.body.append(this.overlay);
  this.menuRoot.inert=true;
  window.addEventListener("keydown",this.handleKeyDown,true);
  window.addEventListener("resize",this.resize);
  document.addEventListener("visibilitychange",this.handleVisibility);
  this.resize();
  try{
   this.draw();
   this.frameId=window.requestAnimationFrame(this.tick);
  }catch(error){
   console.warn("Opening animation unavailable; continuing to menu.",error);
   this.finish();
  }
 }

 private readonly handleKeyDown=(event:KeyboardEvent)=>{
  if(event.key==="Tab")return;
  // Do not allow Enter to start gameplay behind the introduction.
  event.stopImmediatePropagation();
  if(event.key==="Enter"||event.key===" "||event.key==="Escape"){
   event.preventDefault();
   this.finish();
  }
 };

 private readonly handleVisibility=()=>{
  if(!this.active)return;
  this.lastTime=0;
  if(document.hidden){
   if(this.frameId!==null)window.cancelAnimationFrame(this.frameId);
   this.frameId=null;
  }else if(this.frameId===null){
   this.frameId=window.requestAnimationFrame(this.tick);
  }
 };

 private readonly resize=()=>{
  if(!this.active||!this.context)return;
  this.width=Math.max(1,this.overlay.clientWidth||window.innerWidth);
  this.height=Math.max(1,this.overlay.clientHeight||window.innerHeight);
  this.ratio=Math.min(window.devicePixelRatio||1,2);
  this.canvas.width=Math.max(1,Math.round(this.width*this.ratio));
  this.canvas.height=Math.max(1,Math.round(this.height*this.ratio));
 };

 private readonly tick=(now:number)=>{
  this.frameId=null;
  if(!this.active||document.hidden)return;
  if(this.lastTime!==0)this.elapsed+=Math.min(64,Math.max(0,now-this.lastTime));
  this.lastTime=now;
  if(!this.ambient&&this.elapsed>=this.duration)this.finish();
  try{
   this.draw();
  }catch(error){
   console.warn("Opening animation interrupted; continuing to menu.",error);
   this.finish();
   return;
  }
  // The menu keeps the same living space background until gameplay starts.
  if(!this.ambient||!this.reducedMotion)this.frameId=window.requestAnimationFrame(this.tick);
 };

 private draw(){
  const ctx=this.context;
  if(!ctx)return;
  const w=this.width,h=this.height;
  const pose=openingFrame(this.elapsed,this.duration);
  ctx.setTransform(this.ratio,0,0,this.ratio,0,0);
  ctx.fillStyle="#010204";
  ctx.fillRect(0,0,w,h);
  const t=this.elapsed/1000;
  for(const star of this.stars){
   const twinkle=.75+.25*Math.sin(t*.85+star.phase);
   ctx.globalAlpha=star.light*twinkle;
   ctx.fillStyle="#fff";
   ctx.beginPath();
   ctx.arc(star.x*w,star.y*h,star.size,0,Math.PI*2);
   ctx.fill();
  }
  ctx.globalAlpha=1;
  this.drawPlanet(ctx,w,h,t);
  this.drawFighter(ctx,w,h,t,pose.x,pose.y,pose.angle,pose.paddle);

 }

 private drawPlanet(ctx:CanvasRenderingContext2D,w:number,h:number,t:number){
  const radius=Math.min(w*.37,h*.79);
  const x=w*.5;
  const y=h*.64+radius;
  ctx.save();
  // The hemisphere fades into shadow, with a bright narrow horizon.
  const surface=ctx.createRadialGradient(
   x-radius*.12,y-radius*.96,radius*.045,
   x,y-radius*.2,radius*1.34
  );
  surface.addColorStop(0,"#f5f5f5");
  surface.addColorStop(.16,"#c6c6c6");
  surface.addColorStop(.39,"#696a6e");
  surface.addColorStop(.68,"#1b1d22");
  surface.addColorStop(1,"#020304");
  ctx.fillStyle=surface;
  ctx.beginPath();
  ctx.arc(x,y,radius,0,Math.PI*2);
  ctx.fill();

  ctx.strokeStyle="#e4e6e7";
  ctx.lineWidth=Math.max(1.4,radius*.004);
  ctx.shadowColor="#f9fbff";
  ctx.shadowBlur=Math.min(32,radius*.045);
  ctx.beginPath();
  ctx.arc(x,y,radius,Math.PI*1.02,Math.PI*1.98);
  ctx.stroke();
  ctx.shadowBlur=0;

  // Jagged, low-contrast terrain along the distant upper limb.
  ctx.globalAlpha=.2;
  ctx.strokeStyle="#515257";
  ctx.lineWidth=Math.max(1,radius*.008);
  ctx.beginPath();
  for(let i=0;i<=80;i++){
   const dx=-radius*.86+radius*1.72*i/80;
   const ridgeY=y-Math.sqrt(Math.max(0,radius*radius-dx*dx));
   const noise=(Math.sin(i*2.17+t*.05)+Math.sin(i*.81))*.0028*radius;
   if(i===0)ctx.moveTo(x+dx,ridgeY+noise);
   else ctx.lineTo(x+dx,ridgeY+noise);
  }
  ctx.stroke();
  ctx.restore();
 }

 private drawFighter(ctx:CanvasRenderingContext2D,w:number,h:number,t:number,
  nx:number,ny:number,rotation:number,paddle:number){
  // Use the same articulated torso and head design as the in-game fighter.
  const state:DuelistRenderState={
   x:0,y:0,enemyType:null,bowCharge:0,missileAngle:45,missilePower:12,
   velocityX:.8,velocityY:1,grounded:false,facing:1,
   health:100,maxHealth:100,weapon:"blade",attackTime:0,attackVariant:0,
   animationTime:t,gaitPhase:t*3,landingTime:0,hitTime:0
  };
  const figure=fighterVisual(state);
  const scale=Math.max(25,Math.min(60,h*.068,w*.145));
  ctx.save();
  ctx.translate(nx*w,ny*h);
  ctx.rotate(rotation);
  ctx.scale(scale,-scale);
  ctx.lineCap="round";
  ctx.lineJoin="round";
  ctx.lineWidth=.051;
  ctx.strokeStyle="#fff";
  ctx.fillStyle="#fff";
  ctx.shadowColor="#fff";
  ctx.shadowBlur=.07;
  const stroke=(points:readonly (readonly [number,number])[])=>{
   ctx.beginPath();
   for(let i=0;i<points.length;i++){
    const point=points[i];
    if(i===0)ctx.moveTo(point[0],point[1]);
    else ctx.lineTo(point[0],point[1]);
   }
   ctx.stroke();
  };
  const hip=figure.joints[0][0];
  const shoulder=figure.joints[0][1];
  stroke([hip,shoulder]);

  // Reaching and pedalling without moving forward much conveys weightlessness.
  stroke([hip,[-.24,-.3+.08*paddle],[-.4,-.7+.1*paddle]]);
  stroke([hip,[.16,-.4-.10*paddle],[.44,-.62-.16*paddle]]);
  stroke([[-.18,shoulder[1]],[-.45,.33+.16*paddle],[-.68,.18+.22*paddle]]);
  stroke([[.18,shoulder[1]],[.42,.34-.18*paddle],[.67,.65-.19*paddle]]);
  ctx.beginPath();
  ctx.arc(figure.head[0],figure.head[1],.24,0,Math.PI*2);
  ctx.fill();
  ctx.shadowBlur=0;
  ctx.fillStyle="#090a0b";
  ctx.beginPath();
  ctx.arc(figure.head[0]+.08,figure.head[1]+.04,.04,0,Math.PI*2);
  ctx.fill();
  // Short disjointed impulse lines suggest effort rather than powered flight.
  ctx.globalAlpha=.32+.13*Math.sin(t*5.3);
  ctx.strokeStyle="#fff";
  ctx.lineWidth=.022;
  stroke([[-.7,.03],[-.95,-.04]]);
  stroke([[-.8,-.19],[-1.1,-.24]]);
  ctx.restore();
 }

 private finish(){
  if(!this.active||this.ambient)return;
  this.ambient=true;
  this.skip.hidden=true;
  this.overlay.classList.add("opening-intro--ambient");
  this.overlay.removeAttribute("role");
  this.overlay.removeAttribute("aria-modal");
  this.overlay.setAttribute("aria-hidden","true");
  window.removeEventListener("keydown",this.handleKeyDown,true);
  this.menuRoot.inert=false;
  this.menuRoot.classList.add("game-ui-intro-revealed");
  this.menuRoot.querySelector<HTMLButtonElement>('button[data-action="start"]')
   ?.focus({preventScroll:true});
 }

 dispose(){
  if(!this.active)return;
  this.active=false;
  if(this.frameId!==null)window.cancelAnimationFrame(this.frameId);
  this.frameId=null;
  window.removeEventListener("keydown",this.handleKeyDown,true);
  window.removeEventListener("resize",this.resize);
  document.removeEventListener("visibilitychange",this.handleVisibility);
  this.overlay.remove();
  this.menuRoot.inert=false;
  this.menuRoot.classList.remove("game-ui-intro-revealed");
 }
}
