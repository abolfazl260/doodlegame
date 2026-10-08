import type {InputSource,InputState} from "../../input/Input";
type MutableInputState={-readonly [K in keyof InputState]:InputState[K]};
const P1:Readonly<Record<string,[number,number]>>={KeyA:[-1,0],KeyD:[1,0],KeyW:[0,-1],KeyS:[0,1],ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]};
const P2:Readonly<Record<string,[number,number]>>={KeyJ:[-1,0],KeyL:[1,0],KeyI:[0,-1],KeyK:[0,1]};
// Screen-space joystick Y is negative when pushed upward.
const JOYSTICK_JUMP_THRESHOLD=-.55;
const JOYSTICK_JUMP_REARM=-.30;
const JUMP=new Set(["KeyW","Space","ArrowUp"]); const DASH=new Set(["ShiftLeft","ShiftRight"]); const ATTACK=new Set(["KeyZ","KeyX"]);
export class WebInput implements InputSource {
 private keys=new Set<string>(); private active=false; private touchMoveX=0; private touchMoveY=0; private touchAttackHeld=false; private touchJumpArmed=true;
 private state:MutableInputState={moveX:0,moveY:0,pointerX:0,pointerY:0,pointerDown:false,pointerPressed:false,pointerReleased:false,attackHeld:false,jumpPressed:false,dashPressed:false,attackPressed:false,weaponNextPressed:false,weaponPreviousPressed:false};
 constructor(private readonly canvas:HTMLCanvasElement){this.keyDown=this.keyDown.bind(this);this.keyUp=this.keyUp.bind(this);this.down=this.down.bind(this);this.move=this.move.bind(this);this.up=this.up.bind(this);this.cancel=this.cancel.bind(this);this.blur=this.blur.bind(this);this.context=this.context.bind(this);}
 start(){if(this.active)return;this.active=true;window.addEventListener("keydown",this.keyDown);window.addEventListener("keyup",this.keyUp);window.addEventListener("blur",this.blur);this.canvas.addEventListener("pointerdown",this.down);this.canvas.addEventListener("pointermove",this.move);this.canvas.addEventListener("pointerup",this.up);this.canvas.addEventListener("pointercancel",this.cancel);this.canvas.addEventListener("contextmenu",this.context);}
 setTouchMove(x:number,y:number){
  this.touchMoveX=Math.max(-1,Math.min(1,x));
  this.touchMoveY=Math.max(-1,Math.min(1,y));
  // Edge-trigger jump: upward joystick entry produces one press, including diagonals.
  // Re-entering the upper zone after leaving it permits the next jump.
  if(this.touchMoveY>=JOYSTICK_JUMP_REARM)this.touchJumpArmed=true;
  else if(this.touchJumpArmed&&this.touchMoveY<=JOYSTICK_JUMP_THRESHOLD){
   this.state.jumpPressed=true;
   this.touchJumpArmed=false;
  }
  this.movement();
 }
 touchAttack(held=true){this.state.attackPressed=true;this.touchAttackHeld=held;this.state.attackHeld=true;}
 touchAttackRelease(){this.touchAttackHeld=false;this.state.pointerReleased=true;this.state.attackHeld=Array.from(this.keys).some(code=>ATTACK.has(code));}
 touchAttackCancel(){this.touchAttackHeld=false;this.state.attackPressed=false;this.state.pointerReleased=false;this.state.attackHeld=this.state.pointerDown||Array.from(this.keys).some(code=>ATTACK.has(code));}
 resetTransientState(){this.keys.clear();this.reset();}
 stop(){if(!this.active)return;this.active=false;window.removeEventListener("keydown",this.keyDown);window.removeEventListener("keyup",this.keyUp);window.removeEventListener("blur",this.blur);this.canvas.removeEventListener("pointerdown",this.down);this.canvas.removeEventListener("pointermove",this.move);this.canvas.removeEventListener("pointerup",this.up);this.canvas.removeEventListener("pointercancel",this.cancel);this.canvas.removeEventListener("contextmenu",this.context);this.resetTransientState();}
 getState(){return this.state;} endFrame(){this.state.pointerPressed=false;this.state.pointerReleased=false;this.state.jumpPressed=false;this.state.dashPressed=false;this.state.attackPressed=false;this.state.attackHeld=this.touchAttackHeld||this.state.pointerDown||Array.from(this.keys).some(code=>ATTACK.has(code));this.state.weaponNextPressed=false;this.state.weaponPreviousPressed=false;} dispose(){this.stop();}
 private keyDown(e:KeyboardEvent){const first=!this.keys.has(e.code);this.keys.add(e.code);if(ATTACK.has(e.code))this.state.attackHeld=true;if(this.gameKey(e.code))e.preventDefault();if(first){if(JUMP.has(e.code))this.state.jumpPressed=true;if(DASH.has(e.code))this.state.dashPressed=true;if(ATTACK.has(e.code))this.state.attackPressed=true;if(e.code==="KeyQ"||e.code==="KeyO")this.state.weaponPreviousPressed=true;if(e.code==="KeyE"||e.code==="KeyP")this.state.weaponNextPressed=true;}this.movement();}
 private keyUp(e:KeyboardEvent){this.keys.delete(e.code);this.movement();}
 private down(e:PointerEvent){this.position(e);if(e.pointerType==="touch")return;this.state.pointerDown=true;this.state.pointerPressed=true;this.state.attackPressed=true;this.state.attackHeld=true;}
 private move(e:PointerEvent){this.position(e);} private up(e:PointerEvent){this.position(e);if(e.pointerType==="touch")return;this.state.pointerDown=false;this.state.pointerReleased=true;this.state.attackHeld=this.touchAttackHeld||Array.from(this.keys).some(code=>ATTACK.has(code));} private cancel(){this.state.pointerDown=false;this.state.pointerReleased=true;this.state.attackHeld=this.touchAttackHeld||Array.from(this.keys).some(code=>ATTACK.has(code));} private blur(){this.resetTransientState();} private context(e:MouseEvent){e.preventDefault();}
 private position(e:PointerEvent){const r=this.canvas.getBoundingClientRect();this.state.pointerX=((e.clientX-r.left)/Math.max(r.width,1))*2-1;this.state.pointerY=((e.clientY-r.top)/Math.max(r.height,1))*2-1;}
 private movement(){let x=this.touchMoveX,y=this.touchMoveY;for(const key of this.keys){const d=P1[key]??P2[key];if(d){x+=d[0];y+=d[1];}}this.state.moveX=Math.max(-1,Math.min(1,x));this.state.moveY=Math.max(-1,Math.min(1,y));}
 private gameKey(code:string){return Boolean(P1[code]||P2[code]||JUMP.has(code)||DASH.has(code)||ATTACK.has(code)||["KeyQ","KeyE","KeyO","KeyP"].includes(code));}
 private reset(){this.touchMoveX=0;this.touchMoveY=0;this.touchJumpArmed=true;this.touchAttackHeld=false;this.state.moveX=0;this.state.moveY=0;this.state.pointerDown=false;this.state.pointerPressed=false;this.state.pointerReleased=false;this.state.attackHeld=false;this.state.jumpPressed=false;this.state.dashPressed=false;this.state.attackPressed=false;this.state.weaponNextPressed=false;this.state.weaponPreviousPressed=false;}
}