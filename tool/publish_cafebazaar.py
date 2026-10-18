#!/usr/bin/env python3
"""Manually submit a DoodleGame signed APK through Cafe Bazaar's Pishkhan API.

Read-only preflight is separated from the three non-retryable POST operations.
No network operation occurs unless the operator dispatches the publishing workflow.
"""
from __future__ import annotations

import argparse
import hashlib
import html
import json
import os
from pathlib import Path
import re
import sys
import urllib.error
import urllib.request
import uuid

from cafebazaar_version import APP_NAME, PACKAGE, read_version

API = "https://api.pishkhan.cafebazaar.ir/v1/apps/releases/"
DASHBOARD = "https://pishkhan.cafebazaar.ir/"
CODE_KEYS = frozenset({"version_code", "versionCode", "package_version_code", "packageVersionCode"})
NAME_KEYS = frozenset({"version_name", "versionName", "package_version_name", "packageVersionName"})
SECRET_HEADER = "CAFEBAZAAR-PISHKHAN-API-SECRET"


class PublishError(Exception):
    pass


class NoRedirects(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


def safe_error(value: object, secret: str = "") -> str:
    """Allow only bounded structured provider diagnostics, never raw headers/body."""
    if not isinstance(value, (str, int, float, bool, dict, list)):
        return ""
    raw = json.dumps(value, ensure_ascii=False) if not isinstance(value, str) else value
    if secret:
        raw = raw.replace(secret, "[REDACTED]")
    raw = re.sub(r"(?i)(authorization|token|api[_-]?secret|password|keystore)([^\s,;}]{0,25})",
                 "[REDACTED]", raw)
    return " ".join(raw.split())[:480]


def api_call(method: str, endpoint: str, secret: str,
             *, data: dict | None = None, apk: Path | None = None) -> dict:
    if data is not None and apk is not None:
        raise PublishError("Refusing mixed JSON and APK body.")
    if method not in {"GET", "POST"} or endpoint not in {
        "", "last-uncommitted/", "last-committed/", "last-published/", "upload/", "commit/"
    }:
        raise PublishError("Unexpected Pishkhan endpoint or HTTP verb.")
    headers = {SECRET_HEADER: secret, "Accept": "application/json",
               "User-Agent": "DoodleGame-manual-cafebazaar/1.0"}
    body = None
    if data is not None:
        body = json.dumps(data, ensure_ascii=False).encode("utf-8")
        headers["Content-Type"] = "application/json"
    if apk is not None:
        boundary = "doodlegame-" + uuid.uuid4().hex
        prefix = (
            f"--{boundary}\r\n"
            'Content-Disposition: form-data; name="architecture"\r\n\r\n'
            "all\r\n"
            f"--{boundary}\r\n"
            'Content-Disposition: form-data; name="apk"; filename="app-release.apk"\r\n'
            "Content-Type: application/vnd.android.package-archive\r\n\r\n"
        ).encode("ascii")
        suffix = f"\r\n--{boundary}--\r\n".encode("ascii")
        body = prefix + apk.read_bytes() + suffix
        headers["Content-Type"] = f"multipart/form-data; boundary={boundary}"
    request = urllib.request.Request(API + endpoint, data=body, headers=headers, method=method)
    opener = urllib.request.build_opener(NoRedirects)
    try:
        with opener.open(request, timeout=300 if apk else 45) as response:
            payload = response.read(1024 * 256)
    except urllib.error.HTTPError as exc:
        snippet = exc.read(8192)
        detail = ""
        try:
            decoded = json.loads(snippet)
            if isinstance(decoded, dict):
                allowed = {k: decoded[k] for k in ("type", "message", "detail", "error", "errors")
                           if k in decoded}
                detail = safe_error(allowed, secret)
        except (ValueError, UnicodeError):
            pass
        hint = (
            " invalid_version: increase both source versionName and versionCode above "
            "the entire Bazaar submission history."
            if "invalid_version" in detail.lower() else ""
        )
        raise PublishError(f"Pishkhan {method} {endpoint or 'create'} HTTP {exc.code}: "
                           f"{detail or 'No structured validation details.'}{hint}") from None
    except (OSError, urllib.error.URLError) as exc:
        raise PublishError(f"Network outcome unknown for Pishkhan {method} {endpoint or 'create'}. "
                           "DO NOT retry POST automatically; inspect last-uncommitted and the "
                           "Bazaar dashboard before a new dispatch.") from None
    try:
        result = json.loads(payload)
    except (ValueError, UnicodeError) as exc:
        raise PublishError(f"Pishkhan {endpoint or 'create'} returned invalid JSON; inspect the "
                           "dashboard before retrying a POST.") from exc
    if not isinstance(result, dict):
        raise PublishError("Pishkhan response must be a JSON object.")
    return result


def require_success(phase: str, result: dict, secret: str) -> None:
    if result.get("type") != "success":
        info = {k: result[k] for k in ("type", "message", "detail", "error", "errors") if k in result}
        raise PublishError(f"Pishkhan {phase} rejected the operation: {safe_error(info, secret)}")


def release_object(response: dict) -> dict:
    for key in ("release", "data", "result"):
        obj = response.get(key)
        if isinstance(obj, dict):
            if "release" in obj and isinstance(obj["release"], dict):
                return obj["release"]
            return obj
    return response


def draft_id(response: dict) -> str:
    obj = release_object(response)
    for key in ("id", "release_id", "releaseId"):
        value = obj.get(key)
        if isinstance(value, (str, int)) and str(value).strip() and str(value) != "0":
            return str(value)
    return ""


def field(response: dict, names: frozenset[str]) -> str | None:
    # Only inspect the confirmed version's object, not unrelated nested errors.
    obj = release_object(response)
    for source in [obj, obj.get("apk"), obj.get("package"), obj.get("version")]:
        if not isinstance(source, dict):
            continue
        for key in names:
            value = source.get(key)
            if isinstance(value, (str, int)) and str(value).strip():
                return str(value)
    return None


def check_history(secret: str, name: str, code: int) -> None:
    for label in ("last-committed/", "last-published/"):
        last = api_call("GET", label, secret)
        status = last.get("type")
        if status == "not-exists":
            continue
        require_success(label, last, secret)
        old_code = field(last, CODE_KEYS)
        old_name = field(last, NAME_KEYS)
        if old_code:
            try:
                old_num = int(old_code)
            except ValueError:
                raise PublishError(f"Unrecognized {label} versionCode; verify manually.")
            if code <= old_num:
                raise PublishError(f"versionCode {code} must exceed Bazaar {label} versionCode "
                                   f"{old_num}. Edit the committed version ledger first.")
        if old_name:
            from cafebazaar_version import numeric_version
            if numeric_version(name) <= numeric_version(old_name):
                raise PublishError(f"versionName {name} must exceed Bazaar {label} versionName "
                                   f"{old_name}. Edit package.json and the version ledger.")
        if not old_code or not old_name:
            print(f"::notice::Pishkhan {label} omitted comparable version metadata. "
                  "The operator-maintained highestPreviouslySubmittedVersionCode and "
                  "previousVersionName in the committed ledger remain mandatory.")


def preflight(secret: str, *, resume: bool, expected_id: str, name: str, code: int) -> tuple[str, str]:
    existing = api_call("GET", "last-uncommitted/", secret)
    state = existing.get("type")
    if resume:
        if state != "success":
            raise PublishError("resume_existing_draft=true but Bazaar has no confirmed uncommitted draft.")
        found_id = draft_id(existing)
        if not expected_id or not found_id:
            raise PublishError("Resume requires a nonempty expected_draft_id matching a Bazaar draft ID; "
                               "cannot safely identify an unrelated draft.")
        if found_id != expected_id:
            raise PublishError("Draft ID mismatch: Bazaar draft is NOT the manually confirmed release. "
                               "No upload was attempted.")
        package = field(existing, frozenset({"package_name", "packageName", "application_id", "app_id"}))
        if package and package != PACKAGE:
            raise PublishError("Existing draft targets the wrong Android package.")
        old_code, old_name = field(existing, CODE_KEYS), field(existing, NAME_KEYS)
        if old_code is not None and old_code != str(code):
            raise PublishError("Existing draft versionCode is different from the prepared APK.")
        if old_name is not None and old_name != name:
            raise PublishError("Existing draft versionName is different from the prepared APK.")
        print(f"Resume authorized for explicitly matched draft ID {safe_error(found_id)}.")
    else:
        if state != "not-exists":
            if state == "success":
                raise PublishError("An uncommitted draft already exists. Do not create a new draft. "
                                   "Inspect it in Pishkhan; use resume_existing_draft and "
                                   "expected_draft_id only for that exact draft.")
            raise PublishError("Uncommitted draft state is ambiguous; refusing to create a release.")
        if expected_id:
            raise PublishError("expected_draft_id is allowed only with resume_existing_draft=true.")
    check_history(secret, name, code)
    return state, draft_id(existing) if state == "success" else ""


def append_summary(name: str, code: int, sha: str, digest: str, fa: str, en: str,
                   status: str, draft: str = "") -> None:
    path = os.environ.get("GITHUB_STEP_SUMMARY")
    if not path:
        return
    def clean(s: str) -> str:
        return html.escape(s, quote=True).replace("\n", "<br>")
    with open(path, "a", encoding="utf-8") as file:
        file.write(
            "## Cafe Bazaar — DoodleGame release\n\n"
            f"- App: **{APP_NAME}**\n"
            f"- Package: \`{PACKAGE}\`\n"
            f"- versionName: \`{clean(name)}\`\n"
            f"- versionCode: \`{code}\`\n"
            f"- Commit: \`{clean(sha)}\`\n"
            f"- APK SHA-256: \`{clean(digest)}\`\n"
            f"- Status: **{clean(status)}**\n"
            f"- Draft ID: \`{clean(draft or '—')}\`\n"
            "- Rollout requested: **100% after Bazaar review and approval**\n"
            f"- [Cafe Bazaar Pishkhan]({DASHBOARD})\n\n"
            f"**توضیحات فارسی:** {clean(fa)}\n\n"
            f"**English notes:** {clean(en or '—')}\n\n"
            "Commit/submit acknowledgement is **not** evidence of live publication.\n"
        )


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--preflight", action="store_true", help="Read-only Bazaar checks, before APK build")
    parser.add_argument("--apk", type=Path)
    parser.add_argument("--resume-existing-draft", action="store_true")
    parser.add_argument("--expected-draft-id", default="")
    args = parser.parse_args()
    if args.preflight == bool(args.apk):
        raise PublishError("Provide exactly one of --preflight or --apk.")
    secret = os.environ.get("CAFEBAZAAR_PISHKHAN_API_SECRET", "").strip()
    if not secret:
        raise PublishError("Missing CAFEBAZAAR_PISHKHAN_API_SECRET.")
    fa = os.environ.get("CAFEBAZAAR_CHANGELOG_FA", "")
    en = os.environ.get("CAFEBAZAAR_CHANGELOG_EN", "")
    note = os.environ.get("CAFEBAZAAR_DEVELOPER_NOTE", "")
    if not fa.strip():
        raise PublishError("Manually supplied Persian release notes cannot be empty.")
    name, code = read_version()
    expected_id = args.expected_draft_id.strip()
    if not re.fullmatch(r"[A-Za-z0-9_-]{1,80}", expected_id or "x"):
        raise PublishError("Invalid draft ID format.")
    preflight(secret, resume=args.resume_existing_draft, expected_id=expected_id,
              name=name, code=code)
    if args.preflight:
        print("Read-only Bazaar preflight passed; NO draft created and NO APK uploaded.")
        return
    apk = args.apk
    if apk.name != "app-release.apk" or not apk.is_file() or not apk.stat().st_size:
        raise PublishError("Expected nonempty app-release.apk verified by the earlier signing gate.")
    digest = hashlib.file_digest(apk.open("rb"), "sha256").hexdigest()
    if digest != os.environ.get("CAFEBAZAAR_VERIFIED_APK_SHA256", "").lower():
        raise PublishError("APK changed since metadata/signature verification; refusing submission.")
    commit_sha = os.environ.get("GITHUB_SHA", "")
    if not re.fullmatch(r"[0-9a-f]{40}", commit_sha):
        raise PublishError("Missing immutable source commit SHA.")
    current_draft = expected_id
    try:
        if not args.resume_existing_draft:
            response = api_call("POST", "", secret, data={})
            require_success("create", response, secret)
            current_draft = draft_id(response)
            # Recording this ID makes a new operator-authorized resume possible.
            print(f"Created Bazaar draft ID: {safe_error(current_draft) or '(API omitted ID)'}")
            if not current_draft:
                raise PublishError("Create succeeded but no draft ID was returned. "
                                   "Inspect Pishkhan before retrying; no upload attempted.")
        uploaded = api_call("POST", "upload/", secret, apk=apk)
        require_success("APK upload", uploaded, secret)
        print(f"APK upload acknowledged for verified SHA-256 {digest}.")
        result = api_call("POST", "commit/", secret, data={
            "auto_publish": True,
            "staged_rollout_percentage": 100,
            "changelog_fa": fa,
            "changelog_en": en,
            "developer_note": note,
        })
        require_success("commit", result, secret)
        print("Cafe Bazaar accepted the review request; NOT necessarily published.")
        append_summary(name, code, commit_sha, digest, fa, en, "Submitted for Bazaar review",
                       current_draft)
    except PublishError:
        append_summary(name, code, commit_sha, digest, fa, en,
                       "Incomplete or uncertain — inspect Pishkhan before any retry", current_draft)
        raise


if __name__ == "__main__":
    try:
        main()
    except (PublishError, OSError, ValueError) as exc:
        print(f"::error::{safe_error(str(exc), os.environ.get('CAFEBAZAAR_PISHKHAN_API_SECRET', ''))}",
              file=sys.stderr)
        sys.exit(1)
