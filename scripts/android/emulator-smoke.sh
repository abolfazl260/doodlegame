#!/usr/bin/env bash
set -euo pipefail

APK_PATH="${1:-android/app/build/outputs/apk/debug/app-debug.apk}"
PACKAGE="com.abolfazl.doodlegame"
ACTIVITY="${PACKAGE}/.MainActivity"

if [[ ! -f "$APK_PATH" ]]; then
  echo "APK not found: $APK_PATH" >&2
  exit 1
fi

echo "Installing $APK_PATH"
adb install -r "$APK_PATH"
adb logcat -c

echo "Cold-starting $ACTIVITY"
START_OUTPUT="$(adb shell am start -S -W -n "$ACTIVITY" | tr -d '\r')"
printf '%s\n' "$START_OUTPUT"
grep -q "Status: ok" <<<"$START_OUTPUT"

sleep 3
PID="$(adb shell pidof "$PACKAGE" | tr -d '\r')"
test -n "$PID"
echo "App process: $PID"

RESUMED="$(adb shell dumpsys activity activities | tr -d '\r' | grep -E 'mResumedActivity|topResumedActivity' | grep "$PACKAGE" || true)"
test -n "$RESUMED"
printf '%s\n' "$RESUMED"

adb exec-out screencap -p > android-smoke-launch.png

echo "Backgrounding and restoring app"
adb shell input keyevent KEYCODE_HOME
sleep 1
RESTORE_OUTPUT="$(adb shell am start -W -n "$ACTIVITY" | tr -d '\r')"
printf '%s\n' "$RESTORE_OUTPUT"
grep -q "Status: ok" <<<"$RESTORE_OUTPUT"
sleep 2

echo "Testing Android Back from menu"
adb shell input keyevent KEYCODE_BACK
sleep 2
if adb shell dumpsys activity activities | tr -d '\r' | grep -E 'mResumedActivity|topResumedActivity' | grep -q "$PACKAGE"; then
  echo "App remained resumed after Back from menu." >&2
  exit 1
fi

echo "Relaunching for final health check"
adb shell am start -W -n "$ACTIVITY" >/dev/null
sleep 2
adb exec-out screencap -p > android-smoke-final.png
adb logcat -d -t 1500 > emulator-logcat.txt

if grep -A 15 -E 'FATAL EXCEPTION' emulator-logcat.txt | grep -q "$PACKAGE"; then
  echo "Fatal Android exception detected." >&2
  grep -A 20 -E 'FATAL EXCEPTION' emulator-logcat.txt >&2 || true
  exit 1
fi

echo "Android emulator smoke test passed."
