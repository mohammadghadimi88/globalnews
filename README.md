# GlobalNews — Minimalist Global News Aggregator

> **"Global news, without the noise."**

A production-ready, minimalist, text-first global news discovery terminal. Collects headlines and brief dispatches from reputable international news publishers and provides instant category navigation and precision search—linking directly to original publisher articles in new browser tabs.

Built with **Zero heavy frameworks, Zero ads by default, Zero tracking, and Zero image bloat**.

---

## 1. Product Philosophy

The internet is flooded with clickbait, autoplay videos, oversized hero graphics, and interstitial popups. GlobalNews returns news discovery to its purest, highest-signal form:

$$\text{HEADLINE} + \text{SOURCE} + \text{TIME} + \text{CATEGORY} + \text{CLICK} = \text{ORIGINAL ARTICLE}$$

- **Text-First & Editorial**: Typography, whitespace, hairline rules, and tabular figures do all the visual work.
- **No Full Articles**: The service acts solely as an index and discovery guide. The original publisher remains the destination and sole owner of the reporting.
- **No Paywall Evasion**: All clicks open the publisher's authentic URL in a new tab (`target="_blank" rel="noopener noreferrer"`).
- **Fast & Lightweight**: Zero frontend dependencies. 100% vanilla ES modules, semantic HTML5, and responsive CSS tokens.

---

## 2. System Architecture

```
                    +---------------------------+
                    |  160+ Reputable Sources   |
                    |      (sources.json)       |
                    +-------------+-------------+
                                  |
                                  v
                    +---------------------------+
                    | RSS 2.0 / Atom Collector  |
                    |    (fetch_feeds.py)       |
                    +-------------+-------------+
                                  |
                                  v
+---------------------------------------------------------------+
|                      Processing Pipeline                      |
|                                                               |
|  1. normalize.py   --> Strips HTML, ISO 8601 UTC timestamps   |
|  2. deduplicate.py --> Exact URL, normalized headline match   |
|  3. categorize.py  --> Deterministic keyword & entity tagging |
|  4. generate.py    --> Retention filter (48h) & Top Stories   |
+-------------------------------+-------------------------------+
                                |
                                v
                    +---------------------------+
                    |         news.json         |
                    +-------------+-------------+
                                  |
                                  v
+---------------------------------------------------------------+
|                   Static Frontend Terminal                    |
|                                                               |
|  * In-memory precomputed search index                         |
|  * Quoted phrase & structured search syntax                   |
|  * 10 primary categories & subcategory ribbons                |
|  * Dark / Light / OS theme persistence                        |
|  * GitHub Pages ready (Hash & History API routing)            |
+---------------------------------------------------------------+
```

---

## 3. Directory Layout

```
/
├── index.html                   # Semantic HTML5 entry point
├── 404.html                     # GitHub Pages SPA deep link fallback
├── robots.txt                   # Search crawler directives
├── sitemap.xml                  # Canonical XML sitemap
├── README.md                    # Project documentation
├── LICENSE                      # MIT Open Source License
│
├── data/
│   ├── news.json                # Normalized real-time news dataset
│   └── sources.json             # 160+ publisher registry & feed catalog
│
├── collector/
│   ├── fetch_feeds.py           # Robust RSS/Atom parser with timeouts
│   ├── normalize.py             # Markup stripping, UTC timestamps, stable IDs
│   ├── deduplicate.py           # Multi-tiered duplicate detector
│   ├── categorize.py            # Rule-based category & entity tagger
│   ├── generate.py              # Pipeline orchestrator & retention engine
│   ├── requirements.txt         # Collector dependencies
│   └── README.md                # Collector documentation
│
├── css/
│   ├── variables.css            # Archival warm paper & deep ink color tokens
│   ├── base.css                 # Reset, typography, tabular numbers, focus rings
│   ├── layout.css               # Top Bar Contract, asymmetric editorial grid
│   ├── components.css           # Unboxed metadata, story headlines, empty states
│   ├── search.css               # Precision search input, active filters, syntax
│   ├── responsive.css           # Breakpoints from 320px to 1920px
│   └── ads.css                  # Collapsed stubs for future monetization
│
├── js/
│   ├── app.js                   # Application bootstrap & coordinator
│   ├── config.js                # Central configuration parameters
│   ├── data.js                  # Data loading & in-memory search indexer
│   ├── router.js                # Client-side router with hash fallback
│   │
│   └── modules/
│       ├── header.js            # Top Bar Contract 3-zone header
│       ├── navigation.js        # Subcategory ribbon renderer
│       ├── topStories.js        # Curated top stories module
│       ├── latestNews.js        # Chronological news wire with pagination
│       ├── categories.js        # Dedicated category page browsing
│       ├── search.js            # Precision relevance scoring engine
│       ├── filters.js           # Verified publisher facet card
│       ├── theme.js             # Dark / Light mode manager
│       ├── ads.js               # Ad architecture (disabled in MVP)
│       └── footer.js            # Attribution, legal design, back-to-top
│
└── .github/
    └── workflows/
        ├── update-news.yml      # Cron pipeline updating news every 15 mins
        └── deploy.yml           # Automated GitHub Pages static deployment
```

---

## 4. Local Development

### Option A: Python Built-In HTTP Server (No Node.js needed)
```bash
# Clone the repository
git clone https://github.com/your-username/global-news.git
cd global-news

# Serve locally
python3 -m http.server 8000

# Open http://localhost:8000 in your browser
```

### Option B: Vite Dev Server
```bash
# Install node dependencies
npm install

# Start Vite dev server
npm run dev

# Open http://localhost:3000
```

---

## 5. Running the News Collector

The Python collector gathers feeds from enabled sources in `data/sources.json`, sanitizes the content, deduplicates stories, assigns categories, and writes `data/news.json`.

```bash
# Run with default 48-hour retention window
python3 collector/generate.py

# Run with custom retention window (e.g. 24h, 72h, or 168h)
python3 collector/generate.py 72
```

### Collector Output Example
```text
============================================================
PIPELINE COMPLETE
Feeds processed: 34
Successful: 32
Failed: 2
Stories collected: 500
Duplicates removed: 86
Saved: /workspace/data/news.json
============================================================
```

---

## 6. Source Registry Management

The registry in `data/sources.json` contains 160+ major international news publishers organized across:
- **Global**: Reuters, Associated Press, AFP, Bloomberg
- **Europe**: BBC, The Guardian, Financial Times, The Economist, Deutsche Welle, France 24, Le Monde, Der Spiegel
- **Americas**: NPR, Politico, CNBC, The Hill, Inside Climate News
- **Middle East**: Al Jazeera English, Middle East Eye, The National
- **Asia**: Nikkei Asia, South China Morning Post, The Japan Times, The Hindu, CNA
- **Africa**: Africanews, AllAfrica, Daily Maverick
- **Specialist**: Nature, Science, New Scientist, Ars Technica, MIT Tech Review, Wired, WHO, STAT News, Artforum

### Activating a Source
Only sources with `"enabled": true` and verified feeds are polled. To activate any source:
1. Verify the publisher's official RSS/Atom XML feed.
2. Update the record in `data/sources.json`:
```json
{
  "id": "reuters",
  "name": "Reuters",
  "website": "https://www.reuters.com",
  "country": "United Kingdom",
  "region": "Global",
  "language": "en",
  "priority": 100,
  "enabled": true,
  "category": "world",
  "feeds": [
    "https://www.reutersagency.com/feed/?best-topics=world&post_type=best"
  ]
}
```

---

## 7. Precision Search Engine & Syntax

Search is built on an in-memory precomputed index that calculates relevance scores without roundtripping to a server.

### Supported Search Syntax
| Query | Description |
| :--- | :--- |
| `artificial intelligence` | Multi-term search with bonus for documents containing both words |
| `"Federal Reserve"` | Quoted exact phrase match (receives highest 100pt relevance boost) |
| `source:Reuters` | Filter results specifically to Reuters |
| `category:Technology` | Filter results to Technology |
| `subcategory:AI` | Filter results to AI subcategory |
| `region:Europe` | Filter results to Europe |
| `source:Reuters AI` | Combine structured filter with free-text keyword search |

### Relevance Scoring Formula
- **Exact Title Phrase**: 100 pts
- **Title Word Match**: 60 pts
- **Exact Normalized Tag Match**: 50 pts
- **All Terms Co-occurrence Bonus**: 40 pts
- **Summary Phrase/Word Match**: 30 pts
- **Category Match**: 20 pts
- **Subcategory Match**: 20 pts
- **Source Match**: 15 pts
- **Region Match**: 10 pts
- **Recency Decay**: Linear decay over 48 hours to break score ties gracefully

---

## 8. GitHub Actions & Automated GitHub Pages Deployment

The repository includes two fully configured GitHub Actions workflows:

### 1. `.github/workflows/update-news.yml`
- Runs automatically **every 15 minutes** via UTC cron schedule.
- Can also be triggered manually using `workflow_dispatch`.
- Executes `python collector/generate.py 48`.
- Validates the resulting `data/news.json`.
- Automatically commits and pushes updated data back to the branch.

### 2. `.github/workflows/deploy.yml`
- Runs on push to the `main` branch.
- Deploys the entire static project to **GitHub Pages**.
- No server management or build step required.

---

## 9. Configuration Reference

All application parameters are consolidated in `/js/config.js`:

```javascript
export const CONFIG = {
  newsLimit: 500,           // Maximum stories preserved in active feed
  retentionHours: 48,       // Default story lifetime
  initialResults: 30,       // Stories rendered on first load
  resultsPerPage: 30,       // Additional stories rendered per "Load More" click

  enableSearch: true,       // Toggle precision search engine
  enableCategories: true,   // Toggle category navigation
  enableDarkMode: true,     // Toggle theme switcher

  enableAds: false,         // Strict default: Ads disabled in MVP
  enableAnalytics: false,   // Strict default: No telemetry/trackers

  refreshInterval: 300000   // Background auto-refresh polling (5 minutes)
};
```

---

## 10. Legal Design & Content Policy

GlobalNews is designed from first principles to respect original journalism and copyright:
- **No Full Article Scraping**: The service stores and renders only feed-provided titles, timestamps, and brief excerpts.
- **External Destinations**: Every story headline opens directly to the source publisher's article in a new tab with `target="_blank" rel="noopener noreferrer"`.
- **No Paywall Circumvention**: The application does not scrape behind paywalls, bypass authentication, or proxy third-party content.
- **Immediate Disabling**: Any publisher can be deactivated instantly by switching `"enabled": false` in `data/sources.json`.

---

## 11. License

Distributed under the **MIT License**. See [LICENSE](LICENSE) for details.
