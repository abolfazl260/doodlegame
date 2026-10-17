import type {BuiltInArenaId} from "../gameplay/GameSession.js";
import type {ArenaTheme} from "./ArenaThemes.js";

/**
 * Stage landmarks are presentation-only normalized vector shapes shared by
 * in-game Canvas/WebGL backdrops and the arena-selection thumbnails.
 * No platform, hitbox, hazard or movement definition is read or changed here.
 */
type Paint="silhouette"|"accent"|"secondary"|"platform"|"platformEdge"|"skyBottom";
type Rect={kind:"rect";x:number;y:number;w:number;h:number;paint:Paint;alpha:number};
type Ellipse={kind:"ellipse";x:number;y:number;rx:number;ry:number;paint:Paint;alpha:number};
type Path={kind:"polygon"|"line";points:readonly (readonly [number,number])[];paint:Paint;alpha:number;width?:number};
export type StageShape=Rect|Ellipse|Path;
const f=(n:number)=>Number(n.toFixed(3));
const cache=new Map<BuiltInArenaId,readonly StageShape[]>();

/** Consistent silhouette language but a completely different landmark composition per arena. */
export function stageLandmarks(id:BuiltInArenaId):readonly StageShape[]{
 const prior=cache.get(id);if(prior)return prior;
 const s:StageShape[]=[];
 const r=(x:number,y:number,w:number,h:number,paint:Paint="silhouette",alpha=.72)=>s.push({kind:"rect",x:f(x),y:f(y),w:f(w),h:f(h),paint,alpha});
 const e=(x:number,y:number,rx:number,ry:number,paint:Paint="secondary",alpha=.3)=>s.push({kind:"ellipse",x:f(x),y:f(y),rx:f(rx),ry:f(ry),paint,alpha});
 const p=(points:readonly [number,number][],paint:Paint="silhouette",alpha=.8)=>s.push({kind:"polygon",points:points.map(([x,y])=>[f(x),f(y)]),paint,alpha});
 const l=(points:readonly [number,number][],paint:Paint="accent",alpha=.5,width=.004)=>s.push({kind:"line",points:points.map(([x,y])=>[f(x),f(y)]),paint,alpha,width});
 const tower=(x:number,top:number,width:number,height:number)=>{
  r(x,top,width,height,"silhouette",.86);r(x-width*.18,top-.025,width*1.36,.025,"platform",.82);
  l([[x+width*.5,top+.015],[x+width*.5,top+height*.7]],"secondary",.23,.002);
 };
 switch(id){
 case "classic":
  e(.78,.26,.072,.12,"secondary",.19);e(.78,.26,.05,.084,"platformEdge",.16);
  for(const x of [.07,.23,.84,.94]){r(x,.65,.022,.25);r(x-.01,.64,.042,.015,"platform",.68);}
  l([[0,.83],[.17,.81],[.29,.85],[.46,.81],[.61,.84],[.85,.81],[1,.83]],"secondary",.16,.002);break;
 case "towers":
  for(const [x,y,h] of [[.08,.5,.42],[.25,.29,.63],[.48,.39,.52],[.7,.2,.73],[.89,.47,.48]])tower(x,y,.057,h);
  for(const x of [.11,.28,.51,.73,.92]){r(x,.62,.008,.07,"accent",.38);e(x+.004,.60,.012,.019,"accent",.42);}
  e(.76,.2,.12,.14,"accent",.1);break;
 case "pit":
  p([[0,0],[.24,0],[.2,.23],[.15,.08],[.10,.29],[.07,.1],[0,.21]]);
  p([[1,0],[.78,0],[.82,.27],[.87,.09],[.93,.32],[.94,.11],[1,.20]]);
  for(const x of [.17,.82]){l([[x,0],[x,.43]],"platformEdge",.3,.006);for(let i=1;i<7;i++)e(x,.055+i*.053,.008,.018,"secondary",.21);}
  p([[0,.89],[.17,.83],[.28,.92],[.43,.86],[.59,.92],[.8,.84],[1,.9],[1,1],[0,1]],"accent",.3);
  for(const x of [.21,.5,.76])l([[x,.91],[x+.026,.84],[x+.052,.89]],"accent",.58,.004);break;
 case "steps":
  for(let i=0;i<6;i++){const x=.035+i*.165,y=.79-i*.09;
   r(x,y,.145,.022,"platform",.69);r(x,y+.022,.13,.045,"silhouette",.8);
   l([[x,y],[x+.14,y]],"accent",.45,.003);
  }
  for(const [x,y] of [[.13,.66],[.78,.36]]){r(x,y,.008,.13,"silhouette",.72);p([[x-.033,y+.034],[x+.003,y-.035],[x+.039,y+.034]],"secondary",.31);}
  break;
 case "zigzag":
  for(const [x,top,h] of [[.07,.44,.47],[.29,.56,.35],[.58,.34,.57],[.81,.47,.44]])tower(x,top,.045,h);
  l([[.04,.64],[.2,.48],[.36,.61],[.51,.38],[.67,.55],[.89,.28]],"accent",.56,.007);
  for(const x of [.18,.51,.84]){r(x,.69,.035,.014,"accent",.38);e(x,.71,.025,.024,"secondary",.24);}
  break;
 case "sky":
  for(const [x,y,sx] of [[.18,.47,.13],[.57,.34,.17],[.85,.56,.1]]) {
   p([[x-sx,y],[x+sx,y],[x+sx*.58,y+.07],[x,y+.21],[x-sx*.65,y+.08]],"silhouette",.78);
   r(x-sx,y-.021,sx*2,.025,"platformEdge",.52);
   r(x,y-.11,.008,.1,"silhouette",.7);
   e(x+.003,y-.13,.045,.05,"secondary",.39);
  }
  for(const [x,y] of [[.13,.23],[.48,.14],[.79,.29]]){e(x,y,.09,.04,"platformEdge",.14);e(x+.065,y+.01,.065,.032,"secondary",.17);}
  break;
 case "moving":
  for(const y of [.26,.5,.75]){l([[.06,y],[.94,y]],"platform",.28,.005);
   for(const x of [.12,.45,.79]){l([[x,y-.02],[x+.03,y],[x,y+.02]],"accent",.41,.004);}}
  for(const [x,y] of [[.22,.41],[.63,.64],[.78,.32]]){r(x,y,.1,.029,"secondary",.42);r(x-.01,y-.01,.12,.009,"accent",.6);}
  break;
 case "fortress":
  for(const x of [.06,.83]){tower(x,.34,.12,.66);for(let j=0;j<3;j++)r(x+j*.043,.29,.028,.073,"silhouette",.85);}
  r(.23,.69,.55,.3,"silhouette",.82);
  for(let j=0;j<8;j++)r(.23+j*.07,.64,.043,.06,"silhouette",.82);
  for(const x of [.14,.89]){l([[x,.36],[x,.6]],"accent",.47,.005);p([[x,.37],[x+.055,.4],[x,.46]],"accent",.48);}
  for(const x of [.31,.7]){e(x,.61,.015,.03,"accent",.43);e(x,.59,.008,.02,"secondary",.29);}
  break;
 case "bridge":
  p([[0,.82],[.24,.73],[.5,.87],[.72,.74],[1,.82],[1,1],[0,1]],"accent",.24);
  for(const x of [.08,.92])tower(x,.35,.065,.6);
  l([[.1,.47],[.25,.67],[.5,.77],[.75,.67],[.94,.47]],"platformEdge",.48,.006);
  l([[.12,.48],[.88,.48]],"secondary",.45,.009);
  for(let x=.17;x<.9;x+=.09)l([[x,.5],[x,.5+Math.sin((x-.12)*Math.PI/.82)*.22]],"platformEdge",.3,.003);
  break;
 case "crater":
  p([[.16,.89],[.31,.57],[.4,.68],[.51,.26],[.64,.67],[.74,.49],[.89,.88]],"silhouette",.89);
  p([[.44,.48],[.51,.29],[.58,.48],[.53,.61],[.48,.76]],"accent",.64);
  e(.51,.22,.09,.045,"accent",.25);e(.48,.14,.14,.057,"secondary",.12);
  l([[.32,.91],[.37,.8],[.43,.82],[.48,.75]],"accent",.63,.005);
  l([[.69,.93],[.65,.8],[.6,.84],[.55,.72]],"accent",.53,.005);
  break;
 case "vertical":
  for(const x of [.12,.84]){r(x,.12,.043,.88,"silhouette",.86);r(x-.018,.12,.078,.019,"platform",.64);}
  for(const y of [.25,.46,.68]){r(.25,y,.2,.021,"platform",.35);r(.55,y-.075,.2,.021,"platform",.38);}
  for(const x of [.19,.79])for(let i=0;i<3;i++){const y=.72-i*.2;l([[x-.028,y+.036],[x,y],[x+.028,y+.036]],"accent",.62,.007);}
  break;
 case "ruins":
  for(const [x,h] of [[.1,.48],[.26,.66],[.75,.7],[.9,.44]])tower(x,1-h,.055,h);
  p([[.26,.3],[.36,.17],[.59,.17],[.75,.3],[.69,.33],[.58,.27],[.42,.27],[.33,.34]],"silhouette",.78);
  r(.34,.31,.05,.39,"silhouette",.73);r(.64,.31,.05,.39,"silhouette",.73);
  l([[.32,.33],[.35,.38],[.36,.5],[.4,.56]],"accent",.38,.004);
  l([[.72,.37],[.68,.42],[.7,.57]],"secondary",.35,.004);
  break;
 case "conveyor":
  for(const [x,h] of [[.08,.35],[.36,.54],[.69,.44],[.88,.27]])tower(x,1-h,.067,h);
  for(const y of [.56,.79]){r(0,y,1,.015,"platform",.34);
   for(let i=0;i<8;i++){const x=.055+i*.125;l([[x,y+.02],[x+.038,y+.02],[x+.058,y],[x+.038,y-.02]],"accent",.46,.004);}}
  for(const x of [.21,.78]){e(x,.81,.065,.067,"silhouette",.78);e(x,.81,.036,.038,"secondary",.4);}
  break;
 case "collapse":
  p([[0,.92],[.13,.88],[.28,.95],[.43,.9],[.62,.96],[.79,.87],[1,.92],[1,1],[0,1]],"silhouette",.85);
  l([[.18,.8],[.35,.74],[.43,.8],[.55,.74],[.68,.83]],"accent",.66,.007);
  for(const [x,y] of [[.12,.17],[.75,.15],[.48,.37]]){p([[x,y],[x+.08,y+.018],[x+.05,y+.13],[x+.01,y+.11]],"platform",.55);}
  for(const x of [.13,.38,.63,.88]){l([[x,.65],[x+.045,.6],[x+.08,.65]],"accent",.48,.004);}
  break;
 case "storm":
  for(const [x,y,rx] of [[.22,.22,.2],[.57,.16,.22],[.84,.3,.16]]){e(x,y,rx,.07,"secondary",.22);e(x+.075,y+.04,rx*.8,.07,"platform",.25);}
  p([[.58,.25],[.49,.51],[.6,.5],[.52,.82],[.75,.43],[.62,.44],[.7,.24]],"accent",.57);
  for(const y of [.42,.66,.82])for(const x of [.04,.32,.75])l([[x,y],[x+.13,y-.035],[x+.17,y-.033]],"secondary",.44,.003);
  break;
 case "reactor":
  r(.36,.25,.28,.58,"silhouette",.82);
  e(.5,.52,.14,.25,"accent",.23);e(.5,.52,.095,.16,"secondary",.27);e(.5,.52,.045,.08,"platformEdge",.48);
  for(const y of [.3,.42,.63,.75])l([[.34,y],[.66,y]],"accent",.3,.004);
  for(const x of [.14,.84]){tower(x,.3,.055,.56);l([[x+.029,.48],[.36,.52]],"accent",.42,.004);}
  for(const x of [.24,.75])e(x,.85,.042,.035,"accent",.45);
  break;
 }
 const value=Object.freeze(s);cache.set(id,value);return value;
}
function color(theme:ArenaTheme,key:Paint){return theme[key];}
export function stageLandmarksSvg(id:BuiltInArenaId,theme:ArenaTheme,w:number,h:number):string{
 const px=(n:number)=>+(n*w).toFixed(2),py=(n:number)=>+(n*h).toFixed(2);
 return stageLandmarks(id).map(shape=>{
  const paint=color(theme,shape.paint),opacity=shape.alpha;
  if(shape.kind==="rect")return `<rect x="${px(shape.x)}" y="${py(shape.y)}" width="${px(shape.w)}" height="${py(shape.h)}" fill="${paint}" opacity="${opacity}"/>`;
  if(shape.kind==="ellipse")return `<ellipse cx="${px(shape.x)}" cy="${py(shape.y)}" rx="${px(shape.rx)}" ry="${py(shape.ry)}" fill="${paint}" opacity="${opacity}"/>`;
  const points=shape.points.map(([x,y])=>`${px(x)},${py(y)}`).join(" ");
  return shape.kind==="polygon"?
   `<polygon points="${points}" fill="${paint}" opacity="${opacity}"/>`:
   `<polyline points="${points}" fill="none" stroke="${paint}" stroke-width="${Math.max(.6,px(shape.width??.003))}" opacity="${opacity}" stroke-linecap="round" stroke-linejoin="round"/>`;
 }).join("");
}
export function paintArenaLandmarks(c:CanvasRenderingContext2D,w:number,h:number,id:BuiltInArenaId,theme:ArenaTheme):void{
 c.save();
 try{
  for(const shape of stageLandmarks(id)){
   c.globalAlpha=shape.alpha;
   if(shape.kind==="rect"){c.fillStyle=color(theme,shape.paint);c.fillRect(shape.x*w,shape.y*h,shape.w*w,shape.h*h);continue;}
   c.beginPath();
   if(shape.kind==="ellipse"){c.fillStyle=color(theme,shape.paint);c.ellipse(shape.x*w,shape.y*h,shape.rx*w,shape.ry*h,0,0,Math.PI*2);c.fill();continue;}
   for(let i=0;i<shape.points.length;i++){const [x,y]=shape.points[i];if(i)c.lineTo(x*w,y*h);else c.moveTo(x*w,y*h);}
   if(shape.kind==="polygon"){c.closePath();c.fillStyle=color(theme,shape.paint);c.fill();}
   else{c.strokeStyle=color(theme,shape.paint);c.lineWidth=Math.max(1,(shape.width??.003)*w);c.stroke();}
  }
 }finally{c.restore();}
}
