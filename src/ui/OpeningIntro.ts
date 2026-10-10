import {fighterVisual} from "../rendering/FighterVisual";
import type {DuelistRenderState} from "../gameplay/GameSession";
import {
 OPENING_DURATION_MS,
 REDUCED_MOTION_DURATION_MS,
 ambientFighterPlacement,
 ambientFighterDrift,
 openingStarBrightness,
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
 private lastDrawTime=0;
 private elapsed=0;
 private duration=OPENING_DURATION_MS;
 private width=1;
 private height=1;
 private ratio=1;
 private active=false;
 private ambient=false;
 private ambientSince=0;
 private ambientPlacement={x:.84,scale:1};
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

 start(restoring=false){
  if(this.active)return;
  this.context=this.canvas.getContext("2d");
  if(!this.context){
   this.menuRoot.classList.remove("game-ui-intro-pending");
   return; // Canvas unavailable: leave the normal menu visible.
  }
  this.ambient=false;
  this.ambientSince=0;
  this.elapsed=0;
  this.lastTime=0;
  this.lastDrawTime=0;
  this.skip.hidden=false;
  this.overlay.classList.remove("opening-intro--ambient");
  this.overlay.setAttribute("role","dialog");
  this.overlay.setAttribute("aria-modal","true");
  this.overlay.removeAttribute("aria-hidden");
  this.reducedMotion=window.matchMedia?.("(prefers-reduced-motion: reduce)").matches??false;
  this.duration=this.reducedMotion?REDUCED_MOTION_DURATION_MS:OPENING_DURATION_MS;
  this.elapsed=restoring?this.duration+3400:0;
  this.active=true;
  document.body.append(this.overlay);
  this.menuRoot.inert=true;
  window.addEventListener("keydown",this.handleKeyDown,true);
  window.addEventListener("resize",this.resize);
  document.addEventListener("visibilitychange",this.handleVisibility);
  this.canvas.addEventListener("contextlost",this.handleContextLost);
  this.canvas.addEventListener("contextrestored",this.handleContextRestored);
  this.resize();
  if(restoring){
   this.finish(false);
   this.ambientSince=this.elapsed-3400; // Restore already settled, not the last intro pose.
  }
  try{
   this.draw();
   this.scheduleFrame();
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

 private readonly handleContextLost=(event:Event)=>{
  // Browsers may reclaim a mobile canvas surface in the background.
  event.preventDefault();
  this.cancelFrame();
  this.context=null;
 };
 private readonly handleContextRestored=()=>{
  if(!this.active)return;
  this.context=this.canvas.getContext("2d");
  if(!this.context)return;
  this.lastTime=0;
  this.lastDrawTime=0;
  this.resize();
  this.draw();
  this.scheduleFrame();
 };
 private cancelFrame(){
  if(this.frameId!==null)window.cancelAnimationFrame(this.frameId);
  this.frameId=null;
 }
 private scheduleFrame(){
  if(!this.active||!this.context||document.hidden||this.frameId!==null||(this.ambient&&this.reducedMotion))return;
  this.frameId=window.requestAnimationFrame(this.tick);
 }
 private readonly handleVisibility=()=>{
  if(!this.active)return;
  this.lastTime=0;
  this.lastDrawTime=0;
  if(document.hidden)this.cancelFrame();
  else{
   this.draw(); // Refresh on foreground, even for a reduced-motion static scene.
   this.scheduleFrame();
  }
 };

 private readonly resize=()=>{
  if(!this.active||!this.context)return;
  this.width=Math.max(1,this.overlay.clientWidth||window.innerWidth);
  this.height=Math.max(1,this.overlay.clientHeight||window.innerHeight);
  this.ratio=Math.min(window.devicePixelRatio||1,2);
  this.canvas.width=Math.max(1,Math.round(this.width*this.ratio));
  this.canvas.height=Math.max(1,Math.round(this.height*this.ratio));
  if(this.ambient)this.updateAmbientPlacement();
  // Resizing a canvas clears its pixels even when reduced motion has paused RAF.
  if(this.ambient)this.draw();
 };

 private updateAmbientPlacement(){
  const panel=this.menuRoot.querySelector<HTMLElement>(".game-ui:not(.playing)");
  const panelWidth=panel?.offsetWidth??Math.min(512,Math.max(0,this.width-16));
  this.ambientPlacement=ambientFighterPlacement(this.width,panelWidth);
 }

 private readonly tick=(now:number)=>{
  this.frameId=null;
  if(!this.active||document.hidden)return;
  if(this.lastTime!==0)this.elapsed+=Math.min(64,Math.max(0,now-this.lastTime));
  this.lastTime=now;
  if(!this.ambient&&this.elapsed>=this.duration)this.finish();
  if(this.ambient&&!this.reducedMotion&&this.lastDrawTime>0&&now-this.lastDrawTime<32){
   this.scheduleFrame(); // Cap ambient redraws at about 30 fps to reduce battery use.
   return;
  }
  try{
   this.draw();
   this.lastDrawTime=now;
  }catch(error){
   console.warn("Opening animation interrupted; continuing to menu.",error);
   if(!this.ambient)this.finish();
   else this.dispose();
   return;
  }
  this.scheduleFrame();
 };

 private draw(){
  const ctx=this.context;
  if(!ctx)return;
  const w=this.width,h=this.height;
  const pose=openingFrame(this.elapsed,this.duration);
  ctx.setTransform(this.ratio,0,0,this.ratio,0,0);
  ctx.fillStyle="#020611";
  ctx.fillRect(0,0,w,h);
  const t=this.elapsed/1000;
  this.drawSpaceAtmosphere(ctx,w,h,t);
  for(const star of this.stars){
   ctx.globalAlpha=openingStarBrightness(star,t,this.reducedMotion);
   ctx.fillStyle="#fff";
   ctx.beginPath();
   ctx.arc(star.x*w,star.y*h,star.size,0,Math.PI*2);
   ctx.fill();
  }
  ctx.globalAlpha=1;
  this.drawPlanet(ctx,w,h,t);
  // Continue paddling in zero gravity beside the menu instead of disappearing
  // beneath its opaque panel. The starfield and planet also keep animating.
  const progress=this.ambient?Math.min(1,Math.max(0,(this.elapsed-this.ambientSince)/3400)):0;
  const ambientBlend=progress*progress*(3-2*progress); // No velocity discontinuity at reveal.
  const hero=ambientFighterDrift(t);
  const figureX=pose.x+(this.ambientPlacement.x+hero.x-pose.x)*ambientBlend;
  const figureY=pose.y+(hero.y)*ambientBlend;
  const figureScale=1-(1-this.ambientPlacement.scale)*ambientBlend;
  this.drawFighter(ctx,w,h,t,figureX,figureY,pose.angle+ambientBlend*hero.angle,
   pose.paddle*(1-ambientBlend)+hero.paddle*ambientBlend,figureScale);
  if(this.ambient){
   const enemy=ambientFighterDrift(t,true);
   const fade=this.reducedMotion?1:Math.min(1,Math.max(0,(this.elapsed-this.ambientSince)/1800));
   ctx.save();
   ctx.globalAlpha=fade*fade*(3-2*fade);
   this.drawFighter(ctx,w,h,t,1-this.ambientPlacement.x+enemy.x,.43+enemy.y,
    enemy.angle,enemy.paddle,this.ambientPlacement.scale*.95,true);
   ctx.restore();
  }
 }

 /**
  * Soft procedural nebula, orbital silhouettes and far-field satellite debris.
  * Lightweight enough for the ~30 fps ambient menu; no external image assets.
  * Center stays subdued for readable RTL/LTR menu text and controls.
  */
 private drawSpaceAtmosphere(ctx:CanvasRenderingContext2D,w:number,h:number,t:number){
  ctx.save();
  const sky=ctx.createLinearGradient?.(0,0,0,h);
  if(sky){
   sky.addColorStop(0,"#030714");
   sky.addColorStop(.57,"#07152d");
   sky.addColorStop(1,"#020610");
  }
  ctx.fillStyle=sky??"#030714";ctx.fillRect(0,0,w,h);
  for(const glow of [
   {x:.09,y:.35,size:.4,color:"40,100,183",alpha:.20},
   {x:.92,y:.16,size:.39,color:"44,102,195",alpha:.17},
   {x:.55,y:.82,size:.52,color:"70,136,222",alpha:.10}
  ]){
   const x=glow.x*w,y=glow.y*h,r=Math.max(w,h)*glow.size;
   const light=ctx.createRadialGradient(x,y,0,x,y,r);
   light.addColorStop(0,`rgba(${glow.color},${glow.alpha})`);
   light.addColorStop(.33,`rgba(${glow.color},${glow.alpha*.26})`);
   light.addColorStop(1,`rgba(${glow.color},0)`);
   ctx.fillStyle=light;ctx.fillRect(x-r,y-r,2*r,2*r);
  }
  // Slow, restrained orbital glow stays well clear of the central menu panel.
  for(const side of [-1,1]){
   const x=(side<0?-.095:1.095)*w+Math.sin(t*.05+side)*w*.006,y=h*.31;
   ctx.strokeStyle=side<0?"#5388b8":"#497cba";
   ctx.lineWidth=Math.max(.7,w*.0009);
   ctx.globalAlpha=.19;
   ctx.beginPath();ctx.ellipse(x,y,w*.19,h*.085,-side*.12,0,Math.PI*2);ctx.stroke();
   ctx.globalAlpha=.36;
   ctx.lineWidth=Math.max(1,w*.0015);
   ctx.beginPath();ctx.ellipse(x,y,w*.14,h*.054,-side*.12,.2,2.45);ctx.stroke();
  }
  for(let i=0;i<11;i++){
   const left=i%2===0;
   const x=(left?.04:.96)*w+(left?1:-1)*w*.045*Math.sin(i*4.3);
   const y=h*(.2+(i*.119)% .56);
   const size=Math.max(1.2,w*(.002+(i%3)*.002));
   ctx.fillStyle="#334a6c";ctx.globalAlpha=.18+(i%4)*.06;
   ctx.beginPath();ctx.moveTo(x-size*1.2,y);
   ctx.lineTo(x-size*.2,y-size*.7);
   ctx.lineTo(x+size*.95,y-size*.24);
   ctx.lineTo(x+size*.85,y+size*.65);
   ctx.lineTo(x-size*.5,y+size*.8);
   ctx.closePath();ctx.fill();
  }
  ctx.restore();
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
  surface.addColorStop(0,"#d5e5fa");
  surface.addColorStop(.16,"#8ba9d2");
  surface.addColorStop(.39,"#354c72");
  surface.addColorStop(.68,"#111c36");
  surface.addColorStop(1,"#030713");
  ctx.fillStyle=surface;
  ctx.beginPath();
  ctx.arc(x,y,radius,0,Math.PI*2);
  ctx.fill();

  ctx.strokeStyle="#9ed5ff";
  ctx.lineWidth=Math.max(1.4,radius*.004);
  ctx.shadowColor="#539ade";
  ctx.shadowBlur=Math.min(32,radius*.045);
  ctx.beginPath();
  ctx.arc(x,y,radius,Math.PI*1.02,Math.PI*1.98);
  ctx.stroke();
  ctx.shadowBlur=0;

  // Jagged, low-contrast terrain along the distant upper limb.
  ctx.globalAlpha=.2;
  ctx.strokeStyle="#294467";
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
  nx:number,ny:number,rotation:number,paddle:number,scaleMultiplier=1,enemy=false){
  // Use the same articulated torso and head design as the in-game fighter.
  const state:DuelistRenderState={
   x:0,y:0,enemyType:enemy?"runner":null,bowCharge:0,missileAngle:45,missilePower:12,
   velocityX:enemy?-.8:.8,velocityY:1,grounded:false,facing:enemy?-1:1,
   health:100,maxHealth:100,weapon:"blade",attackTime:0,attackVariant:0,
   animationTime:t,gaitPhase:t*3,landingTime:0,hitTime:0,bossPhase:0,attackTelegraph:0
  };
  const figure=fighterVisual(state);
  const scale=Math.max(25,Math.min(60,h*.068,w*.145))*scaleMultiplier;
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
  ctx.arc(figure.head[0]+(enemy?-.08:.08),figure.head[1]+.04,.04,0,Math.PI*2);
  ctx.fill();
  if(enemy){
   // A recognizably red headband on the same shared doodle head pose as gameplay.
   ctx.strokeStyle="#f04250";
   ctx.fillStyle="#f04250";
   ctx.lineWidth=.105;
   stroke([[figure.head[0]-.24,figure.head[1]+.07],
    [figure.head[0]-.03,figure.head[1]+.12],
    [figure.head[0]+.24,figure.head[1]+.055]]);
   ctx.lineWidth=.057;
   stroke([[figure.head[0]+.21,figure.head[1]+.075],
    [figure.head[0]+.43,figure.head[1]+.005],
    [figure.head[0]+.51,figure.head[1]+.105]]);
   stroke([[figure.head[0]+.2,figure.head[1]+.06],
    [figure.head[0]+.45,figure.head[1]-.17]]);
  }
  // Short disjointed impulse lines suggest effort rather than powered flight.
  ctx.globalAlpha=.32+.13*Math.sin(t*5.3);
  ctx.strokeStyle="#fff";
  ctx.lineWidth=.022;
  stroke([[-.7,.03],[-.95,-.04]]);
  stroke([[-.8,-.19],[-1.1,-.24]]);
  ctx.restore();
 }

 private finish(reveal=true){
  if(!this.active||this.ambient)return;
  this.ambient=true;
  this.ambientSince=this.elapsed;
  this.skip.hidden=true;
  this.overlay.classList.add("opening-intro--ambient");
  this.overlay.removeAttribute("role");
  this.overlay.removeAttribute("aria-modal");
  this.overlay.setAttribute("aria-hidden","true");
  window.removeEventListener("keydown",this.handleKeyDown,true);
  this.menuRoot.inert=false;
  this.menuRoot.classList.remove("game-ui-intro-pending");
  if(reveal)this.menuRoot.classList.add("game-ui-intro-revealed");
  this.updateAmbientPlacement();
  if(this.reducedMotion){
   this.cancelFrame();
   this.draw(); // Static scene includes both fighters, never a blank final frame.
  }else this.scheduleFrame();
  this.menuRoot.querySelector<HTMLButtonElement>('button[data-action="start"]')
   ?.focus({preventScroll:true});
 }

 /** Restore the living starfield immediately if the player returns to the menu. */
 restoreAmbient(){
  if(this.active)return;
  this.start(true); // Mount directly in steady ambient mode, with no first-frame flash.
 }

 dispose(){
  if(!this.active){
   this.menuRoot.classList.remove("game-ui-intro-pending");
   return;
  }
  this.active=false;
  this.cancelFrame();
  window.removeEventListener("keydown",this.handleKeyDown,true);
  window.removeEventListener("resize",this.resize);
  document.removeEventListener("visibilitychange",this.handleVisibility);
  this.canvas.removeEventListener("contextlost",this.handleContextLost);
  this.canvas.removeEventListener("contextrestored",this.handleContextRestored);
  this.overlay.remove();
  this.menuRoot.inert=false;
  this.menuRoot.classList.remove("game-ui-intro-pending");
  this.menuRoot.classList.remove("game-ui-intro-revealed");
 }
}
