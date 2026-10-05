/**
 * GlobalNews Precision Search & Relevance Engine
 * Implements tokenization, quoted phrase matching, structured syntax parsing,
 * weighted relevance scoring, multi-facet filtering, and URL state sync.
 */

import { getSearchIndex, getSources, normalizeSearchText } from "../data.js";
import { CONFIG } from "../config.js";
import { renderStoryItem } from "./latestNews.js";

/**
 * Parses query into structured facets and keywords.
 * Example: 'source:Reuters category:Technology "artificial intelligence" chips'
 */
export function parseSearchQuery(queryStr) {
  const result = {
    exactPhrases: [],
    terms: [],
    structuredFilters: {},
    raw: queryStr.trim()
  };

  if (!queryStr || !queryStr.trim()) {
    return result;
  }

  let text = queryStr.trim();

  // 1. Extract structured prefixes: source:..., category:..., subcategory:..., region:..., country:...
  const structuredRegex = /\b(source|category|subcategory|region|country):"([^"]+)"|\b(source|category|subcategory|region|country):([^\s]+)/gi;
  text = text.replace(structuredRegex, (match, key1, val1, key2, val2) => {
    const key = (key1 || key2).toLowerCase();
    const val = normalizeSearchText(val1 || val2);
    result.structuredFilters[key] = val;
    return " ";
  });

  // 2. Extract quoted phrases: "artificial intelligence"
  const phraseRegex = /"([^"]+)"/g;
  text = text.replace(phraseRegex, (match, phrase) => {
    const cleanPhrase = normalizeSearchText(phrase);
    if (cleanPhrase) {
      result.exactPhrases.push(cleanPhrase);
    }
    return " ";
  });

  // 3. Extract remaining individual terms
  const terms = normalizeSearchText(text).split(/\s+/).filter(t => t.length > 1);
  result.terms = terms;

  return result;
}

/**
 * Date range filter evaluation
 */
function matchesSearchTerm(item, term) { if (item.searchableNorm?.includes(term)) return true; if (term.length >= 4 && item.searchableNorm?.split(/\s+/).some(word => word.startsWith(term))) return true; return false; }

function matchesDateRange(pubTimestamp, dateRange) {
  if (!dateRange || dateRange === "all") return true;
  const now = Date.now();
  const diffHours = (now - pubTimestamp) / (1000 * 60 * 60);

  if (dateRange === "today") {
    const pubDate = new Date(pubTimestamp);
    const today = new Date();
    return pubDate.toDateString() === today.toDateString();
  }
  if (dateRange === "24h") {
    return diffHours <= 24;
  }
  if (dateRange === "7d") {
    return diffHours <= 168;
  }
  if (dateRange === "30d") {
    return diffHours <= 720;
  }
  return true;
}

/**
 * Execute precision scoring on the precomputed search index
 */
export function executeSearch(queryObj, filters = {}) {
  const searchIndex = getSearchIndex();
  const weights = CONFIG.searchWeights;

  const { exactPhrases, terms, structuredFilters } = queryObj;
  const isTextQuery = exactPhrases.length > 0 || terms.length > 0;

  // Active combined filters
  const activeCategory = (filters.category || structuredFilters.category || "").toLowerCase();
  const activeSubcategory = (filters.subcategory || structuredFilters.subcategory || "").toLowerCase();
  const activeSource = (filters.source || structuredFilters.source || "").toLowerCase();
  const activeRegion = (filters.region || structuredFilters.region || "").toLowerCase();
  const activeCountry = (filters.country || structuredFilters.country || "").toLowerCase();
  const activeDateRange = filters.dateRange || "all";

  const scoredResults = [];

  for (const item of searchIndex) {
    // 1. Facet Filtering
    if (activeCategory && activeCategory !== "all" && item.categoryNorm !== activeCategory) {
      continue;
    }
    if (activeSubcategory && item.subcategoryNorm !== activeSubcategory) {
      continue;
    }
    if (activeSource && !item.sourceNorm.includes(activeSource) && item.story.sourceId !== activeSource) {
      continue;
    }
    if (activeRegion && item.regionNorm !== activeRegion) {
      continue;
    }
    if (activeCountry && item.countryNorm !== activeCountry) {
      continue;
    }
    if (!matchesDateRange(item.pubTimestamp, activeDateRange)) {
      continue;
    }

    // If query has no text keywords, score by recency/priority
    if (!isTextQuery) {
      scoredResults.push({
        story: item.story,
        score: item.pubTimestamp
      });
      continue;
    }

    // 2. Precision Text Relevance Scoring
    let score = 0;
    let matchedTermsCount = 0;

    // Check exact phrases
    for (const phrase of exactPhrases) {
      if (item.titleNorm.includes(phrase)) {
        score += weights.exactTitlePhrase;
        matchedTermsCount++;
      } else if (item.summaryNorm.includes(phrase)) {
        score += weights.summaryMatch * 1.5;
        matchedTermsCount++;
      }
    }

    // Check individual terms
    for (const term of terms) {
      let termMatched = false;

      if (item.titleTokens.has(term)) { score += weights.titleWordMatch; termMatched = true; }
      else if (item.titleNorm.includes(term)) { score += weights.titleWordMatch * 0.7; termMatched = true; }
      if (item.tagsNorm.some(t => t === term || t.includes(term))) { score += weights.exactTag; termMatched = true; }
      if (item.summaryTokens.has(term)) { score += weights.summaryMatch; termMatched = true; }
      else if (item.summaryNorm.includes(term)) { score += weights.summaryMatch * 0.7; termMatched = true; }
      if (item.categoryNorm.includes(term)) { score += weights.categoryMatch; termMatched = true; }
      if (item.subcategoryNorm.includes(term)) { score += weights.subcategoryMatch; termMatched = true; }
      if (item.sourceNorm.includes(term)) { score += weights.sourceMatch; termMatched = true; }
      if (item.regionNorm.includes(term)) { score += weights.regionMatch; termMatched = true; }
      if (item.countryNorm.includes(term)) { score += weights.regionMatch * 1.5; termMatched = true; }
      if (item.authorNorm?.includes(term)) { score += weights.sourceMatch; termMatched = true; }
      if (item.sourceRegionNorm?.includes(term)) { score += weights.regionMatch; termMatched = true; }
      if (!termMatched && matchesSearchTerm(item, term)) { score += weights.summaryMatch * 0.4; termMatched = true; }

      if (termMatched) {
        matchedTermsCount++;
      }
    }

    // Multi-term search reward: bonus if all search terms matched
    if (terms.length > 1 && matchedTermsCount >= terms.length) {
      score += weights.allTermsBonus;
    }

    // Only include if score > 0
    if (score > 0) {
      // Recency tie-breaker: slightly boost recent stories without dominating relevance
      const hoursAgo = Math.max(0, (Date.now() - item.pubTimestamp) / 3600000);
      const recencyBonus = Math.max(0, 15 - hoursAgo * 0.3);

      scoredResults.push({
        story: item.story,
        score: score + recencyBonus,
        pubTimestamp: item.pubTimestamp
      });
    }
  }

  // Sort by score descending, then by pubTimestamp descending
  scoredResults.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    return b.pubTimestamp - a.pubTimestamp;
  });

  return scoredResults.map(r => r.story);
}

/**
 * Render Search View into container
 */
export function renderSearchView(container, initialParams = {}) {
  if (!container) return;

  const currentQ = initialParams.q || "";
  const currentCategory = initialParams.category || "all";
  const currentSubcategory = initialParams.subcategory || "";
  const currentSource = initialParams.source || "";
  const currentRegion = initialParams.region || "";
  const currentDate = initialParams.date || "all";
  let visibleLimit = CONFIG.resultsPerPage;

  const allSources = getSources();

  function buildFilterUI() {
    return `
      <section class="search-section" aria-label="News search form">
        <form id="search-form" class="search-bar-wrap" role="search" onsubmit="event.preventDefault();">
          <svg class="search-icon-left" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
          </svg>
          <input
            type="search"
            id="search-input-field"
            class="search-input"
            placeholder="Search global news by keyword, phrase, or topic..."
            value="${escapeHTML(currentQ)}"
            autocomplete="off"
            aria-label="Search news"
          />
          ${currentQ ? `
            <button type="button" id="search-clear-btn" class="search-clear-btn" aria-label="Clear search">×</button>
          ` : ""}
        </form>

        <!-- Precision Filters Toolbar -->
        <div class="search-filters-bar">
          <select id="filter-category" class="filter-select" aria-label="Filter by Category">
            <option value="all">All Categories</option>
            ${CONFIG.categories.filter(c => c.id !== "all").map(c => `
              <option value="${c.id}" ${currentCategory === c.id ? "selected" : ""}>${c.name}</option>
            `).join("")}
          </select>

          <select id="filter-date" class="filter-select" aria-label="Filter by Timeframe">
            <option value="all" ${currentDate === "all" ? "selected" : ""}>Any Time</option>
            <option value="today" ${currentDate === "today" ? "selected" : ""}>Today</option>
            <option value="24h" ${currentDate === "24h" ? "selected" : ""}>Last 24 Hours</option>
            <option value="7d" ${currentDate === "7d" ? "selected" : ""}>Last 7 Days</option>
          </select>

          <select id="filter-source" class="filter-select" aria-label="Filter by Source">
            <option value="">All Sources</option>
            ${allSources.map(s => `
              <option value="${s.name}" ${currentSource.toLowerCase() === s.name.toLowerCase() ? "selected" : ""}>${s.name}</option>
            `).join("")}
          </select>

          <select id="filter-region" class="filter-select" aria-label="Filter by Region">
            <option value="" ${!currentRegion ? "selected" : ""}>All Regions</option>
            <option value="Europe" ${currentRegion.toLowerCase() === "europe" ? "selected" : ""}>Europe</option>
            <option value="Americas" ${currentRegion.toLowerCase() === "americas" ? "selected" : ""}>Americas</option>
            <option value="Asia" ${currentRegion.toLowerCase() === "asia" ? "selected" : ""}>Asia</option>
            <option value="Middle East" ${currentRegion.toLowerCase() === "middle east" ? "selected" : ""}>Middle East</option>
            <option value="Africa" ${currentRegion.toLowerCase() === "africa" ? "selected" : ""}>Africa</option>
          </select>
        </div>

        <div class="search-syntax-hint">
          <span>Search syntax:</span>
          <span class="syntax-pill" data-hint='"artificial intelligence"'>"phrase"</span>
          <span class="syntax-pill" data-hint='source:Reuters'>source:Reuters</span>
          <span class="syntax-pill" data-hint='category:Technology'>category:Technology</span>
          <span class="syntax-pill" data-hint='Trump Iran'>Trump Iran</span>
        </div>
      </section>

      <!-- Active Filters & Result Counter -->
      <div id="search-status-bar" class="search-status-bar"></div>

      <!-- Results Stream -->
      <div id="search-results-stream" class="stories-stream"></div>

      <!-- Pagination Load More -->
      <div id="search-load-more-container" class="load-more-container"></div>
    `;
  }

  container.innerHTML = buildFilterUI();

  const searchInput = container.querySelector("#search-input-field");
  const clearBtn = container.querySelector("#search-clear-btn");
  const catSelect = container.querySelector("#filter-category");
  const dateSelect = container.querySelector("#filter-date");
  const sourceSelect = container.querySelector("#filter-source");
  const regionSelect = container.querySelector("#filter-region");
  const statusBar = container.querySelector("#search-status-bar");
  const resultsStream = container.querySelector("#search-results-stream");
  const loadMoreContainer = container.querySelector("#search-load-more-container");

  function runAndRender() {
    const rawQuery = searchInput.value;
    const parsed = parseSearchQuery(rawQuery);

    const filters = {
      category: catSelect.value,
      dateRange: dateSelect.value,
      source: sourceSelect.value,
      region: regionSelect.value,
      subcategory: currentSubcategory
    };

    const results = executeSearch(parsed, filters);
    const visibleResults = results.slice(0, visibleLimit);

    // Active filter badges
    const activeFilters = [];
    if (rawQuery.trim()) activeFilters.push({ label: `"${rawQuery.trim()}"`, key: "q" });
    if (filters.category && filters.category !== "all") activeFilters.push({ label: `Category: ${filters.category}`, key: "category" });
    if (filters.source) activeFilters.push({ label: `Source: ${filters.source}`, key: "source" });
    if (filters.region) activeFilters.push({ label: `Region: ${filters.region}`, key: "region" });
    if (filters.dateRange !== "all") activeFilters.push({ label: `Time: ${filters.dateRange}`, key: "date" });

    statusBar.innerHTML = `
      <div class="active-filters-cluster">
        <span class="tabular-nums"><strong>${results.length}</strong> ${results.length === 1 ? 'story' : 'stories'} found</span>
        ${activeFilters.map(f => `
          <span class="active-filter-badge">
            ${escapeHTML(f.label)}
            <button class="remove-filter-btn" data-key="${f.key}" aria-label="Remove filter">×</button>
          </span>
        `).join("")}
        ${activeFilters.length > 0 ? `
          <button class="clear-all-filters-btn" id="reset-all-filters">Clear all</button>
        ` : ""}
      </div>
    `;

    // Render results or empty state
    if (results.length === 0) {
      resultsStream.innerHTML = `
        <div class="empty-state">
          <h3>No matching dispatches found</h3>
          <p>We couldn't find any articles matching your search criteria.</p>
          <p class="section-meta">Suggestions: check spelling, try broader keywords, or remove active source and timeframe filters.</p>
          <button class="empty-reset-btn" id="empty-clear-btn">Reset Search</button>
        </div>
      `;
      loadMoreContainer.innerHTML = "";

      container.querySelector("#empty-clear-btn")?.addEventListener("click", () => {
        searchInput.value = "";
        catSelect.value = "all";
        dateSelect.value = "all";
        sourceSelect.value = "";
        regionSelect.value = "";
        syncURLState();
        runAndRender();
      });
      return;
    }

    resultsStream.innerHTML = visibleResults.map(story => renderStoryItem(story)).join("");

    // Load more pagination
    if (visibleLimit < results.length) {
      loadMoreContainer.innerHTML = `
        <button id="search-load-more-btn" class="load-more-btn">
          Load More Results (${results.length - visibleLimit} remaining)
        </button>
      `;
      container.querySelector("#search-load-more-btn")?.addEventListener("click", () => {
        visibleLimit += CONFIG.resultsPerPage;
        runAndRender();
      });
    } else {
      loadMoreContainer.innerHTML = "";
    }

    // Attach click events on tags, sources, categories
    resultsStream.querySelectorAll(".meta-source").forEach(el => {
      el.addEventListener("click", (e) => {
        e.preventDefault();
        sourceSelect.value = el.textContent.trim();
        syncURLState();
        runAndRender();
      });
    });

    resultsStream.querySelectorAll(".tag-item").forEach(el => {
      el.addEventListener("click", (e) => {
        e.preventDefault();
        searchInput.value = el.getAttribute("data-tag");
        syncURLState();
        runAndRender();
      });
    });

    // Remove filter handlers
    statusBar.querySelectorAll(".remove-filter-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const key = btn.getAttribute("data-key");
        if (key === "q") searchInput.value = "";
        if (key === "category") catSelect.value = "all";
        if (key === "source") sourceSelect.value = "";
        if (key === "region") regionSelect.value = "";
        if (key === "date") dateSelect.value = "all";
        syncURLState();
        runAndRender();
      });
    });

    statusBar.querySelector("#reset-all-filters")?.addEventListener("click", () => {
      searchInput.value = "";
      catSelect.value = "all";
      dateSelect.value = "all";
      sourceSelect.value = "";
      regionSelect.value = "";
      syncURLState();
      runAndRender();
    });
  }

  function syncURLState() {
    const params = {};
    if (searchInput.value.trim()) params.q = searchInput.value.trim();
    if (catSelect.value !== "all") params.category = catSelect.value;
    if (dateSelect.value !== "all") params.date = dateSelect.value;
    if (sourceSelect.value) params.source = sourceSelect.value;
    if (regionSelect.value) params.region = regionSelect.value;
    const query = new URLSearchParams(params).toString();
    const targetHash = query ? `#/search?${query}` : "#/search";
    window.history.replaceState(null, "", targetHash);
  }

  // Event Listeners
  let debounceTimer;
  searchInput.addEventListener("input", () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      visibleLimit = CONFIG.resultsPerPage;
      syncURLState();
      runAndRender();
    }, 180);
  });

  catSelect.addEventListener("change", () => {
    visibleLimit = CONFIG.resultsPerPage;
    syncURLState();
    runAndRender();
  });

  dateSelect.addEventListener("change", () => {
    visibleLimit = CONFIG.resultsPerPage;
    syncURLState();
    runAndRender();
  });

  sourceSelect.addEventListener("change", () => {
    visibleLimit = CONFIG.resultsPerPage;
    syncURLState();
    runAndRender();
  });

  regionSelect.addEventListener("change", () => {
    visibleLimit = CONFIG.resultsPerPage;
    syncURLState();
    runAndRender();
  });

  clearBtn?.addEventListener("click", () => {
    searchInput.value = "";
    syncURLState();
    runAndRender();
    searchInput.focus();
  });

  container.querySelectorAll(".syntax-pill").forEach(pill => {
    pill.addEventListener("click", () => {
      searchInput.value = pill.getAttribute("data-hint");
      syncURLState();
      runAndRender();
      searchInput.focus();
    });
  });

  // Initial execution
  runAndRender();
}

function escapeHTML(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
