import type {InputSource,InputState} from "../../input/Input";
type MutableInputState={-readonly [K in keyof InputState]:InputState[K]};
const P1:Readonly<Record<string,[number,number]>>={KeyA:[-1,0],KeyD:[1,0],KeyW:[0,-1],KeyS:[0,1],ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]};
const P2:Readonly<Record<string,[number,number]>>={KeyJ:[-1,0],KeyL:[1,0],KeyI:[0,-1],KeyK:[0,1]};
// Screen-space joystick Y is negative when pushed upward.
const JOYSTICK_JUMP_THRESHOLD=-.55;
const JOYSTICK_JUMP_REARM=-.30;
const JUMP=new Set(["KeyW","Space","ArrowUp"]); const DASH=new Set(["ShiftLeft","ShiftRight"]); const ATTACK=new Set(["KeyZ","KeyX"]);
const P2_ATTACK=new Set(["Enter","Numpad0"]);
const P2_JUMP=new Set(["ArrowUp","Numpad8"]);
const P2_DASH=new Set(["Numpad5"]);
export class WebInput implements InputSource {
 private keys=new Set<string>(); private active=false; private activePointerId:number|null=null; private touchMoveX=0; private touchMoveY=0; private touchAttackHeld=false; private touchJumpArmed=true;
 private state:MutableInputState={moveX:0,moveY:0,pointerX:0,pointerY:0,pointerDown:false,pointerPressed:false,pointerReleased:false,attackHeld:false,attackCancelled:false,jumpPressed:false,dashPressed:false,attackPressed:false,weaponNextPressed:false,weaponPreviousPressed:false};
 private pvp=false;private p2TouchX=0;private p2TouchY=0;private p2TouchAttackHeld=false;private p2JumpArmed=true;
 private p2:MutableInputState={moveX:0,moveY:0,pointerX:0,pointerY:0,pointerDown:false,pointerPressed:false,pointerReleased:false,attackHeld:false,attackCancelled:false,jumpPressed:false,dashPressed:false,attackPressed:false,weaponNextPressed:false,weaponPreviousPressed:false};
 constructor(private readonly canvas:HTMLCanvasElement){this.keyDown=this.keyDown.bind(this);this.keyUp=this.keyUp.bind(this);this.down=this.down.bind(this);this.move=this.move.bind(this);this.up=this.up.bind(this);this.cancel=this.cancel.bind(this);this.captureLost=this.captureLost.bind(this);this.blur=this.blur.bind(this);this.context=this.context.bind(this);}
 start(){if(this.active)return;this.active=true;window.addEventListener("keydown",this.keyDown);window.addEventListener("keyup",this.keyUp);window.addEventListener("blur",this.blur);this.canvas.addEventListener("pointerdown",this.down);this.canvas.addEventListener("pointermove",this.move);this.canvas.addEventListener("pointerup",this.up);this.canvas.addEventListener("pointercancel",this.cancel);this.canvas.addEventListener("lostpointercapture",this.captureLost);this.canvas.addEventListener("contextmenu",this.context);}
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
 setLocalPvPEnabled(enabled:boolean){
  if(this.pvp===enabled)return;
  this.resetTransientState();
  this.pvp=enabled;
 }
 getPlayer2State(){return this.p2;}
 setPlayer2TouchMove(x:number,y:number){
  this.p2TouchX=Math.max(-1,Math.min(1,x));this.p2TouchY=Math.max(-1,Math.min(1,y));
  if(this.p2TouchY>=JOYSTICK_JUMP_REARM)this.p2JumpArmed=true;
  else if(this.p2JumpArmed&&this.p2TouchY<=JOYSTICK_JUMP_THRESHOLD){
   this.p2.jumpPressed=true;this.p2JumpArmed=false;
  }
  this.movement();
 }
 player2TouchAttackStart(){this.p2.attackCancelled=false;this.p2.attackPressed=true;this.p2TouchAttackHeld=true;this.p2.attackHeld=true;}
 player2TouchAttackRelease(){this.p2TouchAttackHeld=false;this.p2.pointerReleased=true;this.p2.attackHeld=Array.from(this.keys).some(code=>P2_ATTACK.has(code));}
 player2TouchAttackCancel(){this.p2TouchAttackHeld=false;this.p2.attackPressed=false;this.p2.pointerReleased=false;this.p2.attackHeld=Array.from(this.keys).some(code=>P2_ATTACK.has(code));this.p2.attackCancelled=!this.p2.attackHeld;}
 touchAttack(held=true){this.state.attackCancelled=false;this.state.attackPressed=true;this.touchAttackHeld=held;this.state.attackHeld=true;}
 touchAttackRelease(){this.touchAttackHeld=false;this.state.pointerReleased=true;this.state.attackHeld=Array.from(this.keys).some(code=>ATTACK.has(code));}
 touchAttackCancel(){this.touchAttackHeld=false;this.state.attackPressed=false;this.state.pointerReleased=false;this.state.attackHeld=this.state.pointerDown||Array.from(this.keys).some(code=>ATTACK.has(code));this.state.attackCancelled=!this.state.attackHeld;}
 resetTransientState(){this.keys.clear();this.reset();}
 stop(){if(!this.active)return;this.active=false;window.removeEventListener("keydown",this.keyDown);window.removeEventListener("keyup",this.keyUp);window.removeEventListener("blur",this.blur);this.canvas.removeEventListener("pointerdown",this.down);this.canvas.removeEventListener("pointermove",this.move);this.canvas.removeEventListener("pointerup",this.up);this.canvas.removeEventListener("pointercancel",this.cancel);this.canvas.removeEventListener("lostpointercapture",this.captureLost);this.canvas.removeEventListener("contextmenu",this.context);this.resetTransientState();}
 getState(){return this.state;} endFrame(){this.state.pointerPressed=false;this.state.pointerReleased=false;this.state.attackCancelled=false;this.state.jumpPressed=false;this.state.dashPressed=false;this.state.attackPressed=false;this.state.attackHeld=this.touchAttackHeld||this.state.pointerDown||Array.from(this.keys).some(code=>ATTACK.has(code));this.state.weaponNextPressed=false;this.state.weaponPreviousPressed=false;
  this.p2.pointerPressed=false;this.p2.pointerReleased=false;this.p2.attackCancelled=false;
  this.p2.jumpPressed=false;this.p2.dashPressed=false;this.p2.attackPressed=false;
  this.p2.weaponNextPressed=false;this.p2.weaponPreviousPressed=false;
  this.p2.attackHeld=this.p2TouchAttackHeld||Array.from(this.keys).some(code=>P2_ATTACK.has(code));
 } dispose(){this.stop();}
 private keyDown(e:KeyboardEvent){
  const first=!this.keys.has(e.code);this.keys.add(e.code);
  if(this.gameKey(e.code))e.preventDefault();
  if(this.pvp){
   if(P2_ATTACK.has(e.code))this.p2.attackHeld=true;
   else if(ATTACK.has(e.code))this.state.attackHeld=true;
   if(first){
    if(P2_JUMP.has(e.code))this.p2.jumpPressed=true;
    if(P2_DASH.has(e.code))this.p2.dashPressed=true;
    if(P2_ATTACK.has(e.code)){this.p2.attackCancelled=false;this.p2.attackPressed=true;}
    if(e.code==="BracketLeft")this.p2.weaponPreviousPressed=true;
    if(e.code==="BracketRight")this.p2.weaponNextPressed=true;
    if(e.code==="KeyW"||e.code==="Space")this.state.jumpPressed=true;
    if(DASH.has(e.code))this.state.dashPressed=true;
    if(ATTACK.has(e.code)){this.state.attackCancelled=false;this.state.attackPressed=true;}
    if(e.code==="KeyQ")this.state.weaponPreviousPressed=true;
    if(e.code==="KeyE")this.state.weaponNextPressed=true;
   }
  }else{
   if(ATTACK.has(e.code))this.state.attackHeld=true;
   if(first){if(JUMP.has(e.code))this.state.jumpPressed=true;if(DASH.has(e.code))this.state.dashPressed=true;
    if(ATTACK.has(e.code)){this.state.attackCancelled=false;this.state.attackPressed=true;}
    if(e.code==="KeyQ"||e.code==="KeyO")this.state.weaponPreviousPressed=true;
    if(e.code==="KeyE"||e.code==="KeyP")this.state.weaponNextPressed=true;
   }
  }
  this.movement();
 }
 private keyUp(e:KeyboardEvent){this.keys.delete(e.code);this.movement();}
 private down(e:PointerEvent){
  // Touch is owned by the mobile UI. Only the primary mouse/pen pointer attacks.
  if(e.pointerType==="touch"||e.button!==0||this.activePointerId!==null)return;
  this.position(e);
  this.activePointerId=e.pointerId;
  this.canvas.setPointerCapture(e.pointerId);
  this.state.pointerDown=true;
  this.state.pointerPressed=true;
  this.state.attackPressed=true;
  this.state.attackCancelled=false;
  this.state.attackHeld=true;
 }
 private move(e:PointerEvent){if(e.pointerType!=="touch")this.position(e);}
 private up(e:PointerEvent){
  if(e.pointerId!==this.activePointerId)return;
  this.position(e);
  this.finishPointer(e.pointerId,false);
 }
 private cancel(e:PointerEvent){this.finishPointer(e.pointerId,true);}
 private captureLost(e:PointerEvent){this.finishPointer(e.pointerId,true);}
 private finishPointer(pointerId:number,cancelled:boolean){
  if(pointerId!==this.activePointerId)return;
  // Clear ownership before releasing capture: lostpointercapture can be dispatched
  // synchronously by a mock, and asynchronously by the browser.
  this.activePointerId=null;
  this.state.pointerDown=false;
  this.state.pointerReleased=!cancelled;
  const otherAttackHeld=this.touchAttackHeld||Array.from(this.keys).some(code=>ATTACK.has(code));
  this.state.attackHeld=otherAttackHeld;
  if(cancelled&&!otherAttackHeld){
   this.state.attackPressed=false;
   this.state.attackCancelled=true;
  }
  if(this.canvas.hasPointerCapture(pointerId))this.canvas.releasePointerCapture(pointerId);
 }
 private blur(){this.resetTransientState();}
 private context(e:MouseEvent){e.preventDefault();}
 private position(e:PointerEvent){const r=this.canvas.getBoundingClientRect();this.state.pointerX=((e.clientX-r.left)/Math.max(r.width,1))*2-1;this.state.pointerY=((e.clientY-r.top)/Math.max(r.height,1))*2-1;}
 private movement(){
  let x=this.touchMoveX,y=this.touchMoveY,x2=this.p2TouchX,y2=this.p2TouchY;
  for(const key of this.keys){
   const d=this.pvp?P1[key]:P1[key]??P2[key];
   if(d&&(!this.pvp||!key.startsWith("Arrow"))){x+=d[0];y+=d[1];}
   if(this.pvp){
    const p2=({ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1],Numpad4:[-1,0],Numpad6:[1,0]} as Readonly<Record<string,[number,number]>>)[key];
    if(p2){x2+=p2[0];y2+=p2[1];}
   }
  }
  this.state.moveX=Math.max(-1,Math.min(1,x));this.state.moveY=Math.max(-1,Math.min(1,y));
  this.p2.moveX=Math.max(-1,Math.min(1,x2));this.p2.moveY=Math.max(-1,Math.min(1,y2));
 }
 private gameKey(code:string){return Boolean(P1[code]||P2[code]||JUMP.has(code)||DASH.has(code)||ATTACK.has(code)||["KeyQ","KeyE","KeyO","KeyP"].includes(code)||
  (this.pvp&&(P2_ATTACK.has(code)||P2_JUMP.has(code)||P2_DASH.has(code)||["BracketLeft","BracketRight"].includes(code))));}
 private reset(){const pointerId=this.activePointerId;this.activePointerId=null;if(pointerId!==null&&this.canvas.hasPointerCapture(pointerId))this.canvas.releasePointerCapture(pointerId);this.touchMoveX=0;this.touchMoveY=0;this.touchJumpArmed=true;this.touchAttackHeld=false;this.state.moveX=0;this.state.moveY=0;this.state.pointerDown=false;this.state.pointerPressed=false;this.state.pointerReleased=false;this.state.attackHeld=false;this.state.attackCancelled=true;this.state.jumpPressed=false;this.state.dashPressed=false;this.state.attackPressed=false;this.state.weaponNextPressed=false;this.state.weaponPreviousPressed=false;
  this.p2TouchX=0;this.p2TouchY=0;this.p2TouchAttackHeld=false;this.p2JumpArmed=true;
  this.p2.moveX=0;this.p2.moveY=0;this.p2.attackHeld=false;this.p2.attackPressed=false;this.p2.attackCancelled=true;
  this.p2.pointerReleased=false;this.p2.jumpPressed=false;this.p2.dashPressed=false;
  this.p2.weaponNextPressed=false;this.p2.weaponPreviousPressed=false;
 }
}