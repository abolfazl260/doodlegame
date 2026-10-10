import { readFileSync, writeFileSync, existsSync, mkdirSync, copyFileSync } from "node:fs";
import { join } from "node:path";

const read = (path) => readFileSync(path, "utf8");
const write = (path, content) => writeFileSync(path, content, "utf8");
const ensureDir = (path) => mkdirSync(path, { recursive: true });

const packageJson = JSON.parse(read("package.json"));
const versionMatch = /^(\d+)\.(\d+)\.(\d+)/.exec(packageJson.version);

if (!versionMatch) {
  throw new Error(`package.json version must start with semantic version x.y.z; got ${packageJson.version}`);
}

const [, major, minor, patch] = versionMatch.map(Number);
const derivedVersionCode = Math.max(1, major * 1_000_000 + minor * 1_000 + patch);
const versionCode = Number(process.env.ANDROID_VERSION_CODE || derivedVersionCode);

if (!Number.isSafeInteger(versionCode) || versionCode < 1 || versionCode > 2_100_000_000) {
  throw new Error(`Invalid ANDROID_VERSION_CODE: ${versionCode}`);
}

const variablesPath = "android/variables.gradle";
const appGradlePath = "android/app/build.gradle";
const manifestPath = "android/app/src/main/AndroidManifest.xml";
const stylesPath = "android/app/src/main/res/values/styles.xml";
const mainActivityPath = "android/app/src/main/java/com/abolfazl/doodlegame/MainActivity.java";

for (const path of [variablesPath, appGradlePath, manifestPath, stylesPath, mainActivityPath]) {
  if (!existsSync(path)) {
    throw new Error(`Expected Capacitor Android file is missing: ${path}`);
  }
}

let variables = read(variablesPath);
variables = variables
  .replace(/minSdkVersion\s*=\s*\d+/, "minSdkVersion = 24")
  .replace(/compileSdkVersion\s*=\s*\d+/, "compileSdkVersion = 36")
  .replace(/targetSdkVersion\s*=\s*\d+/, "targetSdkVersion = 36");
write(variablesPath, variables);

let gradle = read(appGradlePath);
gradle = gradle
  .replace(/versionCode\s*=?\s*\d+/, `versionCode = ${versionCode}`)
  .replace(/versionName\s*=?\s*["'][^"']+["']/, `versionName = "${packageJson.version}"`)
  .replace(/minifyEnabled\s*=?\s*false/, "minifyEnabled = true");

if (!/shrinkResources\s*=?\s*true/.test(gradle)) {
  gradle = gradle.replace(
    /(minifyEnabled\s*=?\s*true)/,
    "$1\n            shrinkResources = true"
  );
}

const signingMarker = "// DOODLEGAME_RELEASE_SIGNING";
if (!gradle.includes(signingMarker)) {
  const signingConfig = `
    ${signingMarker}
    signingConfigs {
        release {
            def keystorePath = System.getenv("ANDROID_KEYSTORE_PATH")
            if (keystorePath) {
                storeFile = file(keystorePath)
                storePassword = System.getenv("ANDROID_KEYSTORE_PASSWORD")
                keyAlias = System.getenv("ANDROID_KEY_ALIAS")
                keyPassword = System.getenv("ANDROID_KEY_PASSWORD")
            }
        }
    }

`;
  gradle = gradle.replace(/\n\s*buildTypes\s*\{/, `\n${signingConfig}    buildTypes {`);
  gradle = gradle.replace(
    /(buildTypes\s*\{\s*release\s*\{)/,
    `$1
            if (System.getenv("ANDROID_KEYSTORE_PATH")) {
                signingConfig = signingConfigs.release
            }`
  );
}

write(appGradlePath, gradle);

let manifest = read(manifestPath);
const setApplicationAttribute = (name, value) => {
  const pattern = new RegExp(`android:${name}="[^"]*"`);
  if (pattern.test(manifest)) manifest = manifest.replace(pattern, `android:${name}="${value}"`);
  else manifest = manifest.replace("<application", `<application\n        android:${name}="${value}"`);
};
setApplicationAttribute("allowBackup", "false");
setApplicationAttribute("fullBackupContent", "@xml/doodlegame_backup_rules");
setApplicationAttribute("dataExtractionRules", "@xml/doodlegame_data_extraction_rules");
if (!manifest.includes('android:hardwareAccelerated="true"')) {
  manifest = manifest.replace(
    "<application",
    '<application\n        android:hardwareAccelerated="true"'
  );
}
if (!manifest.includes('android:usesCleartextTraffic="false"')) {
  manifest = manifest.replace(
    "<application",
    '<application\n        android:usesCleartextTraffic="false"'
  );
}
// Force the actual launch activity to landscape, including when a generated
// Android project already has a different screenOrientation attribute.
const mainActivityMatch = manifest.match(/<activity\b[^>]*android:name="\.MainActivity"[^>]*>/);
if (!mainActivityMatch) {
  throw new Error("Android MainActivity was not found; cannot enforce landscape orientation.");
}
const activityTag = mainActivityMatch[0];
manifest = manifest.replace(
  activityTag,
  /android:screenOrientation="[^"]*"/.test(activityTag)
    ? activityTag.replace(/android:screenOrientation="[^"]*"/, 'android:screenOrientation="landscape"')
    : activityTag.replace("<activity", '<activity\n            android:screenOrientation="landscape"')
);
manifest = manifest
  .replace(/android:icon="@mipmap\/ic_launcher"/, 'android:icon="@mipmap/doodlegame_launcher"')
  .replace(/android:roundIcon="@mipmap\/ic_launcher_round"/, 'android:roundIcon="@mipmap/doodlegame_launcher_round"');
write(manifestPath, manifest);

write(mainActivityPath, `package com.abolfazl.doodlegame;

import android.content.pm.ApplicationInfo;
import android.os.Bundle;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        boolean debuggable = (getApplicationInfo().flags & ApplicationInfo.FLAG_DEBUGGABLE) != 0;
        WebView.setWebContentsDebuggingEnabled(debuggable);
        getBridge().getWebView().getSettings().setAllowFileAccess(false);
        getBridge().getWebView().getSettings().setAllowContentAccess(false);
    }
}
`);

// The art file is the single source of truth for all Android launcher resources.
const launcherArtPath = "assets/android/doodlegame-launcher.webp";
if (!existsSync(launcherArtPath)) {
  throw new Error(`Android launcher artwork is missing: ${launcherArtPath}`);
}

const resRoot = "android/app/src/main/res";
for (const relative of ["values", "drawable", "drawable-nodpi", "xml", "mipmap-anydpi", "mipmap-anydpi-v26"]) {
  ensureDir(join(resRoot, relative));
}

write(join(resRoot, "xml/doodlegame_backup_rules.xml"), `<?xml version="1.0" encoding="utf-8"?>
<full-backup-content>
    <exclude domain="root" path="." />
    <exclude domain="file" path="." />
    <exclude domain="database" path="." />
    <exclude domain="sharedpref" path="." />
    <exclude domain="external" path="." />
</full-backup-content>
`);

write(join(resRoot, "xml/doodlegame_data_extraction_rules.xml"), `<?xml version="1.0" encoding="utf-8"?>
<data-extraction-rules>
    <cloud-backup>
        <exclude domain="root" path="." />
        <exclude domain="file" path="." />
        <exclude domain="database" path="." />
        <exclude domain="sharedpref" path="." />
        <exclude domain="external" path="." />
        <exclude domain="device_root" path="." />
        <exclude domain="device_file" path="." />
        <exclude domain="device_database" path="." />
        <exclude domain="device_sharedpref" path="." />
    </cloud-backup>
    <device-transfer>
        <exclude domain="root" path="." />
        <exclude domain="file" path="." />
        <exclude domain="database" path="." />
        <exclude domain="sharedpref" path="." />
        <exclude domain="external" path="." />
        <exclude domain="device_root" path="." />
        <exclude domain="device_file" path="." />
        <exclude domain="device_database" path="." />
        <exclude domain="device_sharedpref" path="." />
    </device-transfer>
</data-extraction-rules>
`);

// Keep the launcher source unscaled in drawable-nodpi so Android does not
// apply a second density multiplier. The artwork preserves transparent corners.
copyFileSync(launcherArtPath, join(resRoot, "drawable-nodpi/doodlegame_icon_art.webp"));

write(join(resRoot, "values/doodlegame_colors.xml"), `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="doodlegame_icon_background">#07152A</color>
</resources>
`);

// Adaptive icons require a foreground layer. Keep all critical artwork within
// the launcher safe zone instead of allowing the system mask to crop fighters.
write(join(resRoot, "drawable/doodlegame_icon_foreground.xml"), `<?xml version="1.0" encoding="utf-8"?>
<layer-list xmlns:android="http://schemas.android.com/apk/res/android">
    <item
        android:width="90dp"
        android:height="90dp"
        android:gravity="center"
        android:drawable="@drawable/doodlegame_icon_art" />
</layer-list>
`);

// API 24/25 receive the same full-color illustration as a legacy icon.
const legacyLauncher = `<?xml version="1.0" encoding="utf-8"?>
<layer-list xmlns:android="http://schemas.android.com/apk/res/android">
    <item android:drawable="@drawable/doodlegame_icon_art" />
</layer-list>
`;
write(join(resRoot, "mipmap-anydpi/doodlegame_launcher.xml"), legacyLauncher);
write(join(resRoot, "mipmap-anydpi/doodlegame_launcher_round.xml"), legacyLauncher);

const adaptiveIcon = `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@color/doodlegame_icon_background" />
    <foreground android:drawable="@drawable/doodlegame_icon_foreground" />
</adaptive-icon>
`;
write(join(resRoot, "mipmap-anydpi-v26/doodlegame_launcher.xml"), adaptiveIcon);
write(join(resRoot, "mipmap-anydpi-v26/doodlegame_launcher_round.xml"), adaptiveIcon);

// Keep the Android launch screen visually consistent with the launcher icon.
write(join(resRoot, "drawable/doodlegame_splash.xml"), `<?xml version="1.0" encoding="utf-8"?>
<layer-list xmlns:android="http://schemas.android.com/apk/res/android">
    <item android:drawable="@color/doodlegame_icon_background" />
    <item
        android:width="144dp"
        android:height="144dp"
        android:gravity="center"
        android:drawable="@drawable/doodlegame_icon_art" />
</layer-list>
`);

let styles = read(stylesPath);
const launchThemePattern = /<style name="AppTheme\.NoActionBarLaunch"([^>]*)>[\s\S]*?<\/style>/;
if (!launchThemePattern.test(styles)) {
  throw new Error("Could not find Capacitor launch theme in Android styles.xml.");
}
styles = styles.replace(
  launchThemePattern,
  `<style name="AppTheme.NoActionBarLaunch"$1>
        <item name="android:background">@drawable/doodlegame_splash</item>
        <item name="android:windowBackground">@drawable/doodlegame_splash</item>
    </style>`
);
write(stylesPath, styles);

console.log(`Android config ready: versionName=${packageJson.version}, versionCode=${versionCode}, SDK 24/36.`);
console.log("Android branding ready: full-color duel launcher, adaptive/legacy icons and matching splash.");
console.log("Android production hardening ready: backups excluded, WebView debugging bound to BuildConfig.DEBUG, file/content access disabled.");
if (!process.env.ANDROID_KEYSTORE_PATH) {
  console.log("Release signing is not configured; release artifacts will be unsigned until signing env vars are provided.");
}
