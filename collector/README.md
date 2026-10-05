# GlobalNews Feed Collector

A modular, dependency-light Python 3 collector for RSS 2.0 and Atom news feeds.

## Architecture

```
sources.json ──> fetch_feeds.py ──> normalize.py ──> deduplicate.py ──> categorize.py ──> news.json
```

1. **`fetch_feeds.py`**: Safe RSS 2.0 and Atom parser using Python standard library. Employs polite headers, standard timeouts (12s), and isolated try/catch per feed so one broken publisher feed never stops the pipeline.
2. **`normalize.py`**: Strips HTML tags, unescapes entities, normalizes timestamps into ISO 8601 UTC strings (`YYYY-MM-DDTHH:MM:SSZ`), trims summaries to clean sentence/word boundaries, and creates deterministic story IDs (`gn-<hash>`).
3. **`deduplicate.py`**: Multi-level deduplication:
   - Level 1: Exact URL collision
   - Level 2: Normalized headline match per publisher
   - Level 3: Token similarity for wire duplicates while preserving multi-source reporting.
4. **`categorize.py`**: Deterministic rule-based classifier assigning Primary Category (World, Politics, Business, Technology, Science, Health, Sports, Culture, Environment), Subcategory, Region, Country, and normalized Entity Tags (e.g. OpenAI, Apple, Federal Reserve, NASA).
5. **`generate.py`**: Main orchestrator. Enforces the configurable retention window (default 48h) and ranks Top Stories.

## Manual Execution

```bash
# Run pipeline with default 48h retention
python3 collector/generate.py

# Run with custom retention (e.g., 24h, 72h, or 168h)
python3 collector/generate.py 72
```

## Adding or Activating Sources

Open `data/sources.json`. Find or add a publisher, verify their official RSS/Atom feed URL, and set:

```json
{
  "id": "example-news",
  "name": "Example News",
  "website": "https://example.com",
  "country": "United States",
  "region": "Americas",
  "language": "en",
  "priority": 85,
  "enabled": true,
  "category": "world",
  "feeds": [
    "https://example.com/rss.xml"
  ]
}
```
