export interface InputState {
  readonly moveX:number;
  readonly moveY:number;
  readonly pointerX:number;
  readonly pointerY:number;
  readonly pointerDown:boolean;
  readonly pointerPressed:boolean;
  readonly pointerReleased:boolean;
  readonly jumpPressed:boolean;
}
export interface InputSource {
  start():void;
  stop():void;
  getState():Readonly<InputState>;
  endFrame():void;
  dispose():void;
}
