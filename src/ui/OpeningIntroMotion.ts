/** Deterministic timing and star placement for the opening space sequence. */
export const OPENING_DURATION_MS=12000;
export const REDUCED_MOTION_DURATION_MS=1000;

export interface OpeningFrame{
 readonly progress:number;
 readonly x:number;
 readonly y:number;
 readonly angle:number;
 readonly paddle:number;
}
export interface OpeningStar{
 readonly x:number;
 readonly y:number;
 readonly size:number;
 readonly light:number;
 readonly phase:number;
 readonly twinklePeriod:number;
 readonly twinkleStrength:number;
}
const clamp01=(value:number)=>Math.max(0,Math.min(1,value));

/** Positive x moves toward the right; the body drifts while its limbs paddle. */
export function openingFrame(elapsedMs:number,durationMs=OPENING_DURATION_MS):OpeningFrame{
 const duration=Math.max(1,durationMs);
 const elapsed=Math.max(0,elapsedMs);
 const progress=clamp01(elapsed/duration);
 // Keep the same starfield and weightless movement after the menu appears.
 const seconds=elapsed/1000;
 return{
  progress,
  x:.39+.18*progress+.014*Math.sin(seconds*.93),
  y:.43+.026*Math.sin(seconds*1.45)-.016*progress,
  angle:-.18+.19*Math.sin(seconds*.78)+.06*Math.sin(seconds*2.6),
  paddle:Math.sin(seconds*5.3)+.25*Math.sin(seconds*8.9)
 };
}


export interface AmbientFighterPlacement{
 readonly x:number;
 readonly scale:number;
}

/** Place the floating fighter in the space beside the centered menu, not beneath it. */
export function ambientFighterPlacement(viewportWidth:number,menuWidth:number):AmbientFighterPlacement{
 const width=Math.max(1,viewportWidth);
 const panelWidth=Math.min(width,Math.max(0,menuWidth));
 const gutter=(width-panelWidth)/2;
 return{
  x:Math.min(.97,Math.max(.55,(width-gutter*.52)/width)),
  scale:Math.min(1,Math.max(.34,(gutter-10)/48))
 };
}

/** Stars have stable positions between frames and launches. */
export function openingStars(count=100,seed=0xdecafbad):OpeningStar[]{
 let value=seed>>>0;
 const rand=()=>{
  value=(Math.imul(value,1664525)+1013904223)>>>0;
  return value/4294967296;
 };
 const stars:OpeningStar[]=[];
 for(let i=0;i<Math.max(0,count);i++){
  stars.push({
   x:rand(),
   y:rand()*.92,
   size:.45+rand()*1.6,
   light:.18+rand()*.7,
   phase:rand()*Math.PI*2,
   twinklePeriod:9+rand()*16,
   twinkleStrength:i%4===0?.09+rand()*.16:0
  });
 }
 return stars;
}

/** A separately timed pulse, not a global "breathing" oscillator.
 * Only one quarter of the stars change brightness; the rest remain steady. */
export function openingStarBrightness(star:OpeningStar,seconds:number,reducedMotion=false):number{
 if(reducedMotion||star.twinkleStrength===0)return star.light*.9;
 const cycle=(1+Math.sin(seconds*2*Math.PI/star.twinklePeriod+star.phase))*.5;
 // Raising the sine window keeps the brightening brief but entirely smooth.
 return star.light*(.84+star.twinkleStrength*Math.pow(cycle,8));
}

export interface AmbientDrift{
 readonly x:number;
 readonly y:number;
 readonly angle:number;
 readonly paddle:number;
}
/** Independent, low-frequency, continuously differentiable zero-g movement. */
export function ambientFighterDrift(seconds:number,enemy=false):AmbientDrift{
 if(enemy)return{
  x:.005*Math.sin(seconds*.41+1.9),
  y:.16+.012*Math.sin(seconds*.31+2.1),
  angle:.14*Math.sin(seconds*.4+1.2)-.08,
  paddle:Math.sin(seconds*2.8+1.6)+.18*Math.sin(seconds*4.6)
 };
 return{
  x:.007*Math.sin(seconds*.48+.3),
  y:-.035+.014*Math.sin(seconds*.38),
  angle:.11*Math.sin(seconds*.46),
  paddle:Math.sin(seconds*3.2)+.15*Math.sin(seconds*4.7)
 };
}
