#!/usr/bin/env python3
"""Validate local markdown links resolve to files or directories in the repo."""

from __future__ import annotations

import re
import sys
from pathlib import Path
from urllib.parse import unquote

ROOT = Path(__file__).resolve().parents[2]
MARKDOWN_LINK_RE = re.compile(r"!?[^\[]*\[[^\]]*]\(([^)]+)\)")
EXCLUDED_DIRS = {".git", "node_modules", "venv", "venv311"}


def iter_markdown_files() -> list[Path]:
    files: list[Path] = []
    for path in ROOT.rglob("*.md"):
        if any(part in EXCLUDED_DIRS for part in path.parts):
            continue
        files.append(path)
    return files


def parse_link_target(raw_target: str) -> str | None:
    target = raw_target.strip()
    if not target:
        return None

    if target.startswith("<") and target.endswith(">"):
        target = target[1:-1].strip()

    # Drop optional markdown title: (path "title")
    title_match = re.match(r"(\S+)\s+['\"].*['\"]$", target)
    if title_match:
        target = title_match.group(1)

    if target.startswith(("http://", "https://", "mailto:", "tel:", "#")):
        return None

    target = target.split("#", 1)[0].split("?", 1)[0].strip()
    if not target:
        return None

    return unquote(target)


def resolve_target(markdown_file: Path, target: str) -> Path:
    if target.startswith("/"):
        return (ROOT / target.lstrip("/")).resolve()
    return (markdown_file.parent / target).resolve()


def main() -> int:
    errors: list[str] = []

    for markdown_file in iter_markdown_files():
        content = markdown_file.read_text(encoding="utf-8")
        for line_number, line in enumerate(content.splitlines(), start=1):
            for match in MARKDOWN_LINK_RE.finditer(line):
                parsed_target = parse_link_target(match.group(1))
                if not parsed_target:
                    continue

                resolved = resolve_target(markdown_file, parsed_target)
                if resolved.exists():
                    continue

                rel_file = markdown_file.relative_to(ROOT)
                errors.append(
                    f"{rel_file}:{line_number} -> missing link target "
                    f"'{parsed_target}'"
                )

    if errors:
        print("Markdown link check failed:")
        for error in errors:
            print(f"- {error}")
        return 1

    print("Markdown link check passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
