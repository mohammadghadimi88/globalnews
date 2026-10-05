"""
GlobalNews Pipeline Orchestrator
Fetches, normalizes, deduplicates, categorizes, filters retention, ranks, and outputs data/news.json.
"""

import json
import os
import sys
from datetime import datetime, timezone, timedelta
from typing import List, Dict, Any

from fetch_feeds import fetch_source_feeds
from normalize import normalize_story
from deduplicate import deduplicate_stories
from categorize import classify_story

DEFAULT_RETENTION_HOURS = 48
DATA_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "data"))
SOURCES_FILE = os.path.join(DATA_DIR, "sources.json")
OUTPUT_FILE = os.path.join(DATA_DIR, "news.json")

def load_sources(file_path: str) -> List[Dict[str, Any]]:
    """Load sources registry."""
    if not os.path.exists(file_path):
        print(f"[ERROR] Sources file not found at {file_path}")
        return []
    with open(file_path, "r", encoding="utf-8") as f:
        return json.load(f)

def filter_by_retention(stories: List[Dict[str, Any]], hours: int = DEFAULT_RETENTION_HOURS) -> List[Dict[str, Any]]:
    """Keep stories within the retention window."""
    cutoff = datetime.now(timezone.utc) - timedelta(hours=hours)
    valid_stories = []
    for s in stories:
        pub_str = s.get("publishedAt")
        if not pub_str:
            valid_stories.append(s)
            continue
        try:
            pub_dt = datetime.strptime(pub_str, "%Y-%m-%dT%H:%M:%SZ").replace(tzinfo=timezone.utc)
            if pub_dt >= cutoff:
                valid_stories.append(s)
        except Exception:
            valid_stories.append(s)
    return valid_stories

def compute_ranking_score(story: Dict[str, Any], now_utc: datetime) -> float:
    """
    Compute editorial ranking score for Top Stories.
    Factors:
    - Source priority (0 - 100)
    - Freshness / Recency decay (half-life of 12 hours)
    - Importance of category
    """
    priority = story.get("priority", 50)
    pub_str = story.get("publishedAt", "")
    age_hours = 0.0
    try:
        pub_dt = datetime.strptime(pub_str, "%Y-%m-%dT%H:%M:%SZ").replace(tzinfo=timezone.utc)
        age_seconds = max(0, (now_utc - pub_dt).total_seconds())
        age_hours = age_seconds / 3600.0
    except Exception:
        age_hours = 12.0

    # Freshness factor: decays with age
    freshness = 1.0 / (1.0 + (age_hours / 12.0))

    # Priority weight
    priority_factor = priority / 100.0

    # Headline strength (penalize extremely short headlines)
    title_len = len(story.get("title", ""))
    headline_factor = 1.0 if 30 <= title_len <= 140 else 0.85

    score = (priority_factor * 0.55 + freshness * 0.45) * headline_factor * 100.0
    return round(score, 2)

def run_collector(retention_hours: int = DEFAULT_RETENTION_HOURS, max_stories: int = 500):
    print("=" * 60)
    print("Starting GlobalNews Collector Pipeline...")
    print(f"Sources file: {SOURCES_FILE}")
    print(f"Output target: {OUTPUT_FILE}")
    print(f"Retention window: {retention_hours} hours")
    print("=" * 60)

    sources = load_sources(SOURCES_FILE)
    enabled_sources = [s for s in sources if s.get("enabled", False)]
    print(f"Loaded {len(sources)} sources. Active/enabled sources: {len(enabled_sources)}")

    total_feeds = sum(len(s.get("feeds", [])) for s in enabled_sources)
    feeds_processed = 0
    feeds_successful = 0
    feeds_failed = 0
    raw_collected_items = []

    for source in enabled_sources:
        source_name = source.get("name", "Unknown")
        feeds = source.get("feeds", [])
        if not feeds:
            continue

        print(f"Fetching feeds for {source_name} ({len(feeds)} feeds)...")
        for feed_url in feeds:
            feeds_processed += 1
            try:
                items = fetch_source_feeds({**source, "feeds": [feed_url]})
                if items:
                    feeds_successful += 1
                    raw_collected_items.extend(items)
                else:
                    feeds_failed += 1
            except Exception as e:
                feeds_failed += 1
                print(f"  [WARN] Feed failed ({feed_url}): {e}")

    print(f"\nFeeds processed: {feeds_processed}")
    print(f"Successful: {feeds_successful}")
    print(f"Failed: {feeds_failed}")
    print(f"Raw items gathered: {len(raw_collected_items)}")

    # 1. Normalize
    normalized_stories = []
    for raw_item in raw_collected_items:
        norm = normalize_story(raw_item)
        if norm:
            normalized_stories.append(norm)

    print(f"Normalized valid stories: {len(normalized_stories)}")

    # 2. Deduplicate
    unique_stories, duplicates_count = deduplicate_stories(normalized_stories)
    print(f"Duplicates removed: {duplicates_count}")
    print(f"Unique stories after deduplication: {len(unique_stories)}")

    # 3. Categorize & Tag
    final_stories = []
    now_utc = datetime.now(timezone.utc)

    for item in unique_stories:
        cat, subcat, region, country, tags = classify_story(
            item["title"], item["summary"], item
        )
        item["category"] = cat
        item["subcategory"] = subcat
        item["region"] = region
        item["country"] = country
        item["tags"] = tags
        item["rankScore"] = compute_ranking_score(item, now_utc)
        final_stories.append(item)

    # 4. Merge with the previous dataset so one broken publisher does not
    # wipe otherwise healthy stories from the live terminal.
    existing_stories = []
    if os.path.exists(OUTPUT_FILE):
        try:
            with open(OUTPUT_FILE, "r", encoding="utf-8") as f:
                previous = json.load(f)
            if isinstance(previous, list):
                existing_stories = previous
        except Exception as e:
            print(f"[WARN] Could not read previous news.json: {e}")

    if existing_stories:
        merged, merge_duplicates = deduplicate_stories(final_stories + existing_stories)
        final_stories = merged
        print(f"Previous dataset merged; duplicates removed during merge: {merge_duplicates}")

    # 5. Filter by retention
    final_stories = filter_by_retention(final_stories, retention_hours)

    # 6. Sort chronologically (newest first)
    final_stories.sort(key=lambda s: s.get("publishedAt", ""), reverse=True)

    # Cap to max_stories
    if len(final_stories) > max_stories:
        final_stories = final_stories[:max_stories]

    print(f"Stories within retention window: {len(final_stories)}")

    # If every feed failed, preserve the last good dataset instead of publishing
    # an empty or severely degraded feed.
    if len(final_stories) == 0 and existing_stories:
        print("[INFO] No usable stories fetched. Preserving existing news.json.")
        return

    # Write output
    os.makedirs(DATA_DIR, exist_ok=True)
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(final_stories, f, indent=2, ensure_ascii=False)

    print("\n" + "=" * 60)
    print(f"PIPELINE COMPLETE")
    print(f"Feeds processed: {feeds_processed}")
    print(f"Successful: {feeds_successful}")
    print(f"Failed: {feeds_failed}")
    print(f"Stories collected: {len(final_stories)}")
    print(f"Duplicates removed: {duplicates_count}")
    print(f"Saved: {OUTPUT_FILE}")
    print("=" * 60)

if __name__ == "__main__":
    retention = DEFAULT_RETENTION_HOURS
    if len(sys.argv) > 1:
        try:
            retention = int(sys.argv[1])
        except ValueError:
            pass
    run_collector(retention_hours=retention)
