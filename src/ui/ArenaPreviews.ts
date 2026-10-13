import {getBuiltInArenaPreviewDefinition,type BuiltInArenaId} from "../gameplay/GameSession.js";
export const ARENA_CATEGORY_IDS=["all","balanced","vertical","moving","hazards","special"] as const;
export type ArenaCategory=typeof ARENA_CATEGORY_IDS[number];
export const BUILT_IN_PREVIEW_IDS=Object.keys(getBuiltInArenaPreviewDefinition()) as BuiltInArenaId[];
const definitions=getBuiltInArenaPreviewDefinition();
export function arenaCategories(id:BuiltInArenaId):readonly ArenaCategory[]{
 const {arena,environment}=definitions[id],out:ArenaCategory[]=[];
 const height=Math.max(...arena.platforms.map(p=>p.y+p.height));
 const hazards=arena.fallLimit!==null||environment.some(e=>["trap","vent","crumble","fallingRock"].includes(e.kind));
 const special=Boolean(arena.windStrength||arena.gravityWell||arena.gravity!==definitions.classic.arena.gravity||arena.platforms.some(p=>p.surface?.startsWith("conveyor"))||environment.some(e=>e.kind==="bounce"));
 if(!hazards&&!special&&!arena.movingPlatforms&&height<4.5)out.push("balanced");
 if(height>=4.5)out.push("vertical");if(arena.movingPlatforms)out.push("moving");if(hazards)out.push("hazards");if(special)out.push("special");
 return out.length?out:["balanced"];
}
/** Static schematic using the exact shared physics geometry. No game loops or network. */
export function arenaPreviewSvg(id:BuiltInArenaId):string{
 const {arena,environment}=definitions[id];
 const minY=Math.min(-1,arena.fallLimit??-1,...arena.platforms.map(p=>p.y));
 const maxY=Math.max(5,...arena.platforms.map(p=>p.y+p.height+1),...environment.map(e=>e.y+e.height/2+.5));
 const sx=(x:number)=>8+(x+12)*224/24,sy=(y:number)=>88-(y-minY)*80/(maxY-minY);
 const f=(v:number)=>v.toFixed(2),parts:string[]=[];
 for(const [i,p] of arena.platforms.entries()){
  const color=p.surface?.startsWith("conveyor")?"#fbc56e":p.surface==="ice"||p.surface==="slippery"?"#86dcf3":"#c1d9ed";
  parts.push(`<rect x="${f(sx(p.x))}" y="${f(sy(p.y+p.height))}" width="${f(p.width*224/24)}" height="${f(Math.max(2,p.height*80/(maxY-minY)))}" rx="1" fill="${color}"${p.surface==="oneWay"?' stroke="#fff" stroke-dasharray="3 2"':''}/>`);
  if(arena.movingPlatforms&&i>0)parts.push(`<path d="M${f(sx(p.x))} ${f(sy(p.y+p.height)+8)} h${f(p.width*224/24)}" stroke="#ffe29a" stroke-dasharray="3 3"/>`);
  if(p.surface?.startsWith("conveyor")){const x=sx(p.x+p.width/2),y=sy(p.y+p.height)-5,d=p.surface==="conveyorRight"?1:-1;parts.push(`<path d="M${f(x-4*d)} ${f(y-3)} l${8*d} 3 l${-8*d} 3" fill="none" stroke="#ffd47b"/>`);}
 }
 for(const e of environment){
  const hazard=["trap","vent","fallingRock","crumble"].includes(e.kind),x=sx(e.x-e.width/2),y=sy(e.y+e.height/2);
  parts.push(`<rect data-kind="${e.kind}" x="${f(x)}" y="${f(y)}" width="${f(e.width*224/24)}" height="${f(Math.max(2,e.height*80/(maxY-minY)))}" rx="1" fill="${hazard?'#fb927d':'#8fa4b8'}" stroke="#192c40" stroke-width=".6"/>`);
 }
 if(arena.windStrength)parts.push('<path d="M12 14 h30 l-5 -4 m5 4 l-5 4 M65 12 h28" stroke="#8fdfef" fill="none"/>');
 if(arena.gravityWell){const g=arena.gravityWell;parts.push(`<circle cx="${f(sx(g.x))}" cy="${f(sy(g.y))}" r="${f(g.radius*4)}" fill="none" stroke="#d3a3f6" stroke-dasharray="3 3"/>`);}
 if(arena.fallLimit!==null)parts.push(`<path d="M8 ${f(sy(arena.fallLimit))} H232" stroke="#fb927d" stroke-dasharray="4 4"/>`);
 return `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="96" viewBox="0 0 240 96"><rect width="240" height="96" rx="6" fill="#0e1b2b"/>${parts.join("")}</svg>`;
}
const previews=new Map(BUILT_IN_PREVIEW_IDS.map(id=>[id,"data:image/svg+xml;charset=utf-8,"+encodeURIComponent(arenaPreviewSvg(id))]));
export const arenaPreviewUrl=(id:BuiltInArenaId)=>previews.get(id)!;
