import test from 'node:test';import assert from 'node:assert/strict';
import {BUILT_IN_PREVIEW_IDS,arenaPreviewSvg,arenaPreviewUrl,arenaCategories,ARENA_CATEGORY_IDS} from '../.test-build/ui/ArenaPreviews.js';
import {getBuiltInArenaPreviewDefinition} from '../.test-build/gameplay/GameSession.js';
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
