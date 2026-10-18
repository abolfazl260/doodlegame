#!/usr/bin/env python3
"""Fail-closed Capacitor APK version and production-signature checks for Bazaar."""
from __future__ import annotations

import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import sys

PACKAGE = "com.abolfazl.doodlegame"
APP_NAME = "DoodleGame"
CONFIG = Path("config/cafebazaar-release.json")
MAX_CODE = 2_100_000_000
VERSION = re.compile(r"^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$")
BADGING = re.compile(
    r"^package:\s+name='([^']+)'\s+versionCode='(\d+)'\s+versionName='([^']+)'",
    re.MULTILINE,
)
CERT = re.compile(r"Signer #1 certificate SHA-256 digest:\s*([0-9a-fA-F:]+)")


class VersionError(Exception):
    pass


def numeric_version(name: str) -> tuple[int, int, int]:
    match = VERSION.fullmatch(name) if isinstance(name, str) else None
    if match is None:
        raise VersionError("Expected a stable x.y.z versionName (no prerelease suffix).")
    return tuple(map(int, match.groups()))


def release_version(config: dict, package: dict) -> tuple[str, int]:
    name = config.get("versionName")
    code = config.get("versionCode")
    highest = config.get("highestPreviouslySubmittedVersionCode")
    previous_name = config.get("previousVersionName")
    now = numeric_version(name)
    if package.get("version") != name:
        raise VersionError("Bazaar versionName must equal package.json version (Android source of truth).")
    if isinstance(code, bool) or not isinstance(code, int) or not 0 < code <= MAX_CODE:
        raise VersionError("Set an explicit positive versionCode in config/cafebazaar-release.json; no run-number generation.")
    if isinstance(highest, bool) or not isinstance(highest, int) or not 0 <= highest < MAX_CODE:
        raise VersionError("Set highestPreviouslySubmittedVersionCode after checking the full Bazaar release history; use 0 only for a genuinely new app.")
    if code <= highest:
        raise VersionError(f"versionCode {code} must exceed the highest previously submitted Bazaar build code {highest}.")
    if previous_name is not None:
        if now <= numeric_version(previous_name):
            raise VersionError("Both versionName and versionCode must increase for a new release. Patch for fixes, minor for features.")
    elif highest != 0:
        raise VersionError("Set previousVersionName to the latest Bazaar release's versionName when the app has a publication history.")
    return name, code


def read_version() -> tuple[str, int]:
    config = json.loads(CONFIG.read_text(encoding="utf-8"))
    package = json.loads(Path("package.json").read_text(encoding="utf-8"))
    if not isinstance(config, dict) or not isinstance(package, dict):
        raise VersionError("Invalid Bazaar ledger or package.json object.")
    return release_version(config, package)


def extract_badging(output: str) -> tuple[str, str, int]:
    match = BADGING.search(output)
    if not match:
        raise VersionError("aapt could not extract Android package, versionName and versionCode.")
    package, code, name = match.groups()
    return package, name, int(code)


def normalized_fingerprint(fingerprint: str) -> str:
    value = fingerprint.replace(":", "").replace(" ", "").strip().lower()
    if not re.fullmatch(r"[0-9a-f]{64}", value):
        raise VersionError("CAFEBAZAAR_EXPECTED_CERT_SHA256 must be a 64-character certificate SHA-256 fingerprint.")
    return value


def verify_apk(
    apk: Path, name: str, code: int, *, aapt: str, apksigner: str, fingerprint: str
) -> str:
    if not apk.is_file() or apk.stat().st_size == 0:
        raise VersionError("Expected a nonempty release APK, not an AAB or unsigned build.")
    if apk.name != "app-release.apk":
        raise VersionError("Only the release APK named app-release.apk is accepted.")
    if not fingerprint:
        raise VersionError("CAFEBAZAAR_EXPECTED_CERT_SHA256 is required to pin the Bazaar production signing certificate.")
    try:
        badging = subprocess.run([aapt, "dump", "badging", str(apk)], check=True, text=True,
                                 capture_output=True, timeout=30).stdout
        signature = subprocess.run([apksigner, "verify", "--verbose", "--print-certs", str(apk)],
                                   check=True, text=True, capture_output=True, timeout=45).stdout
    except (OSError, subprocess.CalledProcessError, subprocess.TimeoutExpired) as exc:
        raise VersionError("Android SDK APK metadata or production signature verification failed.") from exc
    got_package, got_name, got_code = extract_badging(badging)
    if (got_package, got_name, got_code) != (PACKAGE, name, code):
        raise VersionError(
            "APK metadata mismatch: expected %s %s (%s), got %s %s (%s)."
            % (PACKAGE, name, code, got_package, got_name, got_code)
        )
    certificate = CERT.search(signature)
    if certificate is None:
        raise VersionError("apksigner did not confirm a release signing certificate.")
    if normalized_fingerprint(certificate.group(1)) != normalized_fingerprint(fingerprint):
        raise VersionError("APK signer certificate does not match the pinned Bazaar production certificate; never upload with another key.")
    if not re.search(r"Verified using v[23] scheme .*?: true", signature, re.I):
        raise VersionError("APK signature v2/v3 verification did not succeed.")
    digest = hashlib.file_digest(apk.open("rb"), "sha256").hexdigest()
    return digest


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--prepare", action="store_true")
    parser.add_argument("--verify-apk", type=Path)
    parser.add_argument("--aapt", default="aapt")
    parser.add_argument("--apksigner", default="apksigner")
    args = parser.parse_args()
    if args.prepare == bool(args.verify_apk):
        raise VersionError("Select exactly one of --prepare and --verify-apk.")
    name, code = read_version()
    if args.prepare:
        print(f"Bazaar version from main: {name} ({code}); Package: {PACKAGE}")
        output = os.environ.get("GITHUB_OUTPUT")
        if output:
            with open(output, "a", encoding="utf-8") as file:
                file.write(f"version_name={name}\nversion_code={code}\npackage={PACKAGE}\n")
    else:
        digest = verify_apk(args.verify_apk, name, code, aapt=args.aapt,
                            apksigner=args.apksigner,
                            fingerprint=os.environ.get("CAFEBAZAAR_EXPECTED_CERT_SHA256", ""))
        print(f"Verified APK: {PACKAGE} {name} ({code}) | SHA-256 {digest}")
        output = os.environ.get("GITHUB_OUTPUT")
        if output:
            with open(output, "a", encoding="utf-8") as file:
                file.write(f"sha256={digest}\n")


if __name__ == "__main__":
    try:
        main()
    except (VersionError, OSError, ValueError, json.JSONDecodeError) as exc:
        print(f"::error::{exc}", file=sys.stderr)
        sys.exit(1)
