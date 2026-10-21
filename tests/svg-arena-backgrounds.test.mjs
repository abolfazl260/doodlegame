import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const read=(path)=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
const arenas=["fortress","bridge","crater","sky"];
test("four local backgrounds are compact standalone SVGs",()=>{
 for(const id of arenas){
  const svg=read("src/assets/backgrounds/"+id+".svg");
  assert.match(svg,/^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);
  assert.match(svg,/viewBox="0 0 1200 675"/);
  assert.match(svg,/<linearGradient\b/);
  assert.match(svg,/<path\b/);
  assert.match(svg,/<\/svg>\s*$/);
  assert.doesNotMatch(svg,/<(?:script|image|foreignObject|use)\b|(?:href|xlink:href)=|@import/i);
  assert.ok(Buffer.byteLength(svg)<9000,id+" must remain lightweight");
 }
});
test("Canvas, WebGL and arena preview share the same SVG art",()=>{
 const backgrounds=read("src/themes/SimplifiedSvgBackdrops.ts");
 const themes=read("src/themes/ArenaThemes.ts");
 const previews=read("src/ui/ArenaPreviews.ts");
 const canvas=read("src/rendering/CanvasRenderer.ts");
 const three=read("src/rendering/ThreeRenderer.ts");
 for(const id of arenas)assert.match(backgrounds,new RegExp('backgrounds/'+id+'\\.svg\\?raw'));
 assert.match(themes,/paintSimpleSvgBackdrop\(/);
 assert.match(previews,/svgBackdropInnerMarkup\(/);
 assert.match(canvas,/svgBackdropRevision\(/);
 assert.match(three,/svgBackdropRevision\(/);
});
