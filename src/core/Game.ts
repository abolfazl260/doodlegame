import {GameLoop} from "./GameLoop";import {GameState,GameStateManager} from "./GameState";import type {FrameScheduler} from "./FrameScheduler";import type {Renderer} from "../rendering/Renderer";import type {GameSession,ArenaId,GameModeId} from "../gameplay/GameSession";import type {UpgradeSnapshot,Progression} from "../progression/Progression";
export class Game{
 private state=new GameStateManager();private loop:GameLoop;private initialized=false;private disposed=false;
 private inRun=false;
 private normalSnapshot:({arena:ArenaId;mode:GameModeId;upgrades:UpgradeSnapshot})|null=null;
 constructor(private readonly renderer:Renderer,private readonly session:GameSession,scheduler:FrameScheduler,onError:(error:unknown)=>void,private readonly progression?:Progression){
  this.loop=new GameLoop(scheduler,dt=>this.update(dt),()=>this.renderer.render(this.session.getRenderState()),onError);
  const run=progression?.getView().run;
  if(run?.status==="victory"){
   this.normalSnapshot={arena:session.getHudState().arena,mode:session.getMode(),upgrades:session.getUpgradeSnapshot()};
   this.inRun=true;
   session.setUpgradeSnapshot({points:run.points,upgradedWeapons:run.upgradedWeapons});
   session.startRunEncounter(run.stage);
  }
 }
 initialize(){this.assertNotDisposed();if(this.initialized)return;this.initialized=true;this.renderer.resize();this.renderer.render(this.session.getRenderState());}
 start(){this.ready();this.session.cancelTransientActions();if(this.inRun)this.leaveRun();const s=this.state.getState();if(s===GameState.MENU||s===GameState.GAME_OVER){this.session.reset();this.state.transitionTo(GameState.PLAYING);}else if(s===GameState.PAUSED)this.state.transitionTo(GameState.PLAYING);this.loop.start();}
 pause(){this.ready();if(this.state.getState()===GameState.PLAYING){this.loop.stop();this.session.cancelTransientActions();this.state.transitionTo(GameState.PAUSED);}}
 resume(){this.ready();if(this.state.getState()===GameState.PAUSED){this.session.cancelTransientActions();this.state.transitionTo(GameState.PLAYING);this.loop.start();}}
 endGame(){this.ready();if(this.state.getState()===GameState.PLAYING){
  if(this.inRun&&this.progression){
   const winner=this.session.getHudState().winner;
   if(winner==="player"||winner==="opponent")this.progression.result(winner,this.session.getUpgradeSnapshot());
  }
  this.state.transitionTo(GameState.GAME_OVER);
 }}
 stop(){if(this.disposed)return;this.loop.stop();this.session.cancelTransientActions();if(this.inRun){this.progression?.suspend(this.session.getUpgradeSnapshot());this.leaveRun();return;}if(this.state.getState()!==GameState.MENU)this.state.transitionTo(GameState.MENU);}
 restart(){this.ready();this.loop.stop();this.session.cancelTransientActions();this.state.reset();this.start();}
 selectWeapon(direction:1|-1){this.ready();this.session.selectWeapon(direction);}
 selectPlayer2Weapon(direction:1|-1){this.ready();if(this.state.getState()===GameState.PLAYING)this.session.selectPlayer2Weapon(direction);}
 selectStartingWeapon(id:import("../input/Input").WeaponId){this.ready();const current=this.state.getState();if(current!==GameState.MENU&&current!==GameState.GAME_OVER)return false;const selected=this.session.setStartingWeapon(id);if(selected)this.state.notify();return selected;}
 selectWeaponById(id:import("../input/Input").WeaponId){this.ready();if(this.state.getState()===GameState.PLAYING)this.session.selectWeaponById(id);}
 upgradeWeapon(id:import("../input/Input").WeaponId){
  this.ready();const state=this.state.getState();
  if(state===GameState.PLAYING||state===GameState.PAUSED||this.session.getMode()==="local-pvp")return false;
  if(this.inRun&&this.progression){
   const view=this.progression.getView();
   if((state!==GameState.GAME_OVER&&state!==GameState.MENU)||view.run?.status!=="victory"||!view.choices.includes(id))return false;
  }
  const upgraded=this.session.upgradeWeapon(id);
  if(upgraded&&this.inRun&&this.progression)this.progression.purchase(id,this.session.getUpgradeSnapshot());
  if(upgraded)this.state.notify();
  return upgraded;
 }
 setMissileAngle(angle:number){this.ready();this.session.setMissileAngle(angle);}
 setMissilePower(power:number){this.ready();this.session.setMissilePower(power);}
 fireWeapon(){this.ready();if(this.state.getState()===GameState.PLAYING)this.session.fireWeapon();}
 cancelTouchAttack(){this.ready();this.session.cancelTouchAttack();}
 selectArena(id:ArenaId){this.ready();const current=this.state.getState();if(current!==GameState.MENU&&current!==GameState.GAME_OVER)return;if(current===GameState.GAME_OVER)this.loop.stop();this.session.setArena(id);if(current===GameState.GAME_OVER)this.state.reset();else this.state.notify();}
 selectMode(id:GameModeId){this.ready();const current=this.state.getState();if(current!==GameState.MENU&&current!==GameState.GAME_OVER)return;if(current===GameState.GAME_OVER)this.loop.stop();this.session.setMode(id);if(current===GameState.GAME_OVER)this.state.reset();else this.state.notify();}
 newRun(){
  this.ready();const state=this.state.getState();
  if(!this.progression||state===GameState.PLAYING||state===GameState.PAUSED)return false;
  if(this.inRun)this.loop.stop();
  this.progression.begin();
  return this.continueRun();
 }
 continueRun(){
  this.ready();const state=this.state.getState();
  if(!this.progression||(state!==GameState.MENU&&state!==GameState.GAME_OVER))return false;
  const view=this.progression.getView(),run=view.run;
  if(!run||run.status==="complete")return false;
  // Coming back from the main menu with a pending reward opens intermission first.
  if(run.status==="victory"&&!this.inRun){
   this.normalSnapshot={arena:this.session.getHudState().arena,mode:this.session.getMode(),
    upgrades:this.session.getUpgradeSnapshot()};
   this.inRun=true;
   this.session.setUpgradeSnapshot({points:run.points,upgradedWeapons:run.upgradedWeapons});
   this.session.startRunEncounter(run.stage);
   this.state.notify();
   return true;
  }
  if(run.status==="victory"&&!this.progression.advance())return false;
  if(!this.progression.canLaunch())return false;
  if(!this.inRun){
   this.normalSnapshot={arena:this.session.getHudState().arena,mode:this.session.getMode(),
    upgrades:this.session.getUpgradeSnapshot()};
  }
  this.loop.stop();
  this.inRun=true;
  const next=this.progression.getView().run!;
  this.session.setUpgradeSnapshot({points:next.points,upgradedWeapons:next.upgradedWeapons});
  this.session.startRunEncounter(next.stage);
  this.progression.launch();
  this.state.transitionTo(GameState.PLAYING);
  this.loop.start();
  return true;
 }
 leaveRun(){
  this.ready();
  if(!this.inRun)return false;
  this.loop.stop();
  this.session.cancelTransientActions();
  this.inRun=false;
  this.session.leaveRun();
  if(this.normalSnapshot){
   this.session.setMode(this.normalSnapshot.mode);
   this.session.setArena(this.normalSnapshot.arena);
   this.session.setUpgradeSnapshot(this.normalSnapshot.upgrades);
  }
  this.normalSnapshot=null;
  if(this.progression?.getView().run?.status==="complete")this.progression.clear();
  this.state.reset();
  return true;
 }
 getArena(){return this.session.getArena();}
 getHudState(){return{...this.session.getHudState(),progression:this.progression?.getView()??null,inRun:this.inRun};}
 subscribe(listener:(state:GameState)=>void){return this.state.subscribe(listener);}getState(){return this.state.getState();}
 resize(){this.assertNotDisposed();if(this.initialized)this.renderer.resize();}
 dispose(){if(this.disposed)return;this.loop.dispose();this.session.dispose();this.renderer.dispose();this.state.dispose();this.disposed=true;}
 private update(dt:number){if(this.state.getState()===GameState.GAME_OVER){this.session.update(dt);if(this.session.getRenderState().explosions.length===0)this.loop.stop();return;}if(this.state.getState()===GameState.PLAYING){this.session.update(dt);if(this.session.getRenderState().winner)this.endGame();}}
 private ready(){this.assertNotDisposed();if(!this.initialized)throw new Error("Game must be initialized before lifecycle operations.");}private assertNotDisposed(){if(this.disposed)throw new Error("Game has been disposed.");}
}