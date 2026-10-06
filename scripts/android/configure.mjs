import { readFileSync, writeFileSync, existsSync } from "node:fs";

const read = (path) => readFileSync(path, "utf8");
const write = (path, content) => writeFileSync(path, content, "utf8");

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

for (const path of [variablesPath, appGradlePath, manifestPath]) {
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
if (!manifest.includes('android:screenOrientation="landscape"')) {
  manifest = manifest.replace(
    'android:name=".MainActivity"',
    'android:name=".MainActivity"\n            android:screenOrientation="landscape"'
  );
}
write(manifestPath, manifest);

console.log(`Android config ready: versionName=${packageJson.version}, versionCode=${versionCode}, SDK 24/36.`);
if (!process.env.ANDROID_KEYSTORE_PATH) {
  console.log("Release signing is not configured; release artifacts will be unsigned until signing env vars are provided.");
}
