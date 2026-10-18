"""All Pishkhan tests use stubbed HTTP calls; NO real Bazaar mutation."""
import hashlib
import io
import os
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import publish_cafebazaar as publish

SECRET = "private-unit-test-secret"


class PublisherTests(unittest.TestCase):
    def test_no_draft_creates_then_uploads_then_commits_once(self):
        calls = []
        def fake(method, endpoint, secret, *, data=None, apk=None):
            calls.append((method, endpoint, data, apk))
            if endpoint in ("last-committed/", "last-published/", "last-uncommitted/"):
                return {"type": "not-exists"}
            if endpoint == "":
                return {"type": "success", "release": {"id": 45}}
            return {"type": "success"}
        with tempfile.TemporaryDirectory() as td:
            apk = Path(td) / "app-release.apk"
            apk.write_bytes(b"only mock bytes, never uploaded")
            digest = hashlib.sha256(apk.read_bytes()).hexdigest()
            env = {
                "CAFEBAZAAR_PISHKHAN_API_SECRET": SECRET,
                "CAFEBAZAAR_CHANGELOG_FA": "اصلاح مشکلات",
                "CAFEBAZAAR_CHANGELOG_EN": "Bug fixes",
                "CAFEBAZAAR_DEVELOPER_NOTE": "reviewer message",
                "CAFEBAZAAR_VERIFIED_APK_SHA256": digest,
                "GITHUB_SHA": "a" * 40
            }
            with patch.dict(os.environ, env, clear=True), \
                 patch.object(sys, "argv", ["publisher", "--apk", str(apk)]), \
                 patch.object(publish, "read_version", return_value=("0.4.1", 12)), \
                 patch.object(publish, "api_call", side_effect=fake), \
                 patch.object(publish, "append_summary") as summary:
                publish.main()
                summary.assert_called_once()
        self.assertEqual([(method, endpoint) for method, endpoint, _, _ in calls if method == "POST"],
                         [("POST", ""), ("POST", "upload/"), ("POST", "commit/")])
        commit = calls[-1][2]
        self.assertEqual(commit, {
            "auto_publish": True, "staged_rollout_percentage": 100,
            "changelog_fa": "اصلاح مشکلات", "changelog_en": "Bug fixes",
            "developer_note": "reviewer message"
        })

    def test_resume_requires_matching_draft_id_and_never_creates(self):
        queries = []
        def fake(method, endpoint, secret, *, data=None, apk=None):
            queries.append((method, endpoint))
            if endpoint == "last-uncommitted/":
                return {"type": "success", "release": {
                    "id": 78, "versionCode": 12, "versionName": "0.4.1",
                    "packageName": publish.PACKAGE
                }}
            if endpoint in ("last-committed/", "last-published/"):
                return {"type": "not-exists"}
            return {"type": "success"}
        with patch.object(publish, "api_call", side_effect=fake):
            self.assertEqual(publish.preflight(SECRET, resume=True, expected_id="78",
                                               name="0.4.1", code=12),
                             ("success", "78"))
            with self.assertRaisesRegex(publish.PublishError, "Draft ID mismatch"):
                publish.preflight(SECRET, resume=True, expected_id="79", name="0.4.1", code=12)
            with self.assertRaisesRegex(publish.PublishError, "versionCode"):
                publish.preflight(SECRET, resume=True, expected_id="78", name="0.4.1", code=13)
            with self.assertRaisesRegex(publish.PublishError, "already exists"):
                publish.preflight(SECRET, resume=False, expected_id="", name="0.4.1", code=12)
        self.assertTrue(all(method == "GET" for method, _ in queries))

    def test_read_only_preflight_has_zero_post_calls(self):
        calls = []
        def fake(method, endpoint, secret, **kwargs):
            calls.append(method)
            return {"type": "not-exists"}
        with patch.dict(os.environ, {
            "CAFEBAZAAR_PISHKHAN_API_SECRET": SECRET,
            "CAFEBAZAAR_CHANGELOG_FA": "نسخه جدید"
        }, clear=True), patch.object(sys, "argv", ["publisher", "--preflight"]), \
             patch.object(publish, "read_version", return_value=("0.4.1", 12)), \
             patch.object(publish, "api_call", side_effect=fake):
            publish.main()
        self.assertEqual(calls, ["GET", "GET", "GET"])

    def test_committed_history_checks_name_and_code(self):
        def fake(method, endpoint, secret, **kwargs):
            if endpoint == "last-committed/":
                return {"type": "success", "release": {
                    "version_code": 12, "version_name": "0.4.1"}}
            return {"type": "not-exists"}
        with patch.object(publish, "api_call", side_effect=fake):
            with self.assertRaisesRegex(publish.PublishError, "versionCode"):
                publish.check_history(SECRET, "0.4.2", 12)
            with self.assertRaisesRegex(publish.PublishError, "versionName"):
                publish.check_history(SECRET, "0.4.1", 13)
            publish.check_history(SECRET, "0.4.2", 13)

    def test_network_failure_is_not_auto_retried_and_raw_token_is_hidden(self):
        import urllib.error
        from unittest.mock import Mock
        opener = Mock()
        opener.open.side_effect = urllib.error.URLError("disconnected")
        with patch.object(publish.urllib.request, "build_opener", return_value=opener):
            with self.assertRaisesRegex(publish.PublishError, "DO NOT retry POST automatically"):
                publish.api_call("POST", "", SECRET, data={})
        self.assertEqual(opener.open.call_count, 1)
        self.assertNotIn(SECRET, publish.safe_error(f"foo {SECRET} bar", SECRET))

    def test_http400_invalid_version_is_structured_and_scrubbed(self):
        import urllib.error
        from unittest.mock import Mock
        body = ('{"type":"error","error":"invalid_version",'
                '"message":"versionCode duplicate"}').encode()
        error = urllib.error.HTTPError(publish.API + "commit/", 400,
                                      "Bad Request", {}, io.BytesIO(body))
        opener = Mock()
        opener.open.side_effect = error
        with patch.object(publish.urllib.request, "build_opener", return_value=opener):
            with self.assertRaises(publish.PublishError) as exc:
                publish.api_call("POST", "commit/", SECRET, data={})
        self.assertIn("invalid_version", str(exc.exception))
        self.assertIn("increase", str(exc.exception))
        self.assertNotIn(SECRET, str(exc.exception))
        self.assertEqual(opener.open.call_count, 1)

    def test_draft_identity_can_be_verified_without_mutating_another_release(self):
        for response in [
            {"type": "success", "release": {}},
            {"type": "success", "data": {"release": {"id": 81}}},
        ]:
            with patch.object(publish, "api_call", side_effect=[
                response, {"type": "not-exists"}, {"type": "not-exists"}]) as mock:
                if not publish.draft_id(response):
                    with self.assertRaisesRegex(publish.PublishError, "identify"):
                        publish.preflight(SECRET, resume=True, expected_id="81",
                                          name="0.4.1", code=12)
                else:
                    publish.preflight(SECRET, resume=True, expected_id="81",
                                      name="0.4.1", code=12)
                self.assertTrue(all(c.args[0] == "GET" for c in mock.call_args_list))


if __name__ == "__main__":
    unittest.main()
