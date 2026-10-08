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
const render=()=>ui.render(GameState.PLAYING,session.getHudState());
ui=new GameUI(uiRoot,{
 start(){},pause(){},resume(){},restart(){},
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
 setMode:(mode:GameModeId)=>{session.setMode(mode);render();},
 setArena:(arena:ArenaId)=>{session.setArena(arena);render();},
 attackPressed:()=>input.getState().attackPressed,
 clearAttack:()=>input.endFrame()
};
(window as typeof window & {__weaponFixture:typeof fixture}).__weaponFixture=fixture;
