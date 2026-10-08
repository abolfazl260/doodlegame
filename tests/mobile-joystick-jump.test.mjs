import test from "node:test";
import assert from "node:assert/strict";
import {WebInput} from "../.test-build/platform/web/WebInput.js";

const makeInput=()=>new WebInput({});

test("upward joystick crossing jumps once until the stick is rearmed",()=>{
 const input=makeInput();
 input.setTouchMove(0,-0.6);
 assert.equal(input.getState().jumpPressed,true);
 input.endFrame();
 input.setTouchMove(0,-1);
 assert.equal(input.getState().jumpPressed,false,"holding up must not auto-jump");
 input.setTouchMove(0,-0.4);
 input.setTouchMove(0,-0.8);
 assert.equal(input.getState().jumpPressed,false,"hysteresis prevents accidental repeat jumps");
 input.setTouchMove(0,-0.2);
 input.setTouchMove(0,-0.65);
 assert.equal(input.getState().jumpPressed,true,"reentering up zone allows double jump");
});

test("diagonal movement can trigger jumping and retains horizontal input",()=>{
 const input=makeInput();
 input.setTouchMove(-0.7,-0.7);
 assert.equal(input.getState().jumpPressed,true);
 assert.equal(input.getState().moveX,-0.7);
 assert.equal(input.getState().moveY,-0.7);
 input.endFrame();
 input.setTouchMove(0.7,-0.7);
 assert.equal(input.getState().jumpPressed,false);
 assert.equal(input.getState().moveX,0.7);
});

test("neutral release and input reset allow a new jump",()=>{
 const input=makeInput();
 input.setTouchMove(0,-1);
 input.endFrame();
 input.setTouchMove(0,0);
 input.setTouchMove(0,-0.7);
 assert.equal(input.getState().jumpPressed,true);
 input.endFrame();
 input.resetTransientState();
 assert.equal(input.getState().moveY,0);
 input.setTouchMove(0,-0.7);
 assert.equal(input.getState().jumpPressed,true);
});

test("sideways and downward joystick movement never triggers jumping",()=>{
 const input=makeInput();
 input.setTouchMove(1,0);
 input.setTouchMove(0.7,0.7);
 input.setTouchMove(-1,0);
 assert.equal(input.getState().jumpPressed,false);
});
