import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {WebInput} from "../.test-build/platform/web/WebInput.js";
import {GameSession} from "../.test-build/gameplay/GameSession.js";

const makeInput=()=>new WebInput({});

test("upward entry jumps once, and holding the stick up never auto-repeats",()=>{
 const input=makeInput();
 input.setTouchMove(0,-.7);
 assert.equal(input.getState().jumpPressed,true);
 input.endFrame();
 input.setTouchMove(0,-1);
 assert.equal(input.getState().jumpPressed,false);
 input.setTouchMove(0,-.4); // Still too high to rearm.
 input.setTouchMove(0,-.75);
 assert.equal(input.getState().jumpPressed,false);
 input.setTouchMove(0,-.2); // Return toward the center.
 input.setTouchMove(0,-.8);
 assert.equal(input.getState().jumpPressed,true,"upward entry permits double jump");
});

test("up-left and up-right allow simultaneous horizontal motion and jumping",()=>{
 const input=makeInput();
 input.setTouchMove(-.75,-.8);
 assert.equal(input.getState().jumpPressed,true);
 assert.equal(input.getState().moveX,-.75);
 input.endFrame();
 input.setTouchMove(.8,-.8);
 assert.equal(input.getState().moveX,.8);
 assert.equal(input.getState().jumpPressed,false,"crossing horizontally while held up must not re-jump");
 input.setTouchMove(.8,0);
 input.setTouchMove(.8,-.8);
 assert.equal(input.getState().jumpPressed,true);
});

test("non-upward directions cannot jump; neutral release rearms the next jump",()=>{
 const input=makeInput();
 for(const [x,y] of [[1,0],[-1,0],[0,1],[.9,-.4]]){
  input.setTouchMove(x,y);
  assert.equal(input.getState().jumpPressed,false);
 }
 input.setTouchMove(0,-1);
 assert.equal(input.getState().jumpPressed,true);
 input.endFrame();
 input.setTouchMove(0,0);
 input.setTouchMove(0,-1);
 assert.equal(input.getState().jumpPressed,true);
 input.resetTransientState();
 assert.equal(input.getState().moveY,0);
 assert.equal(input.getState().jumpPressed,false);
 input.setTouchMove(0,-1);
 assert.equal(input.getState().jumpPressed,true,"blur/pause reset rearms joystick");
});

test("mobile controls have no separate jump button or touchJump action",()=>{
 const ui=readFileSync(new URL("../src/ui/GameUI.ts",import.meta.url),"utf8");
 const css=readFileSync(new URL("../src/styles.css",import.meta.url),"utf8");
 const main=readFileSync(new URL("../src/main.ts",import.meta.url),"utf8");
 const input=readFileSync(new URL("../src/platform/web/WebInput.ts",import.meta.url),"utf8");
 assert.match(ui,/this\.mobileControls\.append\(this\.mobileWeaponSwitcher,this\.joystick,this\.mobileAttackButton\)/);
 assert.doesNotMatch(ui,/mobileJumpButton|touchJump/);
 assert.doesNotMatch(main,/touchJump/);
 assert.doesNotMatch(input,/touchJump\(/);
 assert.doesNotMatch(css,/\.game-ui__mobile-button--jump/);
 assert.match(css,/\.game-ui__joystick::before/);
 assert.match(ui,/this\.joystick\.addEventListener\("pointermove"/);
 assert.match(css,/\.game-ui\.playing \.game-ui__mobile-weapon-switcher:not\(\[hidden\]\)\s*\{[^}]*left:calc\(var\(--safe-left\)/);
 assert.match(css,/\.game-ui__mobile-weapon-arrow\s*\{[^}]*height:44px/);
});

test("joystick upward and repeated upward entry produce real in-game jumps",()=>{
 const input=makeInput();
 const game=new GameSession(input);
 const grounded=game.getRenderState().player;
 assert.equal(grounded.grounded,true);
 input.setTouchMove(.4,-.85);
 game.update(1/60);
 const airborne=game.getRenderState().player;
 assert.equal(airborne.grounded,false);
 assert.ok(airborne.velocityY>0,"joystick causes first jump in physics");
 input.setTouchMove(.4,0);
 input.setTouchMove(.4,-.85);
 assert.equal(input.getState().jumpPressed,true);
 game.update(1/60);
 const afterDoubleJump=game.getRenderState().player;
 assert.ok(afterDoubleJump.velocityY>0,"second upward crossing triggers airborne double jump");
 game.dispose();
});
