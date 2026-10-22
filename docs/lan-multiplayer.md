# Local Wi-Fi duels (Android APK)

LAN multiplayer connects **two Android phones on the same Wi-Fi**. It needs no account, router internet connection, cloud service or mobile data. It is separate from same-device Local 2 Players. Internet Online remains disabled. This MVP supports Duel and bundled arenas; both phones must install the same APK build. Browser, Telegram, iOS and PC hosting/joining are unsupported.

## Play

1. Connect both phones to one Wi-Fi. For a real offline check, turn off mobile data on both and disconnect the router WAN cable.
2. On one phone, open **Local Wi-Fi · 1v1 / بازی با Wi-Fi محلی** and choose **Create LAN Room / ساخت اتاق محلی**.
3. The host shows its numeric local IP, port and a 32-character session token. On the second phone choose **Join LAN Room / پیوستن به اتاق**, enter exactly those values, and Connect.
4. The host chooses the built-in arena. Each phone selects its own character and starting weapon. Only Duel is enabled initially. Both tap Ready; the host taps Start. Play begins after the countdown.
5. Each phone controls only its own fighter. The guest is the right-side fighter, but the HUD labels You/Opponent and the world is not mirrored. Jump uses the joystick, attack/hold/release and grab use ATTACK, and the aim pad controls direction. LAN adds an explicit DASH button and enables the single weapon-cycle button. These extra controls do not change offline loadout rules.
6. Pause from either phone stops both. Both must tap Ready to resume. After a result, both approve rematch. Leaving closes that phone's room connection.

فارسی: هر دو گوشی را به یک Wi-Fi وصل کنید. میزبان «ساخت اتاق محلی» را می‌زند؛ مهمان IP، پورت و توکن روی صفحه میزبان را وارد می‌کند. هر دو آماده می‌شوند و میزبان بازی را شروع می‌کند. برای ادامه بعد از توقف یا بازی دوباره نیز تأیید هر دو لازم است. این قابلیت برای بازی از راه دور یا اینترنت عمومی نیست.

## Connection problems

- **No Wi-Fi:** connect to a Wi-Fi network with private IPv4 addressing. Mobile data alone does not work. A router without internet is fine.
- **Invalid address:** copy the private IP and port from the current room, not a public IP, website, VPN address or previous room. Only numeric IPv4 addresses in the attached Wi-Fi subnet are accepted.
- **Cannot reach host / timeout:** check both phones use the same Wi-Fi/subnet, the host is still open, and the router/firewall allows communication between clients. Guest networks often enable **AP isolation / client isolation**; disable that setting or use a trusted non-isolated network.
- **Wrong token:** enter all 32 hexadecimal characters from the current host room. Closing/recreating the room changes the token and often the port.
- **Version mismatch:** install the exact same APK on both phones. Downloaded maps and downloaded balance data are not part of LAN matches.
- **Room full:** only one guest is accepted. Close the previous connection; repeated join attempts are rate limited.
- **Connection lost / background / lock screen:** both matches freeze, with no artificial win/loss. The guest can retry within 30 seconds while the same host/session is alive. Both must approve resume afterward. After expiry or host exit, return to the menu and create a new room.
- **Hotspot / VPN / cellular:** hotspots are best effort, not guaranteed. VPN and cellular routing cannot be used for LAN play. For the acceptance test, use a normal router and turn mobile data off.

## Local data and trust

Only session/token, equipment/match choices, inputs and render snapshots are sent directly between the phones. No character names, account identifiers or gameplay telemetry are uploaded by the LAN path. Session data stays in memory and is cleared on exit. Local TCP is unencrypted; use trusted Wi-Fi and do not treat the token as cryptographic protection against someone controlling that network.

## Build and validation

See [Android packaging](android.md), [architecture](adr/001-android-lan.md) and [validation status / two-phone test sheet](lan-validation.md). Native source is versioned under `scripts/android/native/`, not inside the generated Android project. `npm run android:reset && npm run android:sync` restores plugin source and registration while retaining production WebView hardening.
