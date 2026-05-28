#!/usr/bin/env python3

"""
fetch_posts.py — Instagram Graph API fetcher for @songs.by.sage

─────────────────────────────────────────────────────────────────
Runs daily via GitHub Actions.

1. Refreshes the long-lived access token (valid 60 days)
2. Fetches all recent posts from the Instagram Graph API
3. Filters to ONLY posts tagged #original-song or #cover-song
   — all other posts (performances, general content, etc.) are excluded
4. Downloads cover thumbnails to music/songs/images/<id>.jpg
5. Writes music/songs/posts.json with a 'type' field on each post
   ('original' or 'cover')

Tagging convention for @songs.by.sage Instagram posts:
  #original-song  → appears in the Originals section of the songs page
  #cover-song     → appears in the Covers section of the songs page
  (no tag)        → excluded from the songs page entirely
"""

import os
import json
import sys
import requests
from pathlib import Path
from datetime import datetime, timezone

# ── Config ────────────────────────────────────────────────────────────────────

ACCESS_TOKEN = os.environ.get("INSTAGRAM_ACCESS_TOKEN", "").strip()
if not ACCESS_TOKEN:
    sys.exit("ERROR: INSTAGRAM_ACCESS_TOKEN env var is not set.")

API_BASE  = "https://graph.instagram.com/v18.0"
FIELDS    = "id,caption,media_type,media_url,thumbnail_url,permalink,timestamp"
MAX_POSTS = 50

# ── Paths — updated from docs/ to music/songs/ ────────────────────────────────
ROOT     = Path(__file__).parent.parent
IMG_DIR  = ROOT / "music" / "songs" / "images"
JSON_OUT = ROOT / "music" / "songs" / "posts.json"

# ── Hashtag constants ─────────────────────────────────────────────────────────
TAG_ORIGINAL = "#original-song"
TAG_COVER    = "#cover-song"


# ── Token refresh ─────────────────────────────────────────────────────────────

def refresh_token(token: str) -> str:
    """
    Refresh a long-lived IG token. Writes NEW_ACCESS_TOKEN to GITHUB_ENV so
    the workflow can update the Actions secret automatically.
    """
    r = requests.get(
        f"{API_BASE}/refresh_access_token",
        params={"grant_type": "ig_refresh_token", "access_token": token},
        timeout=15,
    )
    r.raise_for_status()
    new = r.json().get("access_token", token)

    gh_env = os.environ.get("GITHUB_ENV")
    if gh_env and new != token:
        with open(gh_env, "a") as f:
            f.write(f"NEW_ACCESS_TOKEN={new}\n")
        print("✓ Access token refreshed — secret will be updated.")
    else:
        print("✓ Access token still fresh.")

    return new


# ── Media fetch ───────────────────────────────────────────────────────────────

def fetch_all_media(token: str) -> list[dict]:
    """Paginate through /me/media until we have MAX_POSTS or run out."""
    posts  = []
    url    = f"{API_BASE}/me/media"
    params = {"fields": FIELDS, "access_token": token, "limit": 25}

    while url and len(posts) < MAX_POSTS:
        r = requests.get(url, params=params, timeout=15)
        r.raise_for_status()
        data = r.json()
        posts.extend(data.get("data", []))
        # Paginate
        url    = data.get("paging", {}).get("next")
        params = {}  # next URL already has params baked in

    return posts[:MAX_POSTS]


# ── Hashtag filter ────────────────────────────────────────────────────────────

def get_post_type(post: dict) -> str | None:
    """
    Return 'original', 'cover', or None.

    Rules:
      - Caption must contain #original-song → 'original'
      - Caption must contain #cover-song    → 'cover'
      - Neither tag present                 → None (excluded from songs page)
      - If both tags present (shouldn't happen), 'original' wins
    """
    caption = (post.get("caption") or "").lower()
    if TAG_ORIGINAL in caption:
        return "original"
    if TAG_COVER in caption:
        return "cover"
    return None


# ── Thumbnail download ────────────────────────────────────────────────────────

def download_thumbnail(post: dict, img_dir: Path) -> str | None:
    """
    Download the thumbnail for a post and return the relative path.
    For VIDEO posts use thumbnail_url; for IMAGE/CAROUSEL use media_url.
    Returns None if download fails.
    """
    media_type = post.get("media_type", "")
    img_url = (
        post.get("thumbnail_url")   # VIDEO
        if media_type == "VIDEO"
        else post.get("media_url")  # IMAGE / CAROUSEL_ALBUM
    )

    if not img_url:
        return None

    dest = img_dir / f"{post['id']}.jpg"

    # Skip if already downloaded
    if dest.exists():
        return f"images/{post['id']}.jpg"

    try:
        r = requests.get(img_url, timeout=20, stream=True)
        r.raise_for_status()
        with open(dest, "wb") as f:
            for chunk in r.iter_content(chunk_size=8192):
                f.write(chunk)
        print(f"  ↓ Downloaded thumbnail for {post['id']}")
        return f"images/{post['id']}.jpg"
    except Exception as e:
        print(f"  ✗ Failed to download thumbnail for {post['id']}: {e}")
        return None


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    print("=" * 60)
    print("fetch_posts.py — Songs by Sage IG sync")
    print("=" * 60)

    # 1. Refresh token
    token = refresh_token(ACCESS_TOKEN)

    # 2. Fetch all recent media
    print(f"\nFetching up to {MAX_POSTS} posts from Instagram...")
    all_posts = fetch_all_media(token)
    print(f"  Found {len(all_posts)} total posts on Instagram.")

    # 3. Filter to tagged posts only
    IMG_DIR.mkdir(parents=True, exist_ok=True)
    tagged_posts = []
    skipped = 0

    for post in all_posts:
        post_type = get_post_type(post)

        if post_type is None:
            skipped += 1
            continue  # Not a song post — skip entirely

        print(f"  ✓ [{post_type.upper()}] {post['id'][:12]}… — {post.get('timestamp','')[:10]}")

        # 4. Download thumbnail
        thumb_path = download_thumbnail(post, IMG_DIR)

        tagged_posts.append({
            "id":         post["id"],
            "type":       post_type,           # ← NEW: 'original' or 'cover'
            "caption":    post.get("caption"),
            "media_type": post.get("media_type"),
            "permalink":  post.get("permalink"),
            "timestamp":  post.get("timestamp"),
            "thumbnail":  thumb_path,
            "fetched_at": datetime.now(timezone.utc).isoformat(),
        })

    print(f"\n  Included: {len(tagged_posts)} song posts")
    print(f"  Skipped:  {skipped} non-song posts (no #original-song or #cover-song tag)")

    # 5. Write posts.json
    JSON_OUT.parent.mkdir(parents=True, exist_ok=True)
    with open(JSON_OUT, "w") as f:
        json.dump(tagged_posts, f, indent=2)
    print(f"\n✓ Written {JSON_OUT}")
    print("=" * 60)


if __name__ == "__main__":
    main()