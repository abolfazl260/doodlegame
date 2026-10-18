"""Offline tests of explicit source version and production APK signature gate."""
import hashlib
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import cafebazaar_version as version

GOOD = {
    "versionName": "0.4.1",
    "versionCode": 12,
    "highestPreviouslySubmittedVersionCode": 11,
    "previousVersionName": "0.4.0",
}
PACKAGE_JSON = {"version": "0.4.1"}


class VersionTests(unittest.TestCase):
    def test_both_version_fields_are_required_and_increase(self):
        self.assertEqual(version.release_version(GOOD, PACKAGE_JSON), ("0.4.1", 12))
        for key, value in [
            ("versionCode", None), ("versionCode", 0), ("versionCode", 11),
            ("versionCode", True), ("versionCode", "13"),
            ("highestPreviouslySubmittedVersionCode", None),
            ("previousVersionName", "0.4.1"), ("previousVersionName", "0.5.0"),
            ("versionName", "0.4.0"), ("versionName", "0.4.1-dev"),
        ]:
            with self.subTest(key=key, value=value):
                source = GOOD.copy()
                source[key] = value
                with self.assertRaises(version.VersionError):
                    version.release_version(source, PACKAGE_JSON)

    def test_version_must_match_package_json(self):
        with self.assertRaisesRegex(version.VersionError, "package.json"):
            version.release_version(GOOD, {"version": "0.4.2"})
        self.assertEqual(version.numeric_version("1.2.10"), (1, 2, 10))

    def test_unknown_bazaar_history_is_a_safe_blocker(self):
        for change in [
            {"highestPreviouslySubmittedVersionCode": None},
            {"previousVersionName": None},
        ]:
            with self.assertRaises(version.VersionError):
                version.release_version({**GOOD, **change}, PACKAGE_JSON)
        self.assertEqual(version.release_version({
            "versionName": "0.1.1", "versionCode": 1,
            "highestPreviouslySubmittedVersionCode": 0, "previousVersionName": None
        }, {"version": "0.1.1"}), ("0.1.1", 1))

    def test_aapt_package_and_semver_parse(self):
        line = "package: name='com.abolfazl.doodlegame' versionCode='12' versionName='0.4.1'\n"
        self.assertEqual(version.extract_badging(line),
                         ("com.abolfazl.doodlegame", "0.4.1", 12))
        with self.assertRaises(version.VersionError):
            version.extract_badging("package: invalid")

    def test_real_apk_signature_and_package_are_required(self):
        with tempfile.TemporaryDirectory() as td:
            apk = Path(td) / "app-release.apk"
            apk.write_bytes(b"offline signing fixture")
            cert = "ab" * 32
            good = [
                "package: name='com.abolfazl.doodlegame' versionCode='12' versionName='0.4.1'",
                f"Verified using v2 scheme (APK Signature Scheme v2): true\n"
                f"Signer #1 certificate SHA-256 digest: {cert}",
            ]
            from subprocess import CompletedProcess
            def subprocess_response(cmd, **kwargs):
                return CompletedProcess(cmd, 0, stdout=good[0] if cmd[0] == "aapt" else good[1])
            with patch.object(version.subprocess, "run", side_effect=subprocess_response):
                digest = version.verify_apk(
                    apk, "0.4.1", 12, aapt="aapt", apksigner="apksigner", fingerprint=cert
                )
                self.assertEqual(digest, hashlib.sha256(apk.read_bytes()).hexdigest())
                with self.assertRaisesRegex(version.VersionError, "pinned"):
                    version.verify_apk(apk, "0.4.1", 12, aapt="aapt",
                                       apksigner="apksigner", fingerprint="cd" * 32)
                with self.assertRaisesRegex(version.VersionError, "mismatch"):
                    version.verify_apk(apk, "0.4.2", 12, aapt="aapt",
                                       apksigner="apksigner", fingerprint=cert)
            with self.assertRaises(version.VersionError):
                version.verify_apk(apk, "0.4.1", 12, aapt="aapt",
                                   apksigner="apksigner", fingerprint="")

    def test_workflow_has_manual_only_trigger_and_no_play_dependency(self):
        config = (Path(__file__).resolve().parents[2] /
                  ".github/workflows/cafebazaar-publish.yml").read_text()
        self.assertIn("  workflow_dispatch:", config)
        self.assertNotIn("\n  push:", config)
        self.assertNotIn("\n  pull_request:", config)
        self.assertNotIn("\n  schedule:", config)
        self.assertNotIn("\n  workflow_call:", config)
        self.assertIn("confirm_publish", config)
        self.assertIn("cancel-in-progress: false", config)
        self.assertIn("assembleRelease", config)
        self.assertNotIn("bundleRelease", config)
        self.assertIn("retention-days: 14", config)
        self.assertIn("CAFEBAZAAR_EXPECTED_CERT_SHA256", config)
        self.assertIn("C A F E B A Z A A R".replace(" ", "").lower(),
                      config.lower())


if __name__ == "__main__":
    unittest.main()
