import {getArenaTheme,paintArenaBackdrop} from "../../src/themes/ArenaThemes";
import type {ArenaId} from "../../src/gameplay/GameSession";
const canvas=document.querySelector<HTMLCanvasElement>("#scene")!;
const ids:ArenaId[]=["classic","towers","pit","steps","zigzag","sky","moving","fortress","bridge","crater","vertical","ruins","conveyor","collapse","storm","reactor"];
function render(id:ArenaId,width=640,height=360){
 canvas.width=width;canvas.height=height;
 const c=canvas.getContext("2d");
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
Object.assign(window,{__arenaArt:{
 ids,render,all:()=>ids.map(id=>render(id))
}});
