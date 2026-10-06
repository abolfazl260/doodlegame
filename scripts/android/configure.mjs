import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
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

for (const path of [variablesPath, appGradlePath, manifestPath, stylesPath]) {
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
manifest = manifest.replace(
  /\s*<uses-permission android:name="android\.permission\.INTERNET" \/>/,
  ""
);
if (!manifest.includes('android:screenOrientation="landscape"')) {
  manifest = manifest.replace(
    'android:name=".MainActivity"',
    'android:name=".MainActivity"\n            android:screenOrientation="landscape"'
  );
}
manifest = manifest
  .replace(/android:icon="@mipmap\/ic_launcher"/, 'android:icon="@mipmap/doodlegame_launcher"')
  .replace(/android:roundIcon="@mipmap\/ic_launcher_round"/, 'android:roundIcon="@mipmap/doodlegame_launcher_round"');
write(manifestPath, manifest);

const brandingPath = "assets/android/branding.json";
if (!existsSync(brandingPath)) {
  throw new Error(`Android branding source is missing: ${brandingPath}`);
}
const branding = JSON.parse(read(brandingPath));
const {
  background,
  foreground,
  viewport,
  strokeWidth,
  strokePaths,
  fillPaths
} = branding;

const resRoot = "android/app/src/main/res";
for (const relative of ["values", "drawable", "mipmap-anydpi", "mipmap-anydpi-v26"]) {
  ensureDir(join(resRoot, relative));
}

write(join(resRoot, "values/doodlegame_colors.xml"), `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="doodlegame_icon_background">${background}</color>
    <color name="doodlegame_icon_foreground">${foreground}</color>
</resources>
`);

const vectorPaths = [
  ...strokePaths.map((pathData) => `    <path
        android:pathData="${pathData}"
        android:fillColor="@android:color/transparent"
        android:strokeColor="@color/doodlegame_icon_foreground"
        android:strokeWidth="${strokeWidth}"
        android:strokeLineCap="round"
        android:strokeLineJoin="round" />`),
  ...fillPaths.map((pathData) => `    <path
        android:pathData="${pathData}"
        android:fillColor="@color/doodlegame_icon_foreground" />`)
].join("\n");

const foregroundVector = `<?xml version="1.0" encoding="utf-8"?>
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="108dp"
    android:height="108dp"
    android:viewportWidth="${viewport}"
    android:viewportHeight="${viewport}">
${vectorPaths}
</vector>
`;
write(join(resRoot, "drawable/doodlegame_icon_foreground.xml"), foregroundVector);

const legacyVector = `<?xml version="1.0" encoding="utf-8"?>
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="108dp"
    android:height="108dp"
    android:viewportWidth="${viewport}"
    android:viewportHeight="${viewport}">
    <path android:pathData="M0,0 H${viewport} V${viewport} H0 Z" android:fillColor="@color/doodlegame_icon_background" />
${vectorPaths}
</vector>
`;
write(join(resRoot, "mipmap-anydpi/doodlegame_launcher.xml"), legacyVector);
write(join(resRoot, "mipmap-anydpi/doodlegame_launcher_round.xml"), legacyVector);

const adaptiveIcon = `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@color/doodlegame_icon_background" />
    <foreground android:drawable="@drawable/doodlegame_icon_foreground" />
</adaptive-icon>
`;
write(join(resRoot, "mipmap-anydpi-v26/doodlegame_launcher.xml"), adaptiveIcon);
write(join(resRoot, "mipmap-anydpi-v26/doodlegame_launcher_round.xml"), adaptiveIcon);

write(join(resRoot, "drawable/doodlegame_splash.xml"), `<?xml version="1.0" encoding="utf-8"?>
<layer-list xmlns:android="http://schemas.android.com/apk/res/android">
    <item android:drawable="@color/doodlegame_icon_background" />
    <item
        android:width="144dp"
        android:height="144dp"
        android:gravity="center"
        android:drawable="@drawable/doodlegame_icon_foreground" />
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
console.log("Android branding ready: adaptive/legacy launcher icon + black doodle splash.");
if (!process.env.ANDROID_KEYSTORE_PATH) {
  console.log("Release signing is not configured; release artifacts will be unsigned until signing env vars are provided.");
}
