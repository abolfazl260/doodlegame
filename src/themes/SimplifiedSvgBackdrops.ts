import type {ArenaId} from "../gameplay/GameSession.js";
import fortress from "../assets/backgrounds/fortress.svg?raw";
import bridge from "../assets/backgrounds/bridge.svg?raw";
import crater from "../assets/backgrounds/crater.svg?raw";
import sky from "../assets/backgrounds/sky.svg?raw";

/** Vector scenery is decorative only: collision platforms stay in GameSession. */
type SvgArena="fortress"|"bridge"|"crater"|"sky";
const scenes:Readonly<Record<SvgArena,string>>={fortress,bridge,crater,sky};
const images=new Map<SvgArena,HTMLImageElement>();
let revision=0;

function sceneId(arena:ArenaId):SvgArena|null{
 return Object.prototype.hasOwnProperty.call(scenes,arena)?arena as SvgArena:null;
}
/** Embed the same original art inside an arena-selection SVG preview. */
export function svgBackdropInnerMarkup(arena:ArenaId):string|null{
 const id=sceneId(arena);
 return id?scenes[id].replace(/^\s*<svg\b[^>]*>/i,"").replace(/<\/svg>\s*$/i,""):null;
}
export function svgBackdropRevision():number{return revision;}

/** Draws from a lazily decoded local SVG Image. Never fetches a URL. */
export function paintSimpleSvgBackdrop(ctx:CanvasRenderingContext2D,w:number,h:number,arena:ArenaId):boolean{
 const id=sceneId(arena);
 if(!id||typeof Image==="undefined")return false;
 let image=images.get(id);
 if(!image){
  image=new Image();
  images.set(id,image);
  // Both renderer backdrop caches are invalidated once decoding completes.
  image.onload=()=>{revision++;};
  image.onerror=()=>{revision++;};
  image.src="data:image/svg+xml;charset=utf-8,"+encodeURIComponent(scenes[id]);
 }
 if(!image.complete||image.naturalWidth===0)return false;
 try{
  ctx.drawImage(image,0,0,w,h);
  // Preserve contrast for fighters and attacks against the colorful scenery.
  ctx.fillStyle="rgba(8,15,28,0.12)";
  ctx.fillRect(0,0,w,h);
  return true;
 }catch{return false;}
}
