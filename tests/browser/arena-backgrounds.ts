import {getArenaTheme,paintArenaBackdrop} from "../../src/themes/ArenaThemes";
import type {ArenaId} from "../../src/gameplay/GameSession";
import {paintSimpleSvgBackdrop} from "../../src/themes/SimplifiedSvgBackdrops";
import {SCENIC_ARENA_IDS} from "../../src/themes/ScenicArenaArt";
const canvas=document.querySelector<HTMLCanvasElement>("#scene")!;
const ids:ArenaId[]=["classic","towers","pit","steps","zigzag","sky","moving","fortress","bridge","crater","vertical","ruins","conveyor","collapse","storm","reactor","alpine-lake","dusk-valley","autumn-valley","ember-river"];
function render(id:ArenaId,width=640,height=360){
 canvas.width=width;canvas.height=height;
 // Pixel hashes require one consistent readback backend from the first frame.
 const c=canvas.getContext("2d",{willReadFrequently:true});
 if(!c)throw Error("Canvas2D unavailable");
 paintArenaBackdrop(c,width,height,getArenaTheme(id));
 const {data}=c.getImageData(0,0,width,height);
 let hash=2166136261,opaque=0;
 for(let i=0;i<data.length;i+=137*4){
  for(let ch=0;ch<4;ch++)hash=Math.imul(hash^data[i+ch],16777619)>>>0;
  if(data[i+3]===255)opaque++;
 }
 const center=c.getImageData(Math.floor(width/2),Math.floor(height*.42),1,1).data;
 const centerLuma=(center[0]*.2126+center[1]*.7152+center[2]*.0722);
 return {id,width,height,hash,opaque,centerLuma};
}
// The four mountain illustrations are decoded asynchronously on first use.
 // Wait for the actual image rather than comparing fallback geometry with
 // a later decoded frame. The runner makes no network requests.
const warmScenery=async()=>{
 const c=canvas.getContext("2d",{willReadFrequently:true})!;
 for(const id of SCENIC_ARENA_IDS)paintSimpleSvgBackdrop(c,640,360,id);
 for(let attempts=0;attempts<120;attempts++){
  if(SCENIC_ARENA_IDS.every(id=>paintSimpleSvgBackdrop(c,640,360,id)))return;
  await new Promise(resolve=>setTimeout(resolve,25));
 }
 throw new Error("Scenic SVG decode timed out");
};
Object.assign(window,{__arenaArt:{
 ids,render,all:async()=>{await warmScenery();return ids.map(id=>render(id));}
}});
