import {test,expect} from "@playwright/test";

test.use({viewport:{width:740,height:360}});
test("Canvas and WebGL draw the same actual HP label without per-frame text uploads",async({page})=>{
 await page.goto("tests/browser/run-progression.html");
 await page.waitForFunction(()=>Boolean(window.__runFixture));
 const result=await page.evaluate(async()=>{
  const [{CanvasRenderer},{ThreeRenderer}]=await Promise.all([
   import("../../src/rendering/CanvasRenderer.ts"),
   import("../../src/rendering/ThreeRenderer.ts")
  ]);
  const canvas=document.createElement("canvas");canvas.width=740;canvas.height=360;
  const ctx=canvas.getContext("2d");
  if(!ctx)throw Error("Canvas2D required");
  const painted=[];
  const originalStroke=ctx.strokeText.bind(ctx),originalFill=ctx.fillText.bind(ctx);
  ctx.strokeText=(...args)=>{painted.push(["outline",args[0]]);originalStroke(...args);};
  ctx.fillText=(...args)=>{painted.push(["fill",args[0]]);originalFill(...args);};
  const cue={id:901,kind:"hit",weapon:"hammer",x:0,y:0,age:.1,life:.48,
   intensity:1,direction:1,appliedDamage:12.5,target:"opponent",damageSource:"weapon"};
  const state={combatCues:[cue],player:{x:-3,y:0},opponent:{x:3,y:0}};
  const fallback=Object.create(CanvasRenderer.prototype);
  fallback.drawCombatCues(ctx,state,x=>370+x*30,y=>180-y*30,30);
  const gpu=Object.create(ThreeRenderer.prototype);
  gpu.scene={add(){}};
  gpu.damageVisuals=[];
  gpu.drawDamageLabels(state);
  const slot=gpu.damageVisuals[0];
  if(!slot)throw Error("Missing pooled WebGL sprite");
  const firstVersion=slot.texture.version;
  const initialPosition={x:slot.sprite.position.x,y:slot.sprite.position.y};
  gpu.drawDamageLabels(state);
  const reused=slot.texture.version===firstVersion&&gpu.damageVisuals.length===1;
  state.opponent.x=5;
  gpu.drawDamageLabels(state);
  const followsTarget=slot.sprite.position.x-initialPosition.x;
  state.combatCues=[];
  gpu.drawDamageLabels(state);
  const hidden=slot.sprite.visible===false;
  slot.texture.dispose();slot.sprite.material.dispose();
  return{painted,reused,hidden,followsTarget};
 });
 expect(result.painted).toEqual([["outline","-12.5"],["fill","-12.5"]]);
 expect(result.reused).toBe(true);
 expect(result.hidden).toBe(true);
 expect(result.followsTarget).toBeCloseTo(2,6);
});
