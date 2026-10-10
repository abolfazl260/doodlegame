import "../../src/styles.css";
import {OpeningIntro} from "../../src/ui/OpeningIntro";

const root=document.querySelector<HTMLElement>("#ui-root")!;
const menu=root.querySelector<HTMLElement>(".game-ui")!;
let clicks=0;
root.querySelector<HTMLButtonElement>('button[data-action="start"]')!.onclick=()=>{clicks++;};
const intro=new OpeningIntro(root,"fa");
intro.start();
function canvas(){
 return document.querySelector<HTMLCanvasElement>(".opening-intro__canvas");
}
Object.assign(window,{__introFixture:{
 skip:()=>intro["finish"](),
 toGameplay:()=>{intro.dispose();menu.classList.add("playing");},
 restore:()=>{menu.classList.remove("playing");intro.restoreAmbient();},
 dispose:()=>intro.dispose(),
 get clicks(){return clicks;},
 get active(){return intro["active"];},
 get ambient(){return intro["ambient"];},
 signature(){
  const cv=canvas(),ctx=cv?.getContext("2d");
  if(!cv||!ctx)return null;
  const d=ctx.getImageData(0,0,cv.width,cv.height).data;
  let signature=2166136261;
  for(let i=0;i<d.length;i+=67){
   signature=Math.imul(signature^d[i],16777619)>>>0;
  }
  return signature;
 },
 redPixels(){
  const cv=canvas(),ctx=cv?.getContext("2d");
  if(!cv||!ctx)return 0;
  const d=ctx.getImageData(0,0,cv.width,cv.height).data;
  let count=0;
  for(let i=0;i<d.length;i+=4){
   if(d[i]>125&&d[i]>d[i+1]*1.6&&d[i]>d[i+2]*1.4&&d[i+3]>120)count++;
  }
  return count;
 }
}});
