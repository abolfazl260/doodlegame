import test from "node:test";
import assert from "node:assert/strict";
import {blockedDependencies,hasRemoteRuntimeResource,scanSourceForNetworkApi,hasWebOnlyTelegramGate,violatesOfflineNetworkPolicy} from "../scripts/android/verify-review-readiness.mjs";

test("review verifier detects runtime network APIs",()=>{
 assert.equal(scanSourceForNetworkApi("fetch('/api')"),true);
 assert.equal(scanSourceForNetworkApi("const privacy='https://example.com/privacy'"),false);
});
test("review verifier detects CDN-backed resources but not ordinary links",()=>{
 assert.equal(hasRemoteRuntimeResource('<script src="https://cdn.example.com/a.js"></script>',".html"),true);
 assert.equal(hasRemoteRuntimeResource('<a href="https://example.com/privacy">privacy</a>',".html"),false);
 assert.equal(hasRemoteRuntimeResource('<link rel="canonical" href="https://example.com/privacy">',".html"),false);
 assert.equal(hasRemoteRuntimeResource('<link rel="stylesheet" href="https://cdn.example.com/a.css">',".html"),true);
 assert.equal(hasRemoteRuntimeResource("body{background:url(https://cdn.example.com/a.png)}",".css"),true);
});
test("review verifier blocks future auth/billing/ads dependencies",()=>{
 assert.deepEqual(blockedDependencies({"three":"1","@capacitor/core":"8"}),[]);
 assert.deepEqual(blockedDependencies({"firebase":"1","some-billing-sdk":"2"}),["firebase","some-billing-sdk"]);
});

test("native reviewer scan exempts ONLY the platform-gated optional Telegram leaderboard",()=>{
 const source='if(Capacitor.getPlatform()==="web"){ telegram=installTelegramMiniApp(window,document,{}); }';
 assert.equal(hasWebOnlyTelegramGate(source),true);
 assert.equal(hasWebOnlyTelegramGate('telegram=installTelegramMiniApp(window,document,{})'),false);
 assert.equal(violatesOfflineNetworkPolicy("src/platform/web/TelegramLeaderboard.ts","fetch('/api')",true),false);
 assert.equal(violatesOfflineNetworkPolicy("src/platform/web/TelegramLeaderboard.ts","fetch('/api')",false),true);
 assert.equal(violatesOfflineNetworkPolicy("src/core/Game.ts","fetch('/api')",true),true);
 assert.equal(violatesOfflineNetworkPolicy("src/platform/web/Other.ts","fetch('/api')",true),true);
 assert.equal(violatesOfflineNetworkPolicy("src/core/Game.ts","const x=1",false),false);
});
