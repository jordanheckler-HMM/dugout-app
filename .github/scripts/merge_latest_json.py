#!/usr/bin/env python3
"""Rebuild latest.json so every platform from a matrix release is listed.

tauri-action uploads latest.json from each matrix job. Those uploads race and
can drop platforms. This script runs after every job has uploaded its updater
artifacts and signature files, then replaces latest.json with a complete
manifest.
"""

from __future__ import annotations

import json
import os
import re
import sys
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

REQUIRED_PLATFORMS = (
    "darwin-aarch64",
    "darwin-x86_64",
    "linux-x86_64",
    "windows-x86_64",
)

# Match tauri-action's default (updaterJsonPreferNsis: false): the legacy
# windows-x86_64 entry points at the MSI updater bundle when both exist.
WINDOWS_PRIMARY_PREFERENCE = ("msi", "nsis")


def release_download_url(url: str, tag: str) -> str:
    """Draft uploads use an untagged URL that stops working once published."""
    encoded_tag = urllib.parse.quote(tag, safe="")
    return re.sub(r"/download/untagged-[^/]+/", f"/download/{encoded_tag}/", url)


def classify_signature(name: str) -> tuple[str, str] | None:
    """Map an uploaded .sig asset name to (platform, installer).

    Tauri 2.9 uploads the updater signature beside the installer itself
    (``Dugout_0.1.6_amd64.AppImage.sig``, ``*.msi.sig``, ``*-setup.exe.sig``).
    Older layouts used a zipped updater archive (``*.AppImage.tar.gz.sig``,
    ``*.msi.zip.sig``, ``*.nsis.zip.sig``). Longer suffixes are checked first
    so a zipped name is not classified as the shorter installer suffix.
    """
    if name.endswith(".app.tar.gz.sig"):
        if "aarch64" in name:
            return "darwin-aarch64", "app"
        if "x64" in name or "x86_64" in name:
            return "darwin-x86_64", "app"
        return None
    if name.endswith(".AppImage.tar.gz.sig") or name.endswith(".AppImage.sig"):
        return "linux-x86_64", "appimage"
    if name.endswith(".deb.sig"):
        return "linux-x86_64", "deb"
    if name.endswith(".msi.zip.sig") or name.endswith(".msi.sig"):
        return "windows-x86_64", "msi"
    if name.endswith(".nsis.zip.sig") or name.endswith(".exe.sig"):
        return "windows-x86_64", "nsis"
    return None


def legacy_platform_keys(classified: list[tuple[str, str]]) -> set[str]:
    """Return the platform keys a set of (platform, installer) pairs would fill.

    Mirrors ``build_platforms`` without talking to GitHub: the legacy
    ``linux-x86_64`` entry follows the AppImage, and ``windows-x86_64``
    prefers the MSI.
    """
    keys: set[str] = set()
    windows: set[str] = set()
    for platform, installer in classified:
        keys.add(f"{platform}-{installer}")
        if platform == "windows-x86_64":
            windows.add(installer)
        elif installer != "deb":
            keys.add(platform)
    for installer in WINDOWS_PRIMARY_PREFERENCE:
        if installer in windows:
            keys.add("windows-x86_64")
            break
    return keys


def self_test() -> int:
    cases = {
        "Dugout_aarch64.app.tar.gz.sig": ("darwin-aarch64", "app"),
        "Dugout_x64.app.tar.gz.sig": ("darwin-x86_64", "app"),
        "Dugout_0.1.6_amd64.AppImage.tar.gz.sig": ("linux-x86_64", "appimage"),
        "Dugout_0.1.6_amd64.AppImage.sig": ("linux-x86_64", "appimage"),
        "Dugout_0.1.6_amd64.deb.sig": ("linux-x86_64", "deb"),
        "Dugout_0.1.6_x64_en-US.msi.zip.sig": ("windows-x86_64", "msi"),
        "Dugout_0.1.6_x64_en-US.msi.sig": ("windows-x86_64", "msi"),
        "Dugout_0.1.6_x64-setup.nsis.zip.sig": ("windows-x86_64", "nsis"),
        "Dugout_0.1.6_x64-setup.exe.sig": ("windows-x86_64", "nsis"),
    }
    for name, expected in cases.items():
        got = classify_signature(name)
        if got != expected:
            print(f"{name}: {got} != {expected}", file=sys.stderr)
            return 1
    if classify_signature("latest.json") is not None:
        print("latest.json should not classify as an updater signature", file=sys.stderr)
        return 1
    rewritten = release_download_url(
        "https://github.com/example/app/releases/download/untagged-abc123/Dugout.dmg",
        "v0.1.6-rc.1",
    )
    if rewritten != "https://github.com/example/app/releases/download/v0.1.6-rc.1/Dugout.dmg":
        print(rewritten, file=sys.stderr)
        return 1

    # Names uploaded by the v0.1.6-rc.4 matrix (unzipped updater signatures).
    rc4_names = [
        "Dugout_aarch64.app.tar.gz.sig",
        "Dugout_x64.app.tar.gz.sig",
        "Dugout_0.1.6_amd64.AppImage.sig",
        "Dugout_0.1.6_amd64.deb.sig",
        "Dugout_0.1.6_x64_en-US.msi.sig",
        "Dugout_0.1.6_x64-setup.exe.sig",
    ]
    classified: list[tuple[str, str]] = []
    for name in rc4_names:
        item = classify_signature(name)
        if item is None:
            print(f"rc.4 signature did not classify: {name}", file=sys.stderr)
            return 1
        classified.append(item)
    keys = legacy_platform_keys(classified)
    missing = [name for name in REQUIRED_PLATFORMS if name not in keys]
    if missing:
        print(f"rc.4 layout missing platforms: {missing}", file=sys.stderr)
        return 1
    print("self-test ok")
    return 0


class GitHub:
    def __init__(self, token: str, repository: str) -> None:
        self.token = token
        self.repository = repository

    def request(
        self,
        url: str,
        method: str = "GET",
        data: bytes | None = None,
        accept: str = "application/vnd.github+json",
        content_type: str | None = None,
    ) -> tuple[int, bytes]:
        headers = {
            "Authorization": f"Bearer {self.token}",
            "Accept": accept,
            "X-GitHub-Api-Version": "2022-11-28",
            "User-Agent": "dugout-release-latest-json",
        }
        if content_type:
            headers["Content-Type"] = content_type
        request = urllib.request.Request(url, data=data, method=method, headers=headers)
        try:
            with urllib.request.urlopen(request) as response:
                return response.status, response.read()
        except urllib.error.HTTPError as exc:
            detail = exc.read().decode("utf-8", "replace")
            raise SystemExit(f"GitHub API {exc.code} {method} {url}: {detail}") from exc

    def json_request(self, url: str, method: str = "GET", payload: dict | None = None) -> dict:
        data = None if payload is None else json.dumps(payload).encode()
        content_type = None if payload is None else "application/json"
        _status, body = self.request(url, method=method, data=data, content_type=content_type)
        if not body:
            return {}
        return json.loads(body.decode())

    def release_by_tag(self, tag: str) -> dict:
        return self.json_request(
            f"https://api.github.com/repos/{self.repository}/releases/tags/{tag}"
        )

    def list_assets(self, release_id: int) -> list[dict]:
        assets: list[dict] = []
        page = 1
        while True:
            batch = self.json_request(
                "https://api.github.com/repos/"
                f"{self.repository}/releases/{release_id}/assets?per_page=100&page={page}"
            )
            if not isinstance(batch, list):
                raise SystemExit("Unexpected GitHub assets response")
            assets.extend(batch)
            if len(batch) < 100:
                return assets
            page += 1

    def download_asset(self, asset: dict) -> bytes:
        _status, body = self.request(
            asset["url"],
            accept="application/octet-stream",
        )
        return body

    def delete_asset(self, asset_id: int) -> None:
        self.request(
            f"https://api.github.com/repos/{self.repository}/releases/assets/{asset_id}",
            method="DELETE",
        )

    def upload_asset(self, upload_url: str, name: str, body: bytes) -> None:
        endpoint = upload_url.split("{", 1)[0]
        self.request(
            f"{endpoint}?name={name}",
            method="POST",
            data=body,
            content_type="application/json",
        )


def build_platforms(github: GitHub, assets: list[dict]) -> dict[str, dict[str, str]]:
    by_name = {asset["name"]: asset for asset in assets}
    platforms: dict[str, dict[str, str]] = {}
    windows: dict[str, dict[str, str]] = {}

    for asset in assets:
        classified = classify_signature(asset["name"])
        if classified is None:
            continue
        platform, installer = classified
        bundle_name = asset["name"][: -len(".sig")]
        bundle = by_name.get(bundle_name)
        if bundle is None:
            print(f"Missing updater bundle for {asset['name']}", file=sys.stderr)
            continue
        signature = github.download_asset(asset).decode("utf-8")
        entry = {
            "signature": signature,
            "url": release_download_url(bundle["browser_download_url"], os.environ["RELEASE_TAG"]),
        }
        platforms[f"{platform}-{installer}"] = entry
        if platform == "windows-x86_64":
            windows[installer] = entry
        elif installer != "deb":
            # The legacy linux/darwin key tracks the updater archive. A .deb
            # signature is recorded only under linux-x86_64-deb.
            platforms[platform] = entry

    for installer in WINDOWS_PRIMARY_PREFERENCE:
        if installer in windows:
            platforms["windows-x86_64"] = windows[installer]
            break
    return platforms


def app_version(repo_root: Path) -> str:
    config_path = repo_root / "dugout-lineup-manager-main" / "src-tauri" / "tauri.conf.json"
    return json.loads(config_path.read_text(encoding="utf-8"))["version"]


def main() -> int:
    if "--self-test" in sys.argv:
        return self_test()

    token = os.environ["GITHUB_TOKEN"]
    repository = os.environ["GITHUB_REPOSITORY"]
    tag = os.environ["RELEASE_TAG"]
    repo_root = Path(os.environ.get("GITHUB_WORKSPACE", Path.cwd()))

    github = GitHub(token, repository)
    release = github.release_by_tag(tag)
    assets = github.list_assets(release["id"])
    platforms = build_platforms(github, assets)

    missing = [name for name in REQUIRED_PLATFORMS if name not in platforms]
    if missing:
        print("latest.json is missing platforms: " + ", ".join(missing), file=sys.stderr)
        print("Release assets: " + ", ".join(sorted(asset["name"] for asset in assets)), file=sys.stderr)
        return 1

    manifest = {
        "version": app_version(repo_root),
        "notes": release.get("body") or "",
        "pub_date": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "platforms": platforms,
    }
    payload = json.dumps(manifest, indent=2).encode() + b"\n"
    (repo_root / "latest.json").write_bytes(payload)

    existing = next((asset for asset in assets if asset["name"] == "latest.json"), None)
    if existing:
        github.delete_asset(existing["id"])
    github.upload_asset(release["upload_url"], "latest.json", payload)
    print(json.dumps({key: platforms[key]["url"] for key in REQUIRED_PLATFORMS}, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
