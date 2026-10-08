import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {
 OPENING_DURATION_MS,
 REDUCED_MOTION_DURATION_MS,
 openingFrame,
 openingStars
} from "../.test-build/ui/OpeningIntroMotion.js";

test("intro begins fully visible, fades out, and finishes before showing menu",()=>{
 const beginning=openingFrame(0);
 const midpoint=openingFrame(OPENING_DURATION_MS/2);
 const fading=openingFrame(OPENING_DURATION_MS-400);
 const end=openingFrame(OPENING_DURATION_MS);
 assert.equal(beginning.progress,0);
 assert.equal(beginning.opacity,1);
 assert.equal(midpoint.opacity,1);
 assert.ok(fading.opacity>0&&fading.opacity<1);
 assert.equal(end.progress,1);
 assert.equal(end.opacity,0);
 assert.ok(end.x>beginning.x,"fighter drifts across the screen");
});

test("weightless fighter paddles instead of following a static image",()=>{
 const positions=[0,800,1550,2400].map(ms=>openingFrame(ms));
 assert.ok(new Set(positions.map(point=>point.y)).size>1);
 assert.ok(new Set(positions.map(point=>point.angle)).size>1);
 assert.ok(new Set(positions.map(point=>point.paddle)).size>1);
 for(const pose of positions){
  assert.ok(Number.isFinite(pose.x)&&Number.isFinite(pose.y));
  assert.ok(pose.opacity>=0&&pose.opacity<=1);
 }
});

test("prefers-reduced-motion is a shorter version of the same safe transition",()=>{
 const half=openingFrame(REDUCED_MOTION_DURATION_MS/2,REDUCED_MOTION_DURATION_MS);
 assert.equal(half.progress,.5);
 assert.equal(openingFrame(REDUCED_MOTION_DURATION_MS,REDUCED_MOTION_DURATION_MS).opacity,0);
 assert.equal(openingFrame(999999).opacity,0);
 assert.equal(openingFrame(-10).progress,0);
});

test("procedural star field is deterministic and never needs an image download",()=>{
 const first=openingStars(70);
 assert.deepEqual(first,openingStars(70));
 assert.notDeepEqual(first,openingStars(70,99));
 assert.equal(first.length,70);
 for(const star of first){
  assert.ok(star.x>=0&&star.x<1);
  assert.ok(star.y>=0&&star.y<1);
 }
});

test("intro starts only after initializing the game and can be skipped",()=>{
 const main=readFileSync("src/main.ts","utf8");
 const intro=readFileSync("src/ui/OpeningIntro.ts","utf8");
 const css=readFileSync("src/styles.css","utf8");
 assert.ok(main.indexOf("game.initialize();")<main.indexOf("intro.start();"));
 assert.ok(main.includes("intro.dispose();"));
 assert.ok(intro.includes("this.skip.addEventListener"));
 assert.ok(intro.includes("this.finish()"));
 assert.ok(intro.includes("this.menuRoot.inert=true"));
 assert.ok(intro.includes("this.menuRoot.inert=false"));
 assert.ok(intro.includes("fighterVisual(state)"));
 assert.ok(intro.includes("this.drawPlanet("));
 assert.ok(css.includes(".opening-intro__skip"));
});
