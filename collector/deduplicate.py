"""
GlobalNews Deduplication Engine
Multi-tiered deduplication ensuring clean feeds while preserving legitimate source diversity.
Level 1: Exact URL match
Level 2: Normalized title match
Level 3: Fuzzy token similarity for duplicate agency wires
"""

import re
from typing import List, Dict, Any, Tuple

PUNCT_RE = re.compile(r"[^\w\s]", re.UNICODE)

def normalize_title_for_comparison(title: str) -> str:
    """Strip punctuation, numbers, and excess whitespace to compare core phrasing."""
    lowered = title.lower()
    cleaned = PUNCT_RE.sub(" ", lowered)
    tokens = [t for t in cleaned.split() if len(t) > 2]
    return " ".join(tokens)

def tokenize_title(title: str) -> set:
    """Create token set for Jaccard similarity."""
    lowered = title.lower()
    cleaned = PUNCT_RE.sub(" ", lowered)
    return set(t for t in cleaned.split() if len(t) > 2)

def calculate_jaccard_similarity(tokens_a: set, tokens_b: set) -> float:
    """Compute token Jaccard similarity."""
    if not tokens_a or not tokens_b:
        return 0.0
    intersection = len(tokens_a.intersection(tokens_b))
    union = len(tokens_a.union(tokens_b))
    return intersection / union if union > 0 else 0.0

def deduplicate_stories(stories: List[Dict[str, Any]]) -> Tuple[List[Dict[str, Any]], int]:
    """
    Deduplicate a list of stories while maintaining source priority and recency.
    Returns: (deduplicated_stories, duplicate_count)
    """
    seen_urls = set()
    seen_normalized_titles = {}
    unique_stories = []
    duplicates_count = 0

    for story in stories:
        url = story.get("url", "").strip().lower()
        # Level 1: Exact URL match
        if url in seen_urls:
            duplicates_count += 1
            continue

        norm_title = normalize_title_for_comparison(story.get("title", ""))
        tokens = tokenize_title(story.get("title", ""))
        
        # Level 2: Exact normalized title match within same publisher or same timeframe
        if norm_title in seen_normalized_titles:
            existing_source = seen_normalized_titles[norm_title]
            if existing_source == story.get("sourceId"):
                duplicates_count += 1
                continue

        # Level 3: Near-identical headline from same source (e.g. minor updates or duplicate feed entries)
        is_duplicate = False
        for u_story in unique_stories[-30:]:  # check against recent unique stories
            if u_story.get("sourceId") == story.get("sourceId"):
                u_tokens = tokenize_title(u_story.get("title", ""))
                similarity = calculate_jaccard_similarity(tokens, u_tokens)
                if similarity >= 0.82:
                    is_duplicate = True
                    break

        if is_duplicate:
            duplicates_count += 1
            continue

        seen_urls.add(url)
        seen_normalized_titles[norm_title] = story.get("sourceId")
        unique_stories.append(story)

    return unique_stories, duplicates_count
