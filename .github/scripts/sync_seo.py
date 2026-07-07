#!/usr/bin/env python3
"""Sync title/meta-description into index.html and epk.html from content/seo.json.

The site's <helmet> block can't template meta/link/script tags (they're cloned into
<head> once, verbatim, by support.js's helmet compile()), so this runs as a CI step
instead: it reads the CMS-editable content/seo.json and rewrites the corresponding
static tags in the matching HTML file.
"""
import json
import re
import sys

SEO_JSON = "content/seo.json"

PAGES = [
    ("events", "index.html"),
    ("epk", "epk.html"),
]

TAG_PATTERNS = [
    (r"(<title>).*?(</title>)", "title", None),
    (r'(<meta name="description" content=")[^"]*(")', "description", None),
    (r'(<meta property="og:title" content=")[^"]*(")', "title", None),
    (r'(<meta property="og:description" content=")[^"]*(")', "description", None),
    (r'(<meta name="twitter:title" content=")[^"]*(")', "title", None),
    (r'(<meta name="twitter:description" content=")[^"]*(")', "description", None),
]


def sync_file(html_path, seo):
    title = (seo.get("title") or "").strip()
    description = (seo.get("description") or "").strip()
    if not title or not description:
        print(f"  skip {html_path}: seo.title or seo.description missing/empty")
        return False

    with open(html_path, encoding="utf-8") as f:
        html = f.read()

    original = html
    values = {"title": title, "description": description}
    for pattern, field, _ in TAG_PATTERNS:
        value = values[field]
        html = re.sub(pattern, lambda m: m.group(1) + value + m.group(2), html, count=1)

    if html != original:
        with open(html_path, "w", encoding="utf-8") as f:
            f.write(html)
        print(f"  updated {html_path}")
        return True

    print(f"  {html_path}: already in sync")
    return False


def main():
    with open(SEO_JSON, encoding="utf-8") as f:
        data = json.load(f)

    changed_any = False
    for page_key, html_path in PAGES:
        seo = data.get(page_key) or {}
        print(f"Syncing {SEO_JSON}:{page_key} -> {html_path}")
        if sync_file(html_path, seo):
            changed_any = True
    sys.exit(0)


if __name__ == "__main__":
    main()
