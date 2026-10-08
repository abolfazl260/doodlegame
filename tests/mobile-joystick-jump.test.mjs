import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {WebInput} from "../.test-build/platform/web/WebInput.js";

const makeInput=()=>new WebInput({});

test("moving the joystick in any direction never triggers a jump",()=>{
 const input=makeInput();
 for(const [x,y] of [[0,-1],[-0.7,-0.7],[0.7,-0.7],[0,1],[-1,0],[1,0],[0,-0.6]]){
  input.setTouchMove(x,y);
  assert.equal(input.getState().jumpPressed,false,"joystick movement should not activate jump");
  assert.equal(input.getState().moveX,x);
  assert.equal(input.getState().moveY,y);
  input.endFrame();
 }
});

test("the dedicated mobile jump button triggers exactly one jump input per tap",()=>{
 const input=makeInput();
 input.setTouchMove(-0.6,-0.8);
 input.touchJump();
 assert.equal(input.getState().jumpPressed,true);
 assert.equal(input.getState().moveX,-0.6,"jump must not cancel joystick movement");
 input.endFrame();
 assert.equal(input.getState().jumpPressed,false,"jump press is transient");
 input.setTouchMove(0,-1);
 assert.equal(input.getState().jumpPressed,false,"holding the joystick up cannot jump again");
 input.touchJump();
 assert.equal(input.getState().jumpPressed,true,"a new tap allows a second jump");
});

test("input reset clears jump and movement state",()=>{
 const input=makeInput();
 input.setTouchMove(0.5,-0.8);
 input.touchJump();
 input.resetTransientState();
 assert.equal(input.getState().moveX,0);
 assert.equal(input.getState().moveY,0);
 assert.equal(input.getState().jumpPressed,false);
 input.setTouchMove(0,-1);
 assert.equal(input.getState().jumpPressed,false);
});

test("mobile HUD places weapon controls by the joystick and separates jump",()=>{
 const ui=readFileSync(new URL("../src/ui/GameUI.ts",import.meta.url),"utf8");
 const css=readFileSync(new URL("../src/styles.css",import.meta.url),"utf8");
 const main=readFileSync(new URL("../src/main.ts",import.meta.url),"utf8");
 assert.match(ui,/this\.mobileControls\.append\(this\.mobileWeaponSwitcher,this\.joystick,this\.mobileJumpButton,this\.mobileAttackButton\)/);
 assert.match(ui,/this\.mobileJumpButton\.addEventListener\("pointerdown"/);
 assert.match(main,/touchJump:\(\)=>input\.touchJump\(\)/);
 assert.match(css,/\.game-ui\.playing \.game-ui__mobile-weapon-switcher:not\(\[hidden\]\)\s*\{[^}]*left:calc\(var\(--safe-left\)/);
 assert.match(css,/\.game-ui__mobile-weapon-arrow\s*\{[^}]*height:44px/);
 assert.doesNotMatch(css,/\.game-ui__joystick::before/);
});
