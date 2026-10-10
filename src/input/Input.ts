export type WeaponId="blade"|"hammer"|"blaster"|"uzi"|"boomerang"|"bow"|"bomb"|"missile";
export interface InputState {
 readonly moveX:number; readonly moveY:number; readonly pointerX:number; readonly pointerY:number;
 readonly pointerDown:boolean; readonly pointerPressed:boolean; readonly pointerReleased:boolean; readonly attackHeld:boolean; readonly attackCancelled:boolean;
 readonly jumpPressed:boolean; readonly dashPressed:boolean; readonly attackPressed:boolean; readonly weaponNextPressed:boolean; readonly weaponPreviousPressed:boolean;
}
export interface InputSource { start():void; stop():void; getState():Readonly<InputState>; getPlayer2State?():Readonly<InputState>; setLocalPvPEnabled?(enabled:boolean):void; endFrame():void; dispose():void; }