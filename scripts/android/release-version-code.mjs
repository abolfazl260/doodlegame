import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

// Reserve two decimal places for reruns of the same GitHub Actions workflow run.
// A release build uses a new workflow run number, so the generated Play code
// differs even when package.json's user-visible version has not changed.
const BASE_VERSION_CODE = 1_000_000;
const ATTEMPTS_PER_RUN = 100;
const MAX_PLAY_VERSION_CODE = 2_100_000_000;

function positiveInteger(value, label) {
  const text = String(value ?? "").trim();
  if (!/^[1-9][0-9]*$/.test(text)) {
    throw new Error(`${label} must be a positive decimal integer; got ${JSON.stringify(value)}`);
  }

  const integer = Number(text);
  if (!Number.isSafeInteger(integer) || integer > MAX_PLAY_VERSION_CODE) {
    throw new Error(`${label} must be at most ${MAX_PLAY_VERSION_CODE}`);
  }
  return integer;
}

export function resolveReleaseVersionCode({ runNumber, runAttempt = "1", manualCode = "" }) {
  if (String(manualCode ?? "").trim() !== "") {
    return positiveInteger(manualCode, "Requested versionCode");
  }

  const number = positiveInteger(runNumber, "GITHUB_RUN_NUMBER");
  const attempt = positiveInteger(runAttempt, "GITHUB_RUN_ATTEMPT");

  if (attempt >= ATTEMPTS_PER_RUN) {
    throw new Error(`GITHUB_RUN_ATTEMPT must be less than ${ATTEMPTS_PER_RUN}`);
  }

  const code = BASE_VERSION_CODE + number * ATTEMPTS_PER_RUN + attempt;
  if (!Number.isSafeInteger(code) || code > MAX_PLAY_VERSION_CODE) {
    throw new Error("Generated Android versionCode exceeds the Google Play limit");
  }
  return code;
}

const isCli = process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;

if (isCli) {
  try {
    const code = resolveReleaseVersionCode({
      runNumber: process.env.GITHUB_RUN_NUMBER,
      runAttempt: process.env.GITHUB_RUN_ATTEMPT,
      manualCode: process.env.REQUESTED_VERSION_CODE
    });
    process.stdout.write(String(code) + "\n");
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
