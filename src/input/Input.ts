export type WeaponId="blade"|"hammer"|"blaster"|"uzi"|"boomerang"|"bow"|"bomb";
export interface InputState {
 readonly moveX:number; readonly moveY:number; readonly pointerX:number; readonly pointerY:number;
 readonly pointerDown:boolean; readonly pointerPressed:boolean; readonly pointerReleased:boolean; readonly attackHeld:boolean;
 readonly jumpPressed:boolean; readonly dashPressed:boolean; readonly attackPressed:boolean; readonly weaponNextPressed:boolean; readonly weaponPreviousPressed:boolean;
}
export interface InputSource { start():void; stop():void; getState():Readonly<InputState>; endFrame():void; dispose():void; }