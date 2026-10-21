# ADR 001: Android Wi-Fi LAN duels

Status: implementation ready for review; native build and two-device feasibility/performance sign-off pending. Related: #163.

## Decision

Use a repository-owned Capacitor `DoodleLan` Java plugin and a typed `LanTransport`. Raw TCP has four-byte big-endian UTF-8 JSON frame lengths, a 64 KiB maximum, TCP_NODELAY, a 5-second connect timeout and an 8-second read/frame timeout. There is no HTTP server, browser socket fallback, signaling server, DNS, STUN/TURN, discovery or WAN connection path. The Online placeholder stays disabled.

The plugin finds a Network with TRANSPORT_WIFI and a private IPv4 LinkAddress without requiring INTERNET/VALIDATED capabilities. Hosts bind that specific address on an ephemeral OS-selected port, never 0.0.0.0. Guests use Network.bindSocket and bind the source address before connecting. Both destination and accepted source must be private numeric IPv4 addresses on that Wi-Fi link's subnet, excluding self/network/broadcast. VPN and cellular routing are not used. IPv6-only Wi-Fi and guaranteed hotspot support are out of scope.

`scripts/android/native/DoodleLanPlugin.java` is the source of truth. `configure.mjs` copies and registers it before BridgeActivity loads; `/android/` alone is ignored. Reset/sync reproducibility is tested. The manifest adds the normal ACCESS_NETWORK_STATE permission to inspect links. Existing INTERNET permission is used for sockets. No location/discovery permissions, background service or runtime identity are introduced. The permission allowlist and data inventory are updated.

## Android security boundary

WebView remains HTTPS, usesCleartextTraffic=false, empty allowNavigation, release-gated debugging and disabled file/content access. Native raw sockets do not go through a WebView `ws://` mixed-content exception. No Network Security Configuration is relaxed. Local TCP is **not encrypted or authenticated cryptographically**: a random 128-bit room token is an admission check, transmitted on the LAN. Someone controlling the access point can inspect/replay it. Use trusted Wi-Fi, send no names/PII, and invalidate the token when the room closes. This MVP does not claim protection against a malicious local access point.

Android 16 local-network protections are opt-in for the current target 36. Android's local network permission requirements must be reviewed before raising target SDK; do not quietly add nearby/location permissions or weaken security. Actual API 24 and 36 behavior, OEM background handling and Play release audits require device/build evidence before release.

## Authority and timing

`SessionController` owns a separate LAN match, independently of offline Game and mode IDs. Only the host constructs a GameSession with two human InputSources. Guests never step GameSession, determine damage/results or attach Progression. Downloaded/live tuning is not applied: LAN is bundled content, Duel only, all built-in arenas.

LAN uses a 60 Hz accumulator capped to six updates per rendered frame. Existing 120 Hz physics substeps and offline GameLoop behavior are untouched. Pause/resume discards the accumulator. Frame stalls cap catch-up work rather than changing readiness; explicit lifecycle interruption pauses both phones. Snapshots are coalesced to the newest state at 20 Hz; guest inputs go at 30 Hz. A 50 ms presentation buffer interpolates fighter poses and moving platforms, while health, environment and results remain authoritative. Projectiles are sampled from the host; no client hit prediction/rollback.

Inputs carry monotonic packet sequence and match epoch plus a bounded journal of action edges. Host acknowledges only enqueued edges, consumes them once in order, then uses the latest held state. Repeated packets cannot repeat taps. Pause, disconnect, rematch and orientation changes clear inputs. A new epoch prevents old input reapplication after consented resume. Combat cues are collected every simulation tick and repeated until guest rendering acknowledges them; audio IDs deduplicate playback. Rematch changes the audio scope.

## Protocol and limits

Version 1: JOIN / ACCEPT / REJECT, LOBBY / READY / START, INPUT / SNAPSHOT, PING / PONG, PAUSE / BACKGROUND / RESUME_READY / REMATCH / LEAVE. Snapshot carries winner, so no separate guest-writable RESULT is needed. Build/content/rules fingerprint is SHA-256 over versioned application/native source and package metadata, generated before builds. Mismatches fail explicitly.

Every received DTO is reconstructed with an allowlist, finite/ranged numbers, enum and bounded array validation. No class dumps or guest-authored HP/score are accepted. Native limits: one peer, one accept/second, 90 incoming frames/second, 16 writer jobs, four unacknowledged messages crossing into the WebView; a stalled bridge closes the peer. JS limits: 32 control/input messages, one coalesced snapshot, 64 action edges, 128 pending cues. Handshake expires in 5 s; heartbeat every 1 s freezes/disconnects after 5 s silence. Limits fail closed rather than grow an unbounded queue.

## Lifecycle

Either player can pause. Both explicitly ready before a three-second resume/rematch countdown. Native background also sends BACKGROUND before JS suspension; foreground pauses again as a missed-event fallback. A suspended/stalled bridge can disconnect, requiring rejoin. Host keeps the same match/token for a 30-second rejoin window, always paused with readiness reset. No disconnect result or career reward is created. Host leaving invalidates the room; UI explains the exit and provides menu return. Closing cancels sockets, listeners, scheduling and pending native connects; LEAVE is best effort with a 200 ms deadline.

## Evidence and open checks

See [LAN validation](../lan-validation.md). In-memory tests validate authority and protocol, not Android network feasibility. The native technical spike is **not signed off** until two actual APKs complete a WAN-disconnected match and rematch. No cloud fallback is permitted. Do not close #163 solely on passing source tests.

References:
- https://capacitorjs.com/docs/android/custom-code
- https://developer.android.com/privacy-and-security/local-network-permission
- https://developer.android.com/reference/android/net/Network#bindSocket(java.net.Socket)
