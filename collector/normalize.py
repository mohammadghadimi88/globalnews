"""
GlobalNews Data Normalizer
Strips markup, decodes HTML entities, normalizes timestamps to UTC ISO 8601,
validates URLs, trims summaries, and generates deterministic story IDs.
"""

import re
import html
import hashlib
from datetime import datetime, timezone
import email.utils
from typing import Dict, Any, Optional

HTML_TAG_RE = re.compile(r"<[^>]+>", re.IGNORECASE)
WHITESPACE_RE = re.compile(r"\s+")
URL_RE = re.compile(r"^https?://[^\s/$.?#].[^\s]*$", re.IGNORECASE)

def clean_text(raw_text: Optional[str]) -> str:
    """Strip HTML tags, unescape HTML entities, and normalize whitespace."""
    if not raw_text:
        return ""
    # Strip HTML tags
    no_html = HTML_TAG_RE.sub(" ", raw_text)
    # Unescape HTML entities (&quot;, &amp;, &#39;, &mdash;, etc.)
    unescaped = html.unescape(no_html)
    # Collapse multiple whitespace/newlines
    normalized = WHITESPACE_RE.sub(" ", unescaped).strip()
    return normalized

def truncate_summary(text: str, max_chars: int = 240) -> str:
    """Trim summary to a comfortable length at a clean word boundary."""
    if len(text) <= max_chars:
        return text
    truncated = text[:max_chars]
    last_space = truncated.rfind(" ")
    if last_space > 100:
        truncated = truncated[:last_space]
    return truncated.rstrip(".,;:- ") + "..."

def parse_datetime_to_utc(date_str: Optional[str]) -> str:
    """Parse various RSS/Atom date formats into ISO 8601 UTC string (YYYY-MM-DDTHH:MM:SSZ)."""
    now_utc = datetime.now(timezone.utc)
    if not date_str:
        return now_utc.strftime("%Y-%m-%dT%H:%M:%SZ")

    cleaned_date = date_str.strip()

    # 1. Try RFC 2822 / RFC 822 (standard RSS format)
    try:
        dt = email.utils.parsedate_to_datetime(cleaned_date)
        if dt is not None:
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
            return dt.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    except Exception:
        pass

    # 2. Try ISO 8601 (standard Atom format)
    iso_clean = cleaned_date.replace("Z", "+00:00")
    for fmt in (
        "%Y-%m-%dT%H:%M:%S%z",
        "%Y-%m-%dT%H:%M:%S.%f%z",
        "%Y-%m-%d %H:%M:%S%z",
        "%Y-%m-%dT%H:%M:%S",
        "%Y-%m-%d",
    ):
        try:
            dt = datetime.strptime(iso_clean, fmt)
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
            return dt.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
        except ValueError:
            continue

    # Fallback to current time
    return now_utc.strftime("%Y-%m-%dT%H:%M:%SZ")

def generate_story_id(url: str, title: str) -> str:
    """Create a deterministic, URL-grounded story ID."""
    clean_target = url.strip().lower()
    if not clean_target:
        clean_target = title.strip().lower()
    return "gn-" + hashlib.sha256(clean_target.encode("utf-8")).hexdigest()[:16]

def is_valid_url(url: str) -> bool:
    """Check if URL starts with http(s) and has a valid domain structure."""
    if not url or len(url) < 10:
        return False
    return bool(URL_RE.match(url.strip()))

def normalize_story(item: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Normalize raw feed item into standard data structure."""
    raw_title = item.get("title", "")
    title = clean_text(raw_title)
    if not title or len(title) < 5:
        return None

    raw_url = item.get("url", "").strip()
    if not is_valid_url(raw_url):
        return None

    summary = clean_text(item.get("summary", ""))
    summary = truncate_summary(summary)

    published_at = parse_datetime_to_utc(item.get("publishedAtRaw"))
    story_id = generate_story_id(raw_url, title)

    return {
        "id": story_id,
        "title": title,
        "source": item.get("source", "Unknown"),
        "sourceId": item.get("sourceId", "unknown"),
        "url": raw_url,
        "publishedAt": published_at,
        "summary": summary,
        "author": clean_text(item.get("author", "")),
        "sourceRegion": item.get("sourceRegion", "Global"),
        "sourceCountry": item.get("sourceCountry", ""),
        "defaultCategory": item.get("defaultCategory", "world"),
        "priority": item.get("priority", 50),
        "language": item.get("language", "en"),
    }
