import test from 'node:test';
import assert from 'node:assert/strict';
import {MobileOnboarding,ONBOARDING_KEY} from '../.test-build/ui/MobileOnboarding.js';
import {WebInput} from '../.test-build/platform/web/WebInput.js';
import {GameSession} from '../.test-build/gameplay/GameSession.js';
const signals=()=>({move:0,jump:0,attack:0,double:0,grab:0,kick:0,grounded:true,doubleAvailable:true,near:false,safe:true});
const memory=()=>{const values=new Map();return {get:k=>values.get(k),set:(k,v)=>values.set(k,v),remove:k=>values.delete(k)};};
test('core advances only on new accepted actions; completion persists, skip and replay work',()=>{
 const storage=memory(),flow=new MobileOnboarding(storage),s=signals();
 assert.equal(flow.update(s,false,false),null);assert.equal(flow.update(s,true,false),'move');
 s.attack++;s.jump++;assert.equal(flow.update(s,true,false),'move');
 s.move=.9;assert.equal(flow.update(s,true,false),'jump');assert.equal(flow.update(s,true,false),'jump');
 s.jump++;assert.equal(flow.update(s,true,false),'attack');s.attack++;assert.equal(flow.update(s,true,false),'ready');
 assert.equal(storage.get(ONBOARDING_KEY),'completed');assert.equal(new MobileOnboarding(storage).update(s,true,false),null);
 flow.replay();assert.equal(flow.update(s,true,false),'move');flow.skip();assert.equal(new MobileOnboarding(storage).status,'skipped');
});
test('contextual actions honor availability and missile rules; pause hides without resetting',()=>{
 const flow=new MobileOnboarding(),s=signals();flow.update(s,true,false);s.move++;flow.update(s,true,false);s.jump++;flow.update(s,true,false);s.attack++;flow.update(s,true,false);
 s.grounded=false;assert.equal(flow.update(s,true,false),'double');assert.equal(flow.update(s,false,false),null);
 s.double++;s.grounded=true;s.near=true;assert.equal(flow.update(s,true,true),null);assert.equal(flow.update(s,true,false),'grab');s.grab++;assert.equal(flow.update(s,true,false),'kick');s.kick++;assert.equal(flow.update(s,true,false),null);
});
test('real joystick accepted jumps count; third jump and cancelled attack do not',()=>{
 const input=new WebInput({}),game=new GameSession(input);
 input.setTouchMove(.5,-.8);game.update(1/60);assert.equal(game.getHudState().tutorial.jump,1);
 input.setTouchMove(0,0);input.setTouchMove(0,-.8);game.update(1/60);assert.equal(game.getHudState().tutorial.double,1);
 input.setTouchMove(0,0);input.setTouchMove(0,-.8);game.update(1/60);assert.equal(game.getHudState().tutorial.double,1);
 input.touchAttack();input.touchAttackCancel();game.update(1/60);assert.equal(game.getHudState().tutorial.attack,0);
});
