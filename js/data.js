/**
 * GlobalNews Data Layer & In-Memory Precomputed Search Index
 */

let _stories = [];
let _sources = [];
let _searchIndex = [];
let _isLoaded = false;

export function escapeHTML(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function formatRelativeTime(isoDateString) {
  if (!isoDateString) return "Recently";
  try {
    const pubDate = new Date(isoDateString);
    const now = new Date();
    const diffMs = now.getTime() - pubDate.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours === 1) return "1 hr ago";
    if (diffHours < 24) return `${diffHours} hrs ago`;
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;

    return pubDate.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: pubDate.getFullYear() !== now.getFullYear() ? "numeric" : undefined
    });
  } catch (e) {
    return "Recently";
  }
}

/**
 * Precompute normalized search tokens for fast in-memory precision search
 */
function buildSearchIndex(stories) {
  return stories.map((story, index) => {
    const titleNorm = (story.title || "").toLowerCase();
    const summaryNorm = (story.summary || "").toLowerCase();
    const sourceNorm = (story.source || "").toLowerCase();
    const categoryNorm = (story.category || "").toLowerCase();
    const subcategoryNorm = (story.subcategory || "").toLowerCase();
    const regionNorm = (story.region || "").toLowerCase();
    const countryNorm = (story.country || "").toLowerCase();
    const tagsNorm = (story.tags || []).map(t => t.toLowerCase());

    const titleTokens = new Set(titleNorm.replace(/[^\w\s]/g, " ").split(/\s+/).filter(Boolean));
    const summaryTokens = new Set(summaryNorm.replace(/[^\w\s]/g, " ").split(/\s+/).filter(Boolean));
    const allTokens = new Set([...titleTokens, ...summaryTokens, ...tagsNorm]);

    return {
      index,
      story,
      titleNorm,
      summaryNorm,
      sourceNorm,
      categoryNorm,
      subcategoryNorm,
      regionNorm,
      countryNorm,
      tagsNorm,
      titleTokens,
      summaryTokens,
      allTokens,
      pubTimestamp: new Date(story.publishedAt || 0).getTime()
    };
  });
}

/**
 * Load news.json and sources.json
 */
export async function loadNewsData() {
  try {
    const [newsRes, sourcesRes] = await Promise.all([
      fetch("/data/news.json", { cache: "no-cache" }),
      fetch("/data/sources.json", { cache: "no-cache" })
    ]);

    if (!newsRes.ok) {
      throw new Error(`Failed to load news data (HTTP ${newsRes.status})`);
    }

    const newsData = await newsRes.json();
    _stories = Array.isArray(newsData) ? newsData : (newsData.stories || []);

    if (sourcesRes.ok) {
      _sources = await sourcesRes.json();
    }

    // Precompute index
    _searchIndex = buildSearchIndex(_stories);
    _isLoaded = true;

    return {
      success: true,
      count: _stories.length,
      stories: _stories,
      sources: _sources
    };
  } catch (error) {
    console.error("GlobalNews data loading error:", error);
    return {
      success: false,
      error: error.message || "Failed to load news dataset.",
      stories: [],
      sources: []
    };
  }
}

export function getAllStories() {
  return _stories;
}

export function getSources() {
  return _sources;
}

export function getSearchIndex() {
  return _searchIndex;
}

export function isDataLoaded() {
  return _isLoaded;
}

export function getTopStories(limit = 6) {
  // Return stories ranked by rankScore or priority and freshness
  return [..._stories]
    .sort((a, b) => (b.rankScore || 0) - (a.rankScore || 0))
    .slice(0, limit);
}
