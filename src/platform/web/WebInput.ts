import type {InputSource,InputState} from "../../input/Input";
type MutableInputState={-readonly [K in keyof InputState]:InputState[K]};
const KEYS:Readonly<Record<string,[number,number]>>={ArrowUp:[0,-1],KeyW:[0,-1],ArrowDown:[0,1],KeyS:[0,1],ArrowLeft:[-1,0],KeyA:[-1,0],ArrowRight:[1,0],KeyD:[1,0]};
const JUMP_KEYS=new Set(["Space","ArrowUp","KeyW"]);
export class WebInput implements InputSource {
  private keys=new Set<string>(); private active=false;
  private state:MutableInputState={moveX:0,moveY:0,pointerX:0,pointerY:0,pointerDown:false,pointerPressed:false,pointerReleased:false,jumpPressed:false};
  constructor(private readonly canvas:HTMLCanvasElement){this.keyDown=this.keyDown.bind(this);this.keyUp=this.keyUp.bind(this);this.down=this.down.bind(this);this.move=this.move.bind(this);this.up=this.up.bind(this);this.cancel=this.cancel.bind(this);this.blur=this.blur.bind(this);this.context=this.context.bind(this);}
  start(){if(this.active)return;this.active=true;window.addEventListener("keydown",this.keyDown);window.addEventListener("keyup",this.keyUp);window.addEventListener("blur",this.blur);this.canvas.addEventListener("pointerdown",this.down);this.canvas.addEventListener("pointermove",this.move);this.canvas.addEventListener("pointerup",this.up);this.canvas.addEventListener("pointercancel",this.cancel);this.canvas.addEventListener("contextmenu",this.context);}
  stop(){if(!this.active)return;this.active=false;window.removeEventListener("keydown",this.keyDown);window.removeEventListener("keyup",this.keyUp);window.removeEventListener("blur",this.blur);this.canvas.removeEventListener("pointerdown",this.down);this.canvas.removeEventListener("pointermove",this.move);this.canvas.removeEventListener("pointerup",this.up);this.canvas.removeEventListener("pointercancel",this.cancel);this.canvas.removeEventListener("contextmenu",this.context);this.keys.clear();this.reset();}
  getState(){return this.state;}
  endFrame(){this.state.pointerPressed=false;this.state.pointerReleased=false;this.state.jumpPressed=false;}
  dispose(){this.stop();}
  private keyDown(e:KeyboardEvent){const firstPress=!this.keys.has(e.code);this.keys.add(e.code);if(KEYS[e.code]||e.code==="Space")e.preventDefault();if(firstPress&&JUMP_KEYS.has(e.code))this.state.jumpPressed=true;this.movement();}
  private keyUp(e:KeyboardEvent){this.keys.delete(e.code);this.movement();}
  private down(e:PointerEvent){this.position(e);this.state.pointerDown=true;this.state.pointerPressed=true;this.state.jumpPressed=true;}
  private move(e:PointerEvent){this.position(e);}
  private up(e:PointerEvent){this.position(e);this.state.pointerDown=false;this.state.pointerReleased=true;}
  private cancel(){this.state.pointerDown=false;this.state.pointerReleased=true;}
  private blur(){this.keys.clear();this.state.moveX=0;this.state.moveY=0;this.state.pointerDown=false;}
  private context(e:MouseEvent){e.preventDefault();}
  private position(e:PointerEvent){const r=this.canvas.getBoundingClientRect();this.state.pointerX=((e.clientX-r.left)/Math.max(r.width,1))*2-1;this.state.pointerY=((e.clientY-r.top)/Math.max(r.height,1))*2-1;}
  private movement(){let x=0,y=0;for(const key of this.keys){const d=KEYS[key];if(d){x+=d[0];y+=d[1];}}this.state.moveX=Math.max(-1,Math.min(1,x));this.state.moveY=Math.max(-1,Math.min(1,y));}
  private reset(){this.state.moveX=0;this.state.moveY=0;this.state.pointerDown=false;this.state.pointerPressed=false;this.state.pointerReleased=false;this.state.jumpPressed=false;}
}
