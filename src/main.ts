import "./styles.css";
import {Game} from "./core/Game";
import {WebFrameScheduler} from "./platform/web/WebFrameScheduler";
import {WebInput} from "./platform/web/WebInput";
import {WebStorage} from "./platform/web/WebStorage";
import {ThreeRenderer} from "./rendering/ThreeRenderer";
import {CanvasRenderer} from "./rendering/CanvasRenderer";
import {GameSession} from "./gameplay/GameSession";
import {GameUI} from "./ui/GameUI";
import type {Renderer} from "./rendering/Renderer";

const canvas=document.querySelector<HTMLCanvasElement>("#game-canvas");
const root=document.querySelector<HTMLElement>("#ui-root");
if(!canvas||!root)throw new Error("DoodleGame root elements are missing.");

const input=new WebInput(canvas);
const storage=new WebStorage();
void storage;

let renderer:Renderer;
try{
  renderer=new ThreeRenderer(canvas);
}catch(error){
  console.warn("WebGL renderer unavailable; using canvas fallback.",error);
  renderer=new CanvasRenderer(canvas);
}

const game=new Game(renderer,new GameSession(input),new WebFrameScheduler(),error=>{
  console.error("DoodleGame error:",error);
});
const ui=new GameUI(root,{start:()=>game.start(),pause:()=>game.pause(),resume:()=>game.resume(),restart:()=>game.restart()});
ui.bind(l=>game.subscribe(l));
input.start();
game.initialize();

const resize=()=>game.resize();
window.addEventListener("resize",resize);
window.addEventListener("error",e=>console.error(e.error??e.message));
window.addEventListener("unhandledrejection",e=>console.error(e.reason));
window.addEventListener("beforeunload",()=>{input.dispose();game.dispose();ui.dispose();});
