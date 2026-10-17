import test from 'node:test';import assert from 'node:assert/strict';
import {BUILT_IN_PREVIEW_IDS,arenaPreviewSvg,arenaPreviewUrl,arenaCategories,ARENA_CATEGORY_IDS} from '../.test-build/ui/ArenaPreviews.js';
import {getBuiltInArenaPreviewDefinition} from '../.test-build/gameplay/GameSession.js';
import {ARENA_THEMES} from "../.test-build/themes/ArenaThemes.js";
import {stageLandmarks,stageLandmarksSvg} from "../.test-build/themes/ArenaStageArt.js";
test('exactly sixteen distinct previews derive from every real arena definition',()=>{
 const defs=getBuiltInArenaPreviewDefinition();assert.equal(BUILT_IN_PREVIEW_IDS.length,16);assert.deepEqual(new Set(BUILT_IN_PREVIEW_IDS),new Set(Object.keys(defs)));
 const images=BUILT_IN_PREVIEW_IDS.map(arenaPreviewSvg);assert.equal(new Set(images).size,16);
 for(const id of BUILT_IN_PREVIEW_IDS){assert.ok(arenaPreviewUrl(id).startsWith('data:image/svg+xml'));assert.equal(arenaPreviewSvg(id),arenaPreviewSvg(id));assert.ok(arenaCategories(id).length);for(const c of arenaCategories(id))assert.ok(ARENA_CATEGORY_IDS.includes(c));}
});
test('mechanics determine category membership rather than color or name',()=>{
 for(const id of ['pit','bridge','collapse','ruins'])assert.ok(arenaCategories(id).includes('hazards'));
 for(const id of ['towers','vertical'])assert.ok(arenaCategories(id).includes('vertical'));
 for(const id of ['moving','zigzag','ruins'])assert.ok(arenaCategories(id).includes('moving'));
 for(const id of ['conveyor','storm','reactor','sky'])assert.ok(arenaCategories(id).includes('special'));
 assert.ok(arenaCategories('classic').includes('balanced'));assert.match(arenaPreviewSvg('conveyor'),/#fbc56e/);assert.match(arenaPreviewSvg('reactor'),/<circle/);
});

test("sixteen illustrated thumbnails use corresponding in-game landmarks, never generic silhouettes",()=>{
 const ids=BUILT_IN_PREVIEW_IDS;
 const shapes=new Set();
 for(const id of ids){
  const theme=ARENA_THEMES[id];
  const landmarks=stageLandmarks(id),markup=stageLandmarksSvg(id,theme,240,96),svg=arenaPreviewSvg(id);
  assert.ok(landmarks.length>=8,id+" should have a recognizable signature");
  assert.ok(markup.length>=150,id+" landmark illustration should be substantial");
  assert.ok(svg.includes(markup),"preview has same stage-specific landmarks as gameplay");
  assert.ok(svg.includes(theme.skyTop)&&svg.includes(theme.skyBottom),"preview follows arena palette");
  assert.match(svg,/linearGradient/,"preview has an atmospheric themed sky");
  assert.match(svg,/clipPath/,"preview stays clipped to rounded image bounds");
  shapes.add(JSON.stringify(landmarks));
 }
 assert.equal(shapes.size,16,"every stage must have a truly unique illustrated layout");
 assert.ok(stageLandmarks("sky").some(shape=>shape.kind==="polygon"));
 assert.ok(stageLandmarks("crater").some(shape=>shape.paint==="accent"));
});
