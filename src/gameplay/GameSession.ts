import type {InputSource} from "../input/Input";
export class GameSession {
 private elapsed=0;
 constructor(private readonly input:InputSource){}
 reset(){this.elapsed=0;}
 update(dt:number){const input=this.input.getState();this.elapsed+=dt;void input.moveX;void input.moveY;void input.pointerX;void input.pointerY;void input.pointerDown;this.input.endFrame();}
 dispose(){}
}
