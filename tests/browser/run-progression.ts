import "../../src/styles.css";
import {Game} from "../../src/core/Game";
import {GameState} from "../../src/core/GameState";
import {GameSession} from "../../src/gameplay/GameSession";
import {Progression} from "../../src/progression/Progression";
import {I18n} from "../../src/i18n/I18n";
import {WebStorage} from "../../src/platform/web/WebStorage";
import {WebInput} from "../../src/platform/web/WebInput";
import {GameUI} from "../../src/ui/GameUI";

const canvas=document.querySelector<HTMLCanvasElement>("#game-canvas")!;
const root=document.querySelector<HTMLElement>("#ui-root")!;
const storage=new WebStorage();
const input=new WebInput(canvas);
const session=new GameSession(input);
const progression=new Progression(storage);
const i18n=new I18n(storage);
let scheduleId=0;
const scheduler={request:(_callback:(timestamp:number)=>void)=>++scheduleId,cancel:(_id:number)=>{}};
const renderer={resize(){},render(){},dispose(){}};
const game=new Game(renderer,session,scheduler,error=>{throw error;},progression);
const ui=new GameUI(root,{
 start:()=>game.start(),pause:()=>game.pause(),resume:()=>game.resume(),restart:()=>game.restart(),
 stopToMenu:()=>{input.resetTransientState();game.stop();},
 newRun:()=>{game.newRun();},continueRun:()=>{game.continueRun();},leaveRun:()=>{game.leaveRun();},
 weaponNext:()=>game.selectWeapon(1),weaponPrevious:()=>game.selectWeapon(-1),
 weaponSelect:id=>game.selectWeaponById(id),selectStartingWeapon:id=>game.selectStartingWeapon(id),
 upgradeWeapon:id=>game.upgradeWeapon(id),arenaSelect:id=>game.selectArena(id),
 modeSelect:id=>game.selectMode(id),setMissileAngle:n=>game.setMissileAngle(n),
 setMissilePower:n=>game.setMissilePower(n),fireWeapon:()=>game.fireWeapon(),
 setTouchMove:(x,y)=>input.setTouchMove(x,y),
 touchAttackStart:()=>input.touchAttack(true),
 touchAttackEnd:()=>input.touchAttackRelease(),
 touchAttackCancel:()=>input.touchAttackCancel(),
 setPlayer2TouchMove:(x,y)=>input.setPlayer2TouchMove(x,y),
 player2AttackStart:()=>input.player2TouchAttackStart(),
 player2AttackEnd:()=>input.player2TouchAttackRelease(),
 player2AttackCancel:()=>input.player2TouchAttackCancel(),
 player2WeaponNext:()=>game.selectPlayer2Weapon(1),
 player2WeaponPrevious:()=>game.selectPlayer2Weapon(-1),
 toggleCombatSound(){},toggleCameraShake(){},updateData:async()=>{}
},i18n);
game.initialize();
ui.bind(listener=>game.subscribe(listener),()=>game.getHudState());
const fixture={
 state:()=>game.getState(),
 view:()=>game.getHudState(),
 startPvP:()=>{
  if(game.getState()!==GameState.MENU)throw Error("startPvP requires menu");
  game.selectMode("local-pvp");
  input.resetTransientState();
  game.start();
 },
 pvpSnapshot:()=>{
  const state=session.getRenderState();
  return{mode:state.mode,arena:state.arena,winner:state.winner,player:state.player,opponent:state.opponent,
   p1Input:{...input.getState()},p2Input:{...input.getPlayer2State()}};
 },
 tickPvP:(frames=1)=>{
  for(let i=0;i<frames;i++)session.update(1/60);
 },
 finishPvP:(winner:"player"|"opponent"|"draw")=>{
  const player=Reflect.get(session,"player") as {health:number};
  const opponent=Reflect.get(session,"opponent") as {health:number};
  if(winner==="player"||winner==="draw")opponent.health=0;
  if(winner==="opponent"||winner==="draw")player.health=0;
  session.update(1/60);
  game.endGame();
 },
 changePvPArena:(arena:import("../../src/gameplay/GameSession").ArenaId)=>game.selectArena(arena),
 back:()=>game.stop(),
 startBowDuel:()=>{
  if(game.getState()!==GameState.MENU)throw Error("not in menu");
  game.selectStartingWeapon("bow");
  input.resetTransientState();
  game.start();
 },
 beginBowCharge:()=>{
  if(game.getState()!==GameState.PLAYING)throw Error("not playing");
  if(session.getHudState().weapon!=="bow")throw Error("Bow must be selected");
  input.touchAttack(true);
  for(let frame=0;frame<18;frame++)session.update(1/60);
 },
 releaseBow:()=>{
  if(game.getState()!==GameState.PLAYING)throw Error("not playing");
  input.touchAttackRelease();
  session.update(1/60);
 },
 combatSnapshot:()=>{
  const fighter=Reflect.get(session,"player") as {bowCharging:boolean;attackTime:number;cooldown:number};
  return{
  state:game.getState(),
  bowCharge:session.getHudState().bowCharge,
  bowCharging:fighter.bowCharging,
  attackTime:fighter.attackTime,
  cooldown:fighter.cooldown,
  arrows:session.getRenderState().projectiles.filter(p=>p.weapon==="bow").length,
  playerHealth:session.getHudState().playerHealth,
  opponentHealth:session.getHudState().opponentHealth,
  weapon:session.getHudState().weapon
  };
 },
 pauseDirect:()=>game.pause(),
 pauseFromBackground:()=>{input.resetTransientState();game.pause();},
 resumeDirect:()=>game.resume(),
 resumeFromBackground:()=>{input.resetTransientState();game.resume();},
 nextFrame:()=>{if(game.getState()===GameState.PLAYING)session.update(1/60);},
 restartFight:()=>{input.resetTransientState();game.restart();},
 stopFight:()=>{input.resetTransientState();game.stop();},
 releaseStaleInput:()=>input.resetTransientState(),
 win:()=>{
  if(game.getState()!==GameState.PLAYING)throw Error("not fighting");
  session.opponent.health=0;
  session.update(1/60);
  if(session.getHudState().winner!=="player")throw Error("combat did not finish");
  game.endGame();
 },
 lose:()=>{
  if(game.getState()!==GameState.PLAYING)throw Error("not fighting");
  session.player.health=0;
  session.update(1/60);
  if(session.getHudState().winner!=="opponent")throw Error("combat did not finish");
  game.endGame();
 }
};
(window as typeof window & {__runFixture:typeof fixture}).__runFixture=fixture;
