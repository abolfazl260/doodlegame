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
 toggleCombatSound(){},toggleCameraShake(){},updateData:async()=>{}
},i18n);
game.initialize();
ui.bind(listener=>game.subscribe(listener),()=>game.getHudState());
const fixture={
 state:()=>game.getState(),
 view:()=>game.getHudState(),
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
