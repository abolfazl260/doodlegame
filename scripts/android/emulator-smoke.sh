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

echo "Installing $APK_PATH"
adb install -r "$APK_PATH"
adb logcat -b all -c >/dev/null 2>&1 || adb logcat -c

echo "Disabling device network for reviewer/offline validation"
adb shell cmd connectivity airplane-mode enable >/dev/null 2>&1 || true
adb shell svc wifi disable >/dev/null 2>&1 || true
adb shell svc data disable >/dev/null 2>&1 || true

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
is_resumed
adb exec-out screencap -p > android-smoke-offline-menu.png

echo "Backgrounding and restoring the offline menu"
adb shell input keyevent KEYCODE_HOME
sleep 1
MENU_RESTORE_OUTPUT="$(start_app)"
printf '%s\n' "$MENU_RESTORE_OUTPUT"
grep -q "Status: ok" <<<"$MENU_RESTORE_OUTPUT"
sleep 1
is_resumed

echo "Starting a match from the menu using the Enter shortcut"
adb shell input keyevent KEYCODE_ENTER
sleep 2
is_resumed
adb exec-out screencap -p > android-smoke-offline-match.png

echo "Backgrounding an active match; foreground must return to a paused app"
adb shell input keyevent KEYCODE_HOME
sleep 1
RESTORE_OUTPUT="$(start_app)"
printf '%s\n' "$RESTORE_OUTPUT"
grep -q "Status: ok" <<<"$RESTORE_OUTPUT"
sleep 2
is_resumed
adb exec-out screencap -p > android-smoke-restored-paused.png

echo "Back from PAUSED must return to menu without exiting"
adb shell input keyevent KEYCODE_BACK
sleep 1
is_resumed

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
