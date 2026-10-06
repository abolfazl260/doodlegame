import {GameLoop} from "./GameLoop";import {GameState,GameStateManager} from "./GameState";import type {FrameScheduler} from "./FrameScheduler";import type {Renderer} from "../rendering/Renderer";import type {GameSession,ArenaId,GameModeId} from "../gameplay/GameSession";
export class Game{
 private state=new GameStateManager();private loop:GameLoop;private initialized=false;private disposed=false;
 constructor(private readonly renderer:Renderer,private readonly session:GameSession,scheduler:FrameScheduler,onError:(error:unknown)=>void){this.loop=new GameLoop(scheduler,dt=>this.update(dt),()=>this.renderer.render(this.session.getRenderState()),onError);}
 initialize(){this.assertNotDisposed();if(this.initialized)return;this.initialized=true;this.renderer.resize();this.renderer.render(this.session.getRenderState());}
 start(){this.ready();const s=this.state.getState();if(s===GameState.MENU||s===GameState.GAME_OVER){this.session.reset();this.state.transitionTo(GameState.PLAYING);}else if(s===GameState.PAUSED)this.state.transitionTo(GameState.PLAYING);this.loop.start();}
 pause(){this.ready();if(this.state.getState()===GameState.PLAYING){this.loop.stop();this.state.transitionTo(GameState.PAUSED);}}
 resume(){this.ready();if(this.state.getState()===GameState.PAUSED){this.state.transitionTo(GameState.PLAYING);this.loop.start();}}
 endGame(){this.ready();if(this.state.getState()===GameState.PLAYING){this.state.transitionTo(GameState.GAME_OVER);}}
 stop(){if(this.disposed)return;this.loop.stop();if(this.state.getState()!==GameState.MENU)this.state.transitionTo(GameState.MENU);}
 restart(){this.ready();this.loop.stop();this.state.reset();this.start();}
 selectWeapon(direction:1|-1){this.ready();this.session.selectWeapon(direction);}
 selectWeaponById(id:import("../input/Input").WeaponId){this.ready();if(this.state.getState()===GameState.PLAYING)this.session.selectWeaponById(id);}
 upgradeWeapon(id:import("../input/Input").WeaponId){this.ready();const state=this.state.getState();if(state===GameState.PLAYING||state===GameState.PAUSED)return false;const upgraded=this.session.upgradeWeapon(id);if(upgraded)this.state.notify();return upgraded;}
 setMissileAngle(angle:number){this.ready();this.session.setMissileAngle(angle);}
 setMissilePower(power:number){this.ready();this.session.setMissilePower(power);}
 fireWeapon(){this.ready();if(this.state.getState()===GameState.PLAYING)this.session.fireWeapon();}
 selectArena(id:ArenaId){this.ready();const current=this.state.getState();if(current!==GameState.MENU&&current!==GameState.GAME_OVER)return;if(current===GameState.GAME_OVER)this.loop.stop();this.session.setArena(id);if(current===GameState.GAME_OVER)this.state.reset();else this.state.notify();}
 selectMode(id:GameModeId){this.ready();const current=this.state.getState();if(current!==GameState.MENU&&current!==GameState.GAME_OVER)return;if(current===GameState.GAME_OVER)this.loop.stop();this.session.setMode(id);if(current===GameState.GAME_OVER)this.state.reset();else this.state.notify();}
 getArena(){return this.session.getArena();}
 getHudState(){return this.session.getHudState();}
 subscribe(listener:(state:GameState)=>void){return this.state.subscribe(listener);}getState(){return this.state.getState();}
 resize(){this.assertNotDisposed();if(this.initialized)this.renderer.resize();}
 dispose(){if(this.disposed)return;this.loop.dispose();this.session.dispose();this.renderer.dispose();this.state.dispose();this.disposed=true;}
 private update(dt:number){if(this.state.getState()===GameState.GAME_OVER){this.session.update(dt);if(this.session.getRenderState().explosions.length===0)this.loop.stop();return;}if(this.state.getState()===GameState.PLAYING){this.session.update(dt);if(this.session.getRenderState().winner)this.endGame();}}
 private ready(){this.assertNotDisposed();if(!this.initialized)throw new Error("Game must be initialized before lifecycle operations.");}private assertNotDisposed(){if(this.disposed)throw new Error("Game has been disposed.");}
}