import type {ArenaTheme} from "./ArenaThemes";

/**
 * Static procedural environment art. All geometry is drawn once per arena/size:
 * CanvasRenderer caches it in an offscreen canvas; ThreeRenderer uploads the
 * same painting as a CanvasTexture. No textures, network requests, randomness
 * between frames or changes to collision geometry.
 */
type Brush=CanvasRenderingContext2D;
const TAU=Math.PI*2;
function rgb(hex:string,alpha:number){
 const n=parseInt(hex.slice(1),16);
 return `rgba(${n>>16&255},${n>>8&255},${n&255},${alpha})`;
}
function rng(seed:number){
 let n=seed>>>0;
 return ()=>{n=(Math.imul(n,1664525)+1013904223)>>>0;return n/4294967296;};
}
function gradient(c:Brush,y0:number,y1:number,stops:readonly [number,string][]){
 const g=c.createLinearGradient?.(0,y0,0,y1);
 if(!g)return stops[0][1];
 for(const [offset,color] of stops)g.addColorStop(offset,color);
 return g;
}
function glow(c:Brush,x:number,y:number,radius:number,color:string,alpha:number){
 if(radius<=0)return;
 c.save();
 const g=c.createRadialGradient?.(x,y,0,x,y,radius);
 if(g){
  g.addColorStop(0,rgb(color,alpha));
  g.addColorStop(.3,rgb(color,alpha*.36));
  g.addColorStop(1,rgb(color,0));
  c.fillStyle=g;
  c.fillRect(x-radius,y-radius,2*radius,2*radius);
 }else{
  c.globalAlpha=alpha*.14;c.fillStyle=color;
  c.fillRect(x-radius*.6,y-radius*.6,radius*1.2,radius*1.2);
 }
 c.restore();
}
function line(c:Brush,x1:number,y1:number,x2:number,y2:number,width:number,color:string,alpha=1){
 c.save();c.strokeStyle=color;c.globalAlpha=alpha;c.lineWidth=width;
 c.beginPath();c.moveTo(x1,y1);c.lineTo(x2,y2);c.stroke();c.restore();
}
function disk(c:Brush,x:number,y:number,rx:number,ry:number,color:string,alpha=1){
 c.save();c.globalAlpha=alpha;c.fillStyle=color;
 c.beginPath();c.ellipse(x,y,rx,ry,0,0,TAU);c.fill();c.restore();
}
function polygon(c:Brush,points:readonly (readonly [number,number])[],color:string,alpha=1){
 c.save();c.globalAlpha=alpha;c.fillStyle=color;
 c.beginPath();
 for(let i=0;i<points.length;i++){
  const [x,y]=points[i];if(i===0)c.moveTo(x,y);else c.lineTo(x,y);
 }
 c.closePath();c.fill();c.restore();
}
function atmosphere(c:Brush,w:number,h:number,t:ArenaTheme,seed:number){
 const random=rng(seed);
 c.fillStyle=gradient(c,0,h,[[0,t.skyTop],[.56,t.skyTop],[1,t.skyBottom]]);
 c.fillRect(0,0,w,h);
 // Broad, feathered light: bright on the horizon, dark behind combat sprites.
 glow(c,w*(.32+random()*.36),h*.57,Math.max(w*.3,h*.65),t.secondary,.15);
 glow(c,w*(.2+random()*.6),h*.81,Math.max(w*.27,h*.56),t.accent,.11);
 c.fillStyle=gradient(c,h*.49,h,[[0,rgb(t.secondary,0)],[.52,rgb(t.secondary,.075)],[1,rgb(t.skyBottom,.43)]]);
 c.fillRect(0,h*.49,w,h*.51);
 // Fixed seeded stars/dust, with smaller/fainter marks at the center.
 for(let i=0;i<63;i++){
  const x=random()*w,y=(.05+random()*.72)*h,r=(.45+random()*.9)*Math.max(.7,Math.min(w,h)/410);
  disk(c,x,y,r,r,t.secondary,.16+random()*.36);
  if(i%17===0){
   line(c,x-r*3,y,x+r*3,y,.6,t.secondary,.28);
   line(c,x,y-r*3,x,y+r*3,.6,t.secondary,.28);
  }
 }
 // Near-transparent cloud banks overlap in different depths.
 for(let layer=0;layer<3;layer++){
  for(let i=0;i<7;i++){
   const x=(i-.3+random()*.5)*w/6;
   const y=(.35+layer*.13+random()*.08)*h;
   disk(c,x,y,w*(.065+random()*.055),h*(.022+layer*.008),t.secondary,.035+layer*.012);
  }
 }
}
function ridge(c:Brush,w:number,h:number,random:()=>number,y:number,roughness:number,color:string){
 const pts:[number,number][]=[[0,h],[0,y]];
 const peaks=18;
 for(let i=0;i<=peaks;i++){
  const x=i*w/peaks;
  const shape=(Math.sin(i*1.77)+Math.sin(i*.63+1.5))*.21;
  pts.push([x,y-h*(roughness*(.28+random()*.55+shape))]);
 }
 pts.push([w,h]);polygon(c,pts,color);
}
function mountains(c:Brush,w:number,h:number,t:ArenaTheme,random:()=>number){
 disk(c,w*.68,h*.35,h*.085,h*.085,t.secondary,.12);
 glow(c,w*.68,h*.35,h*.3,t.accent,.13);
 ridge(c,w,h,random,h*.78,.25,rgb(t.silhouette,1));
 c.save();c.globalAlpha=.28;
 ridge(c,w,h,random,h*.88,.17,t.silhouette);
 c.restore();
 // Monumental pillars, broken arches and ruined parapets at the edges.
 for(const side of [0,1]){
  const x=side?w*.87:w*.07,y=h*.74;
  const width=w*.027;
  c.fillStyle=t.silhouette;
  c.fillRect(x,y-h*.27,width,h*.49);
  c.fillRect(x-width*.42,y-h*.30,width*1.85,h*.022);
  c.fillRect(x-width*.2,y-h*.17,width*1.45,h*.025);
  line(c,x+width*.2,y-h*.31,x+width*.2,y-h*.11,Math.max(1,w*.0012),t.secondary,.22);
  for(let i=0;i<4;i++)line(c,x+width*.1,y-h*(.08-i*.047),x+width*.86,y-h*(.075-i*.047),1,t.secondary,.15);
 }
 for(let i=0;i<6;i++){
  const x=(i+.5)*w/6;
  const y=h*(.69+random()*.10);
  polygon(c,[[x-w*.011,y],[x,y-h*(.07+random()*.05)],[x+w*.013,y]],t.silhouette,.65);
 }
}
function cavern(c:Brush,w:number,h:number,t:ArenaTheme,random:()=>number){
 // The cave mouth frames the playfield rather than darkening the fighters.
 for(let side=0;side<2;side++){
  for(let i=0;i<10;i++){
   const x=(side===0?i/16:1-i/16)*w;
   const hang=h*(.055+random()*.18)*(1-i/14);
   polygon(c,[[x-w*.035,0],[x+w*.027,0],[x+random()*w*.01,h*0+hang]],t.silhouette,.82);
  }
 }
 ridge(c,w,h,random,h*.94,.18,t.silhouette);
 for(let i=0;i<12;i++){
  const x=(i+.1+random()*.8)*w/12;
  const y=h*(.89+random()*.15);
  const tall=h*(.035+random()*.1);
  const size=w*(.01+random()*.014);
  polygon(c,[[x-size,y],[x,y-tall],[x+size*.7,y]],t.secondary,.25+random()*.14);
  line(c,x,y-tall*.86,x+size*.24,y-tall*.15,Math.max(.65,w*.0009),t.accent,.38);
 }
 glow(c,w*.5,h*.81,w*.3,t.accent,.07);
}
function clouds(c:Brush,w:number,h:number,t:ArenaTheme,random:()=>number){
 // Floating city silhouettes: slim towers held above layers of mist.
 for(let layer=0;layer<3;layer++){
  for(let i=0;i<9;i++){
   const x=w*(i-.2+random()*.5)/8,y=h*(.62+layer*.085);
   disk(c,x,y,w*(.075+random()*.06),h*(.036+random()*.026),
    layer===0?t.secondary:t.silhouette,layer===0?.12:.22);
  }
 }
 for(let i=0;i<7;i++){
  const x=(i+.5+random()*.3)*w/7;
  const top=h*(.39+random()*.18),base=top+h*(.08+random()*.1),rw=w*(.012+random()*.018);
  polygon(c,[[x-rw,top],[x+rw,top],[x+rw*.8,base],[x,base+h*.05],[x-rw*.8,base]],t.silhouette,.67);
  c.fillStyle=t.silhouette;c.fillRect(x-rw*.4,top-h*.065,rw*.8,h*.07);
  line(c,x,top-h*.085,x,top-h*.023,1,t.secondary,.28);
  disk(c,x,base+h*.04,rw*1.9,h*.013,t.secondary,.15);
 }
 glow(c,w*.55,h*.4,w*.3,t.secondary,.10);
}
function skyline(c:Brush,w:number,h:number,t:ArenaTheme,random:()=>number){
 for(let layer=0;layer<3;layer++){
  const base=h*(.77+layer*.09),opacity=.29+layer*.21;
  c.save();c.globalAlpha=opacity;c.fillStyle=t.silhouette;
  for(let i=0;i<20;i++){
   const x=(i+random()*.4)*w/19-w*.025;
   const bh=h*(.07+random()*.24)*(1-layer*.2);
   const bw=w*(.023+random()*.017);
   c.fillRect(x,base-bh,bw,h-base+bh);
   if(i%4===0)c.fillRect(x+bw*.42,base-bh-h*.055,bw*.15,h*.058);
   if(layer===2&&i%3===0){
    c.globalAlpha=.24;c.fillStyle=t.secondary;
    for(let j=0;j<4;j++)c.fillRect(x+bw*.27,base-bh+j*bh*.19,bw*.17,Math.max(1,h*.005));
    c.globalAlpha=opacity;c.fillStyle=t.silhouette;
   }
  }
  c.restore();
 }
 for(let i=0;i<7;i++){
  const x=(i+.3)*w/7,y=h*(.57+random()*.13);
  line(c,x,y,x+w*.06,y-h*.015,Math.max(1,h*.002),t.secondary,.18);
 }
 glow(c,w*.47,h*.76,w*.3,t.accent,.12);
}
function industry(c:Brush,w:number,h:number,t:ArenaTheme,random:()=>number){
 skyline(c,w,h,t,random);
 const mid=w*.5,cy=h*.56;
 glow(c,mid,cy,h*.29,t.secondary,.18);
 // Signature reactor chamber and coolant tubes. Structures live behind physics.
 c.save();c.fillStyle=t.silhouette;c.globalAlpha=.82;
 c.fillRect(mid-w*.09,h*.31,w*.18,h*.57);
 c.fillRect(mid-w*.12,h*.30,w*.24,h*.043);
 c.fillRect(mid-w*.115,h*.76,w*.23,h*.052);
 for(const side of [-1,1]){
  const x=mid+side*w*.18;
  c.fillRect(x-w*.028,h*.41,w*.055,h*.48);
  c.fillRect(x-w*.043,h*.4,w*.085,h*.035);
  line(c,x,cy,x-side*w*.095,cy-h*.13,Math.max(2,w*.006),t.silhouette,.95);
  line(c,x,cy,x-side*w*.095,cy-h*.13,Math.max(1,w*.0017),t.accent,.38);
 }
 c.restore();
 const barrel=gradient(c,h*.37,h*.8,[[0,rgb(t.secondary,.02)],[.4,rgb(t.secondary,.23)],[1,rgb(t.accent,.02)]]);
 c.fillStyle=barrel;c.fillRect(mid-w*.064,h*.37,w*.128,h*.39);
 for(let k=0;k<5;k++){
  const y=h*(.4+k*.075);
  line(c,mid-w*.065,y,mid+w*.065,y,Math.max(1,h*.0045),t.accent,.55);
 }
 for(const ring of [.08,.12]){
  c.save();c.strokeStyle=t.accent;c.globalAlpha=.28;c.lineWidth=Math.max(1,h*.004);
  c.beginPath();c.ellipse(mid,cy,w*ring,h*.052,0,0,TAU);c.stroke();c.restore();
 }
 for(let i=0;i<11;i++){
  const x=i*w/10;
  line(c,x,h*.74,x+w*.04,h*.74,Math.max(1,h*.006),t.secondary,.18);
  if(i%2===0)glow(c,x,h*.74,h*.038,t.accent,.13);
 }
}
function sketch(c:Brush,w:number,h:number,t:ArenaTheme,random:()=>number){
 ridge(c,w,h,random,h*.93,.105,t.silhouette);
 for(let i=0;i<9;i++){
  const x=w*(i+.55)/9,base=h*.89;
  const high=h*(.09+random()*.19);
  c.fillStyle=t.silhouette;
  c.fillRect(x-w*.013,base-high,w*.026,high+h*.2);
  c.fillRect(x-w*.026,base-high,w*.052,h*.013);
  line(c,x-w*.026,base-high,x+w*.026,base-high,Math.max(1,w*.001),t.secondary,.32);
  line(c,x+w*.012,base-high*.85,x+w*.05,base-high*.85,1,t.secondary,.14);
 }
 for(let i=0;i<12;i++){
  const x=random()*w,y=h*(.18+random()*.55);
  line(c,x-w*.007,y,x+w*.007,y,1,t.secondary,.13);
  line(c,x,y-h*.009,x,y+h*.009,1,t.secondary,.13);
 }
}
function finalGrade(c:Brush,w:number,h:number,t:ArenaTheme){
 c.fillStyle=gradient(c,0,h,[[0,rgb(t.skyTop,.36)],[.24,rgb(t.skyTop,.08)],
  [.61,rgb(t.skyTop,.02)],[1,rgb(t.skyBottom,.63)]]);
 c.fillRect(0,0,w,h);
 // Edge framing and subtle linework, without affecting collision platforms.
 const sideWidth=Math.min(w*.09,h*.22);
 c.fillStyle=gradient(c,0,h,[[0,rgb(t.silhouette,.05)],[1,rgb(t.silhouette,.22)]]);
 c.fillRect(0,0,sideWidth,h);
 c.fillRect(w-sideWidth,0,sideWidth,h);
 line(c,0,h*.78,w,h*.78,Math.max(1,h*.0015),t.secondary,.09);
}

/** Paints a deterministic, responsive, scene-specific backdrop in a single pass. */
export function paintProfessionalBackdrop(c:Brush,w:number,h:number,t:ArenaTheme){
 if(w<=0||h<=0)return;
 const seed=(parseInt(t.accent.slice(1),16)^parseInt(t.skyTop.slice(1),16))>>>0;
 const random=rng(seed);
 c.save();
 try{
  atmosphere(c,w,h,t,seed);
  switch(t.backdrop){
   case "industrial":industry(c,w,h,t,random);break;
   case "city":skyline(c,w,h,t,random);break;
   case "clouds":clouds(c,w,h,t,random);break;
   case "mountains":mountains(c,w,h,t,random);break;
   case "cavern":cavern(c,w,h,t,random);break;
   case "sketch":sketch(c,w,h,t,random);break;
  }
  finalGrade(c,w,h,t);
 }finally{
  c.restore();
 }
}
