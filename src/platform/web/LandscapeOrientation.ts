/**
 * Maintain landscape game coordinates regardless of the device's orientation.
 * In portrait, CSS rotates the entire app, not just the rendering canvas.
 */
export const isSoftwareLandscape=()=>document.documentElement.classList.contains("software-landscape");

export function toGamePointerDelta(dx:number,dy:number){
 return isSoftwareLandscape()?{x:dy,y:-dx}:{x:dx,y:dy};
}

/** CSS-box coordinates, accounting for the app's clockwise quarter-turn. */
export function gamePointerInElement(element:HTMLElement,event:{clientX:number;clientY:number}){
 const rect=element.getBoundingClientRect();
 if(isSoftwareLandscape())return {
  x:(event.clientY-rect.top)/Math.max(1,rect.height)*element.clientWidth,
  y:(rect.right-event.clientX)/Math.max(1,rect.width)*element.clientHeight
 };
 return {
  x:(event.clientX-rect.left)/Math.max(1,rect.width)*element.clientWidth,
  y:(event.clientY-rect.top)/Math.max(1,rect.height)*element.clientHeight
 };
}

export function installLandscapeOrientation(callbacks:{onResize:()=>void}){
 const app=document.querySelector<HTMLElement>("#app");
 if(!app)throw new Error("Landscape game surface is missing.");
 const root=document.documentElement;
 const viewport=window.visualViewport;
 let scheduled=0,rotated=false,lastSize="";
 const refresh=()=>{
  if(scheduled){cancelAnimationFrame(scheduled);scheduled=0;}
  const physicalWidth=Math.max(1,Math.round(viewport?.width||window.innerWidth));
  let physicalHeight=Math.max(1,Math.round(viewport?.height||window.innerHeight));
  // Telegram's usable viewport may be shorter than the WebView layout viewport.
  const telegramHeight=Number.parseFloat(root.style.getPropertyValue("--tg-viewport-height"));
  if(root.classList.contains("telegram-mini-app")&&Number.isFinite(telegramHeight)&&telegramHeight>0)
   physicalHeight=Math.min(physicalHeight,Math.round(telegramHeight));
  const left=Math.round(viewport?.offsetLeft||0),top=Math.round(viewport?.offsetTop||0);
  // Virtual keyboards can shrink visualViewport without rotating the device.
  rotated=window.innerHeight>window.innerWidth;
  const gameWidth=rotated?physicalHeight:physicalWidth;
  const gameHeight=rotated?physicalWidth:physicalHeight;
  const dimensions=[physicalWidth,physicalHeight,left,top,rotated].join(":");
  if(dimensions===lastSize){callbacks.onResize();return;}
  lastSize=dimensions;
  root.classList.toggle("software-landscape",rotated);
  app.style.setProperty("--game-width",gameWidth+"px");
  app.style.setProperty("--game-height",gameHeight+"px");
  app.style.setProperty("--game-physical-width",physicalWidth+"px");
  app.style.setProperty("--game-offset-left",left+"px");
  app.style.setProperty("--game-offset-top",top+"px");
  callbacks.onResize();
 };
 const queue=()=>{if(!scheduled)scheduled=requestAnimationFrame(refresh);};
 window.addEventListener("resize",queue);
 window.addEventListener("orientationchange",queue);
 viewport?.addEventListener("resize",queue);
 viewport?.addEventListener("scroll",queue);
 refresh();
 return {
  isPortrait:()=>rotated,
  refresh,
  dispose:()=>{
   window.removeEventListener("resize",queue);
   window.removeEventListener("orientationchange",queue);
   viewport?.removeEventListener("resize",queue);
   viewport?.removeEventListener("scroll",queue);
   if(scheduled)cancelAnimationFrame(scheduled);
   root.classList.remove("software-landscape");
   for(const name of ["--game-width","--game-height","--game-physical-width","--game-offset-left","--game-offset-top"])
    app.style.removeProperty(name);
  }
 };
}
