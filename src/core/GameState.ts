export enum GameState { MENU="MENU", PLAYING="PLAYING", PAUSED="PAUSED", GAME_OVER="GAME_OVER" }
type Listener=(state:GameState)=>void;
const TRANSITIONS:Readonly<Record<GameState,readonly GameState[]>>={
  [GameState.MENU]:[GameState.PLAYING],
  [GameState.PLAYING]:[GameState.PAUSED,GameState.GAME_OVER,GameState.MENU],
  [GameState.PAUSED]:[GameState.PLAYING,GameState.MENU],
  [GameState.GAME_OVER]:[GameState.PLAYING,GameState.MENU]
};
export class GameStateManager {
  private currentState=GameState.MENU; private readonly listeners=new Set<Listener>();
  getState(){return this.currentState;}
  canTransitionTo(next:GameState){return this.currentState===next||TRANSITIONS[this.currentState].includes(next);}
  transitionTo(next:GameState){if(next===this.currentState)return;if(!this.canTransitionTo(next))throw new Error(`Invalid game state transition: ${this.currentState} -> ${next}`);this.currentState=next;for(const listener of this.listeners)listener(next);}
  notify(){for(const listener of this.listeners)listener(this.currentState);}
  reset(){this.currentState=GameState.MENU;this.notify();}
  subscribe(listener:Listener){this.listeners.add(listener);return()=>this.listeners.delete(listener);}
  dispose(){this.listeners.clear();}
}
