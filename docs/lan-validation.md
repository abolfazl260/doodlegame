# Issue #163 validation status

Date: 2026-10-21. Source implementation is available for review; **physical feasibility/release acceptance is not complete**.

## Automated evidence

- `npm test`: 397 passing tests including 21 LAN unit/integration tests. Coverage: handshake/token; strict protocol and address validation; input edge resend/deduplication; 60 Hz timing; host-authoritative P2 movement/aim/bow; all 16 arena DTOs; interpolation; consented pause/resume/rematch; rejoin/expiry; old input rejection; forged authority messages; native source registration/security assertions. In-memory transports are intentionally used for portable orchestration tests.
- `npm run build`: passes TypeScript and Vite production compilation.
- Native project generation followed by `npm run android:sync` in a fresh source copy: passes asset build/sync, source copying and plugin registration. Generated Java matches the repository source. HTTPS origin, usesCleartextTraffic=false and restricted navigation remain.
- `npm run android:build:debug`: **blocked**, not passed. This container cannot fetch the Gradle distribution (`Network is unreachable`); it also has only JRE 17, while Capacitor 8 requires JDK 21, and no Android SDK is provisioned. No APK compilation or native runtime success is claimed.
- Release manifest/privacy/production gates require an actual release build. They remain pending, even though their source baseline is updated for ACCESS_NETWORK_STATE.
- Browser integration: all 5 LAN cases (host/guest × Persian/English, plus public-IP rejection) pass. The 4 existing loadout cases and all 8 same-device PvP cases pass (17 total targeted browser cases). Old PvP fixtures were updated to explicitly confirm loadouts, as required by the existing production contract. Browser tests use an in-memory transport, not native sockets. The standard Chromium CDN was unavailable, so these runs used a temporary Chromium 153 binary from the npm-distributed `@sparticuz/chromium` package with Playwright 1.56.1; that temporary dependency/config is not part of the repository.
- `ci:bundle-budget`: passes, 986,389 total JavaScript bytes against 1,500,000 budget (gzip 268,130 bytes).
- `ci:verify-monetization` and `ci:verify-audience`: pass, including inspection of the configured Android source manifest.

## Required physical sign-off (not run here)

Record APK commit/fingerprint, APK SHA-256, two model names, Android/API versions, router model, date, and a screenshot/video for each run. Cover a low supported API and API 36, including OEM background behavior.

| Test | Expected | Evidence / result |
| --- | --- | --- |
| WAN unplugged, mobile data off | Create → Join → Ready → countdown → full Duel → result → rematch | Pending |
| Simultaneous input | Move, jump/double/wall jump, dash, aim, press/hold/release, grab/throw and switch on both phones | Pending |
| Combat and scenery | Same HP/result, melee/ranged, bomb/missile, destructible cover and moving platforms | Pending |
| Invalid connection | Wrong IP/token, room full, incompatible APK, firewall/AP isolation, timeout | Pending |
| Network change | Wi-Fi off/change and reconnect freeze, show error and recover without fake winner | Pending |
| Lifecycle | Pause/background/lock/call/rotation/Back/exit/relaunch clear inputs; both consent to resume | Pending |
| Cleanup | Leave room closes listener/socket; new room can be created; no background service | Pending |
| Privacy/security | Packet capture shows only private Wi-Fi peer traffic for LAN, no external rendezvous/telemetry | Pending |
| Reset build | Fresh android:reset/sync/debug/release includes plugin and passes manifest/privacy gates | Pending |

## Performance capture

Record at least five minutes on two midrange phones at 20 Hz snapshots / 30 Hz input / 60 Hz simulation. UI shows RTT; measure end-to-end input-to-visible latency separately (high-frame-rate camera or timestamp instrumentation), since RTT alone is not input latency. Record p50/p95 RTT, jitter, p95 input latency (engineering target <150 ms on stable lab Wi-Fi), bytes/second, snapshot size, FPS, CPU and memory. Repeat with Wi-Fi interference and background/return. Check that four native bridge messages, 16 writes, 32 JS messages, 64 action edges and one coalesced snapshot remain bounded. All physical measurements are pending; no latency claim is made by the source tests.

## Release rule

Keep #163 open and this PR in draft until native compilation, release gates, the WAN-disconnected two-phone match/rematch and performance evidence are supplied. Existing manually requested Android Actions can build debug/release artifacts and run the single-emulator smoke test; one emulator is not evidence for two-phone LAN acceptance.

## Follow-up review

Seven added regression cases cover same-tick pause snapshots, rejoining a completed match, a fixed rejoin deadline across failed retries, cancelled native listen setup, post-result effect expiry and cue acknowledgement, cancellation while a native listener registers, and listener cleanup if native close rejects. The five orchestration regressions were reproduced against the previous implementation before correction. Protocol v2 adds independent snapshot revisions and a match-scoped presentation acknowledgement; old APKs are rejected by handshake version/fingerprint.

This follow-up does not change the outstanding physical-device or native APK compilation status.
