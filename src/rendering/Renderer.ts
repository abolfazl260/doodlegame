import type {GameRenderState} from "../gameplay/GameSession";
export interface Renderer {
  resize():void;
  render(state:GameRenderState):void;
  dispose():void;
}
