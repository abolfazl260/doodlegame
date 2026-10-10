/**
 * Browser-level test fixture: actual GameUI, WebInput, GameSession and production CSS.
 * Isolated from the rendering loop/intro so headless pointer tests are deterministic.
 */
import "../../src/styles.css";
import {GameState} from "../../src/core/GameState";
import {GameSession,type ArenaId,type GameModeId} from "../../src/gameplay/GameSession";
import {I18n} from "../../src/i18n/I18n";
import {WebInput} from "../../src/platform/web/WebInput";
import {WebStorage} from "../../src/platform/web/WebStorage";
import {GameUI} from "../../src/ui/GameUI";

const canvas=document.querySelector<HTMLCanvasElement>("#game-canvas")!;
const uiRoot=document.querySelector<HTMLElement>("#ui-root")!;
const input=new WebInput(canvas);
input.start();
const session=new GameSession(input);
session.reset(false);
const locale=new I18n(new WebStorage());
let ui:GameUI;
let currentState=GameState.PLAYING;
const render=()=>ui.render(currentState,session.getHudState());
ui=new GameUI(uiRoot,{
 start(){},pause(){currentState=GameState.PAUSED;render();},resume(){currentState=GameState.PLAYING;render();},restart(){},stopToMenu(){currentState=GameState.MENU;render();},
 weaponNext(){session.selectWeapon(1);render();},
 weaponPrevious(){session.selectWeapon(-1);render();},
 weaponSelect(id){session.selectWeaponById(id);render();},
 selectStartingWeapon(id){session.setStartingWeapon(id);render();},
 upgradeWeapon(){},
 arenaSelect(id){session.setArena(id);render();},
 modeSelect(id){session.setMode(id);render();},
 setMissileAngle(angle){session.setMissileAngle(angle);render();},
 setMissilePower(power){session.setMissilePower(power);render();},
 fireWeapon(){session.fireWeapon();},
 setTouchMove(x,y){input.setTouchMove(x,y);},
 touchAttackStart(){input.touchAttack(true);},
 touchAttackEnd(){input.touchAttackRelease();},
 touchAttackCancel(){input.touchAttackCancel();session.cancelTouchAttack();},
 toggleCombatSound(){},toggleCameraShake(){}
},locale);
ui.bind(()=>()=>{},()=>session.getHudState());
render();

const fixture={
 selected:()=>session.getHudState().weapon,
 state:()=>currentState,
 facing:()=>session.getHudState().playerFacing,
 setFacing:(direction:1|-1)=>{input.setTouchMove(direction,0);session.update(1/60);input.setTouchMove(0,0);render();},
 setMode:(mode:GameModeId)=>{session.setMode(mode);render();},
 setArena:(arena:ArenaId)=>{session.setArena(arena);render();},
 setWeapon:(weapon:import("../../src/input/Input").WeaponId)=>{session.selectWeaponById(weapon);render();},
 tick:(frames=1)=>{for(let i=0;i<frames;i++)session.update(1/60);render();},
 moveX:()=>input.getState().moveX,
 attackCancelled:()=>input.getState().attackCancelled,
 projectiles:()=>session.getRenderState().projectiles.filter(p=>p.owner==="player").length,
 attackPressed:()=>input.getState().attackPressed,
 attackHeld:()=>input.getState().attackHeld,
 pointerDown:()=>input.getState().pointerDown,
 clearAttack:()=>input.endFrame()
};
(window as typeof window & {__weaponFixture:typeof fixture}).__weaponFixture=fixture;
