import type {ArenaId,GameRenderState,Platform} from "../gameplay/GameSession";

/**
 * Visual-only platform ornamentation. All coordinates are local to the
 * platform's lower-left corner; no collision shapes are ever modified.
 */
export type PlatformMaterial="earth"|"stone"|"metal"|"frost";
export type PlatformInkTone="edge"|"detail"|"accent";
export type PlatformInkMotion="none"|"tip"|"pebble";
export interface PlatformInkStroke {
 readonly x1:number;readonly y1:number;readonly x2:number;readonly y2:number;
 readonly anchorX:number;readonly tone:PlatformInkTone;readonly motion:PlatformInkMotion;
}
export interface PlatformInkArt {
 readonly key:string;readonly material:PlatformMaterial;
 readonly strokes:readonly PlatformInkStroke[];
}

export function platformMaterial(arena:ArenaId,platform:Platform):PlatformMaterial {
 if(platform.surface==="ice")return "frost";
 if(platform.surface==="conveyorLeft"||platform.surface==="conveyorRight")return "metal";
 if(platform.surface==="slippery")return "stone";
 if(["bridge","moving","conveyor","reactor","zigzag","storm"].includes(arena))return "metal";
 if(["ruins","fortress","towers","crater","pit","collapse"].includes(arena))return "stone";
 return "earth";
}

// A repeatable hash means moving-platform coordinates never change the pattern.
function hash(text:string){let h=2166136261;for(let i=0;i<text.length;i++){h=Math.imul(h^text.charCodeAt(i),16777619);}return h>>>0;}
function generator(seed:number){let v=seed;return()=>{v=(Math.imul(v,1664525)+1013904223)>>>0;return v/4294967296;};}
export function platformArtKey(arena:ArenaId,p:Platform,index:number){
 return [arena,index,p.width,p.height,p.surface??"normal"].join(":");
}
export function generatePlatformInk(arena:ArenaId,p:Platform,index:number):PlatformInkArt {
 const key=platformArtKey(arena,p,index),material=platformMaterial(arena,p);
 const random=generator(hash(key)),strokes:PlatformInkStroke[]=[];
 const add=(x1:number,y1:number,x2:number,y2:number,tone:PlatformInkTone="detail",motion:PlatformInkMotion="none",anchorX=x1)=>{
  strokes.push({x1,y1,x2,y2,tone,motion,anchorX});
 };
 const top=p.height;
 // A shallow wavering ink outline sits on top of the *unchanged* rectangular platform.
 const steps=Math.max(2,Math.min(48,Math.ceil(p.width/.65)));
 let previous=top+.012;
 for(let i=1;i<=steps;i++){
  const next=i===steps?top+.012:top+.012+(random()-.5)*.034;
  add((i-1)*p.width/steps,previous,i*p.width/steps,next,"edge");
  previous=next;
 }
 // Tiny imperfect corner strokes clarify ledges without moving the silhouette.
 add(0,top-.11,.018,top+.012,"edge");
 add(p.width-.018,top+.012,p.width,top-.10,"edge");

 const count=Math.max(2,Math.min(18,Math.floor(p.width/1.35)));
 const spacing=p.width/count;
 for(let i=0;i<count;i++){
  const x=(i+.22+random()*.55)*spacing;
  const size=.065+random()*.09;
  const variant=random();
  if(material==="earth"){
   if(variant<.68){
    const height=size*(1.25+random()*.65);
    add(x,top+.013,x-.045-random()*.03,top+height,"accent","tip",x);
    add(x,top+.013,x+.04+random()*.04,top+height*.88,"accent","tip",x);
    if(random()>.38)add(x,top+.013,x+(random()-.5)*.035,top+height*1.2,"accent","tip",x);
   }else if(variant<.84){
    // A small plant with two leaves; animate only its upper stems.
    add(x,top+.012,x+.025,top+size*1.7,"accent","tip",x);
    add(x+.012,top+size,x-.05,top+size*1.26,"accent","tip",x);
    add(x+.014,top+size*1.32,x+.075,top+size*1.5,"accent","tip",x);
   }else{
    add(x-size*.7,top+.03,x,top+size*.48,"detail","pebble",x);
    add(x,top+size*.48,x+size*.75,top+.03,"detail","pebble",x);
   }
  }else if(material==="stone"){
   if(variant<.65){
    const y=top-.035-random()*.06;
    add(x,y,x+size*.6,y-size*.7);
    add(x+size*.6,y-size*.7,x+size*.18,y-size*1.45);
    if(random()>.5)add(x+size*.6,y-size*.7,x+size*1.2,y-size*.94);
   }else{
    const y=top+.015;
    add(x-size,y,x,y+size*.52,"detail","pebble",x);
    add(x,y+size*.52,x+size*.8,y,"detail","pebble",x);
    add(x+size*.8,y,x-size,y,"detail","pebble",x);
   }
  }else if(material==="metal"){
   if(variant<.72){
    // A small rivet cross remains inset so one-way and conveyor rims stay readable.
    const y=top-.08;
    add(x-size*.27,y,x+size*.27,y,"accent");
    add(x,y-size*.27,x,y+size*.27,"accent");
   }else{
    add(x-size,top-.13,x-size*.25,top-.16);
    add(x-size*.1,top-.17,x+size*.45,top-.14);
   }
  }else{
   // Ice retains its clean movement cue: sparse frost scratches, never grass.
   add(x-size,top-.08,x+size*.6,top-.025,"accent");
   if(variant>.55)add(x-size*.35,top-.15,x+size*.48,top-.11);
  }
 }
 // Stage-exclusive details replace the feeling that every arena uses the
 // same generic ledge. They follow each platform locally, including moving
 // platforms, and never introduce physics/collision geometry.
 const clusters=Math.min(6,Math.max(1,Math.floor(p.width/3)));
 for(let i=0;i<clusters;i++){
  const x=(i+.5)*p.width/clusters;
  const y=top+.016;
  switch(arena){
   case "classic": // clean ornamental seam
    add(x-.16,y-.09,x-.04,y-.09);add(x+.04,y-.09,x+.16,y-.09);break;
   case "towers": // masonry columns
    add(x-.13,y-.16,x-.13,y-.03);
    add(x+.13,y-.16,x+.13,y-.03);add(x-.13,y-.13,x+.13,y-.13);break;
   case "pit": // razor-cut rock
    add(x-.16,y-.11,x-.04,y-.19);add(x-.04,y-.19,x+.06,y-.1);
    add(x+.06,y-.1,x+.15,y-.22,"accent");break;
   case "steps": // terrace edging
    add(x-.17,y-.13,x-.08,y-.07);add(x-.08,y-.07,x+.09,y-.07);
    add(x+.09,y-.07,x+.17,y-.13);break;
   case "zigzag": // voltage ticks
    add(x-.15,y-.08,x-.05,y-.08,"accent");add(x-.05,y-.08,x+.025,y-.16,"accent");
    add(x+.025,y-.16,x+.13,y-.04,"accent");break;
   case "sky": // airy cross braces
    add(x-.15,y-.1,x,y-.19,"accent");add(x,y-.19,x+.15,y-.1,"accent");break;
   case "moving": // rail guides
    add(x-.17,y-.12,x+.13,y-.12);add(x+.02,y-.2,x+.13,y-.12,"accent");
    add(x+.02,y-.04,x+.13,y-.12,"accent");break;
   case "fortress": // stone block joins
    add(x-.17,y-.2,x+.17,y-.2);add(x,y-.2,x,y-.03);
    add(x-.17,y-.07,x-.17,y-.17);break;
   case "bridge": // girder braces
    add(x-.16,y-.17,x,y-.05);add(x,y-.05,x+.16,y-.17);
    add(x-.16,y-.17,x+.16,y-.17);break;
   case "crater": // glowing magma cracks
    add(x-.13,y-.16,x-.02,y-.08,"accent");
    add(x-.02,y-.08,x+.04,y-.19,"accent");
    add(x+.04,y-.19,x+.14,y-.14,"accent");break;
   case "vertical": // stacked upward chevrons
    add(x-.13,y-.13,x,y-.04,"accent");
    add(x,y-.04,x+.13,y-.13,"accent");
    add(x-.13,y-.20,x,y-.11);add(x,y-.11,x+.13,y-.20);break;
   case "ruins": // fractured keystones
    add(x-.13,y-.1,x-.04,y-.22);
    add(x-.04,y-.22,x+.07,y-.15);add(x+.07,y-.15,x+.16,y-.21);break;
   case "conveyor": // chevron treads
    add(x-.14,y-.18,x-.015,y-.105,"accent");
    add(x-.015,y-.105,x-.14,y-.03,"accent");
    add(x+.03,y-.18,x+.155,y-.105,"accent");
    add(x+.155,y-.105,x+.03,y-.03,"accent");break;
   case "collapse": // unstable cracked braces
    add(x-.16,y-.04,x-.035,y-.14,"accent");
    add(x-.035,y-.14,x+.045,y-.065,"accent");
    add(x+.045,y-.065,x+.17,y-.22,"accent");break;
   case "storm": // wind cutouts
    add(x-.16,y-.04,x+.09,y-.04,"accent");
    add(x-.07,y-.13,x+.17,y-.13);
    add(x+.09,y-.04,x+.15,y-.09);break;
   case "reactor": // reactor circuitry
    add(x-.13,y-.16,x-.03,y-.16,"accent");
    add(x-.03,y-.16,x-.03,y-.075,"accent");
    add(x-.03,y-.075,x+.13,y-.075,"accent");
    add(x+.13,y-.075,x+.13,y-.19);break;
  }
 }
 return {key,material,strokes};
}

export class PlatformInkCache {
 private readonly cache=new Map<string,PlatformInkArt>();
 get(arena:ArenaId,p:Platform,index:number):PlatformInkArt {
  const key=platformArtKey(arena,p,index);
  let art=this.cache.get(key);
  if(!art){if(this.cache.size>=80)this.cache.clear();art=generatePlatformInk(arena,p,index);this.cache.set(key,art);}
  return art;
 }
 clear(){this.cache.clear();}
}

/** Signed, damped reaction: roots remain anchored while tips sway and pebbles jiggle. */
export function platformInkReaction(stroke:PlatformInkStroke,p:Platform,state:GameRenderState,enabled=true):number {
 if(!enabled||stroke.motion==="none")return 0;
 const x=p.x+stroke.anchorX,top=p.y+p.height;
 let reaction=0;
 for(let i=0;i<2;i++){
  const fighter=i===0?state.player:state.opponent;
  if(!fighter.grounded||fighter.landingTime<=0)continue;
  const proximity=Math.max(0,1-Math.abs(fighter.x-x)/1.5);
  const feet=fighter.y-.9;
  if(proximity===0||Math.abs(feet-top)>.32)continue;
  const age=.18-fighter.landingTime;
  reaction+=proximity*Math.max(0,fighter.landingTime/.18)*Math.sin(age*48+stroke.anchorX*.4);
 }
 for(const cue of state.combatCues){
  if(cue.kind!=="hit"&&cue.kind!=="slam"&&cue.kind!=="explosion"&&cue.kind!=="throw")continue;
  const dist=Math.hypot(cue.x-x,cue.y-top);
  if(dist>2.1)continue;
  const decay=Math.max(0,1-cue.age/cue.life);
  reaction+=(1-dist/2.1)*decay*decay*Math.sin(cue.age*45+stroke.anchorX)*Math.min(1.3,cue.intensity);
 }
 return Math.max(-1,Math.min(1,reaction));
}
