#!/usr/bin/env bash
set -euo pipefail

APK_PATH="${1:-android/app/build/outputs/apk/debug/app-debug.apk}"
PACKAGE="com.abolfazl.doodlegame"
ACTIVITY="${PACKAGE}/.MainActivity"
STARTUP_BUDGET_MS="${STARTUP_BUDGET_MS:-8000}"
MEMORY_PSS_BUDGET_KB="${MEMORY_PSS_BUDGET_KB:-350000}"

if [[ ! -f "$APK_PATH" ]]; then
  echo "APK not found: $APK_PATH" >&2
  exit 1
fi

capture_logcat() {
  adb logcat -b all -d -t 4000 > emulator-logcat.txt 2>/dev/null || true
}
trap capture_logcat EXIT

is_resumed() {
  adb shell dumpsys activity activities | tr -d '\r' | grep -E 'mResumedActivity|topResumedActivity' | grep -q "$PACKAGE"
}

start_app() {
  adb shell am start -W -n "$ACTIVITY" | tr -d '\r'
}

wait_for_resumed() {
  local tries
  for tries in {1..15}; do
    if is_resumed; then return 0; fi
    sleep 1
  done
  echo "App did not return to foreground within 15 seconds." >&2
  adb shell dumpsys activity activities | grep -E 'mResumedActivity|topResumedActivity' >&2 || true
  return 1
}

background_app() {
  # HOME key events can be delayed by an overloaded cold-boot emulator and
  # delivered after the app is restored. Launch HOME synchronously instead.
  adb shell am start -W -a android.intent.action.MAIN -c android.intent.category.HOME | tr -d '\r'
}

echo "Installing $APK_PATH"
adb install -r "$APK_PATH"
adb logcat -b all -c >/dev/null 2>&1 || adb logcat -c

echo "Disabling device network for reviewer/offline validation"
adb shell cmd connectivity airplane-mode enable >/dev/null 2>&1 || true
adb shell svc wifi disable >/dev/null 2>&1 || true
adb shell svc data disable >/dev/null 2>&1 || true

# On a freshly provisioned Android emulator, immersive fullscreen triggers a
# one-time "Viewing full screen / Got it" system dialog. The dialog consumes
# keyboard and touch events, so it must be dismissed before smoke navigation.
echo "Confirming Android immersive mode before the first launch"
adb shell settings put secure immersive_mode_confirmations confirmed
if [[ "$(adb shell settings get secure immersive_mode_confirmations | tr -d '\r')" != "confirmed" ]]; then
  echo "Could not suppress the Android immersive-mode confirmation." >&2
  exit 1
fi

echo "Cold-starting offline $ACTIVITY"
START_OUTPUT="$(adb shell am start -S -W -n "$ACTIVITY" | tr -d '\r')"
printf '%s\n' "$START_OUTPUT"
grep -q "Status: ok" <<<"$START_OUTPUT"
STARTUP_TOTAL_MS="$(awk -F': *' '/^TotalTime:/{print $2;exit}' <<<"$START_OUTPUT" | tr -dc '0-9')"
{
  echo "startup_budget_ms=$STARTUP_BUDGET_MS"
  echo "total_time_ms=${STARTUP_TOTAL_MS:-unavailable}"
  printf '%s\n' "$START_OUTPUT"
} > startup-metrics.txt
if [[ ! "$STARTUP_TOTAL_MS" =~ ^[0-9]+$ ]]; then
  echo "Could not parse Android cold-start TotalTime." >&2
  exit 1
fi
if (( STARTUP_TOTAL_MS > STARTUP_BUDGET_MS )); then
  echo "Cold start exceeded budget: ${STARTUP_TOTAL_MS}ms > ${STARTUP_BUDGET_MS}ms." >&2
  exit 1
fi

sleep 3
PID="$(adb shell pidof "$PACKAGE" | tr -d '\r')"
test -n "$PID"
wait_for_resumed
adb exec-out screencap -p > android-smoke-offline-menu.png

echo "Backgrounding and restoring the offline menu"
background_app
MENU_RESTORE_OUTPUT="$(start_app)"
printf '%s\n' "$MENU_RESTORE_OUTPUT"
grep -q "Status: ok" <<<"$MENU_RESTORE_OUTPUT"
wait_for_resumed
sleep 2
wait_for_resumed

echo "Starting a match by tapping the actual touch controls"
# Android adb KEYCODE_ENTER is not a reliable WebView click when no element
# has keyboard focus. The first-run fullscreen dialog made this worse: previous
# jobs remained on the intro / first wizard page after three Enter presses.
# Read the screenshot dimensions rather than assuming a particular emulator DPI
# or portrait device resolution (the app runs in landscape).
read -r SCREEN_WIDTH SCREEN_HEIGHT < <(python3 -c '
import struct
with open("android-smoke-offline-menu.png","rb") as f:
    header=f.read(24)
assert header[:8] == b"\x89PNG\r\n\x1a\n"
print(*struct.unpack(">II",header[16:24]))
')
if (( SCREEN_WIDTH <= SCREEN_HEIGHT )); then
  echo "Expected a landscape screen before touch navigation: ${SCREEN_WIDTH}x${SCREEN_HEIGHT}" >&2
  exit 1
fi
touch_fraction(){
  local x_percent="$1" y_percent="$2"
  adb shell input tap "$((SCREEN_WIDTH*x_percent/100))" "$((SCREEN_HEIGHT*y_percent/100))"
}

# The first-launch cinematic temporarily covers the menu. Skip it, then
# allow the WebView to finish its transition before tapping the landing page.
# Screenshots from failed run 38794705954 showed the old 92% wizard taps
# never started a match: the new home screen uses a central Quick Start button.
touch_fraction 12 10
sleep 6
adb exec-out screencap -p > android-smoke-ready-menu.png

echo "Launching Quick Play from the current landing page (center, 30% height)"
touch_fraction 50 30
sleep 4
wait_for_resumed
adb exec-out screencap -p > android-smoke-offline-match.png

echo "Backgrounding an active match; foreground must return to a paused app"
background_app
# Allow the Android WebView to process onPause/visibility events before
# foregrounding. Cold-boot emulator scheduling can otherwise skip the
# inactive callback entirely.
sleep 2
RESTORE_OUTPUT="$(start_app)"
printf '%s\n' "$RESTORE_OUTPUT"
grep -q "Status: ok" <<<"$RESTORE_OUTPUT"
wait_for_resumed
sleep 2
wait_for_resumed
adb exec-out screencap -p > android-smoke-restored-paused.png

echo "Back from PAUSED must return to menu without exiting"
adb shell input keyevent KEYCODE_BACK
sleep 1
wait_for_resumed

echo "Exercising an alternate phone resolution from the menu"
sleep 1
adb shell wm size 720x1600
sleep 2
is_resumed
adb exec-out screencap -p > android-smoke-resized.png
adb shell wm size reset
sleep 1

echo "Force-stopping process and validating clean recreation"
adb shell am force-stop "$PACKAGE"
sleep 1
RECREATE_OUTPUT="$(start_app)"
printf '%s\n' "$RECREATE_OUTPUT"
grep -q "Status: ok" <<<"$RECREATE_OUTPUT"
sleep 2
is_resumed
adb exec-out screencap -p > android-smoke-final.png

MEMINFO_OUTPUT="$(adb shell dumpsys meminfo "$PACKAGE" | tr -d '\r')"
TOTAL_PSS_KB="$(awk '/TOTAL PSS:/ {print $3; exit}' <<<"$MEMINFO_OUTPUT")"
if [[ ! "$TOTAL_PSS_KB" =~ ^[0-9]+$ ]]; then
  TOTAL_PSS_KB="$(awk '$1=="TOTAL" && $2 ~ /^[0-9]+$/ {print $2; exit}' <<<"$MEMINFO_OUTPUT")"
fi
{
  echo "pss_budget_kb=$MEMORY_PSS_BUDGET_KB"
  echo "total_pss_kb=${TOTAL_PSS_KB:-unavailable}"
  printf '%s\n' "$MEMINFO_OUTPUT"
} > memory-metrics.txt
if [[ ! "$TOTAL_PSS_KB" =~ ^[0-9]+$ ]]; then
  echo "Could not parse process TOTAL PSS." >&2
  exit 1
fi
if (( TOTAL_PSS_KB > MEMORY_PSS_BUDGET_KB )); then
  echo "Process memory exceeded budget: ${TOTAL_PSS_KB}KB > ${MEMORY_PSS_BUDGET_KB}KB." >&2
  exit 1
fi

capture_logcat
if grep -A 30 -E 'FATAL EXCEPTION' emulator-logcat.txt | grep -Fq "Process: $PACKAGE"; then
  echo "Fatal Android exception detected." >&2
  grep -A 30 -E 'FATAL EXCEPTION' emulator-logcat.txt >&2 || true
  exit 1
fi
if grep -Eq "ANR in ${PACKAGE}|am_anr.*${PACKAGE}|Application Not Responding.*${PACKAGE}" emulator-logcat.txt; then
  echo "Android ANR detected." >&2
  grep -E "ANR in ${PACKAGE}|am_anr.*${PACKAGE}|Application Not Responding.*${PACKAGE}" emulator-logcat.txt >&2 || true
  exit 1
fi

echo "Offline reviewer/Core Vitals smoke test passed."
