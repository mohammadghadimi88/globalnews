/**
 * GlobalNews - Minimalist Global News Aggregator
 * Root Application Coordinator
 */

import { CONFIG } from "./config.js";
import { loadNewsData, getAllStories, getTopStories, isDataLoaded } from "./data.js";
import { router } from "./router.js";
import { initTheme } from "./modules/theme.js";
import { initHeader, updateActiveNav } from "./modules/header.js";
import { hideSubcategoryRibbon } from "./modules/navigation.js";
import { renderTopStories } from "./modules/topStories.js";
import { renderLatestNews } from "./modules/latestNews.js";
import { renderSearchView } from "./modules/search.js?v=20261005-search2";
import { renderCategoryView } from "./modules/categories.js";
import { renderSourcesCard } from "./modules/filters.js";
import { initAds } from "./modules/ads.js";
import { renderFooter } from "./modules/footer.js";

class GlobalNewsApp {
  constructor() {
    this.mainContainer = null;
    this.homeVisibleCount = CONFIG.initialResults;
    this.refreshTimer = null;
  }

  async init() {
    // 1. Initialize Visual Theme
    initTheme();

    // 2. Render Header & Footer shell
    initHeader();
    renderFooter();
    initAds();

    this.mainContainer = document.getElementById("main-view-container");

    // Show initial loading state
    this.showLoading();

    // 3. Load news and sources dataset
    const loadResult = await loadNewsData();

    if (!loadResult.success) {
      this.showError("News is temporarily unavailable. Please try again shortly.");
      return;
    }

    // 4. Setup Routes
    this.setupRoutes();

    // 5. Start router
    router.init();

    // 6. Setup auto-refresh polling (5 minutes)
    this.setupAutoRefresh();
  }

  showLoading() {
    if (!this.mainContainer) return;
    this.mainContainer.innerHTML = `
      <div class="empty-state" style="border: none;">
        <h3 style="font-family: var(--font-serif); font-size: 1.25rem;">Connecting to Global Wire...</h3>
        <p class="section-meta">Gathering dispatches from verified news agencies.</p>
      </div>
    `;
  }

  showError(message) {
    if (!this.mainContainer) return;
    this.mainContainer.innerHTML = `
      <div class="error-banner" role="alert">
        <span>${message}</span>
        <button class="empty-reset-btn" id="retry-load-btn" style="padding: 0.3rem 0.8rem; font-size: 0.78rem;">Retry</button>
      </div>
    `;
    document.getElementById("retry-load-btn")?.addEventListener("click", () => {
      this.init();
    });
  }

  setupRoutes() {
    // Home Route (Front Page)
    router.register("/", () => {
      updateActiveNav("all");
      hideSubcategoryRibbon("subcategory-ribbon-bar");
      this.renderHome();
    });

    // Category Routes (/category/:cat)
    router.register("/category/:cat", ({ params, query }) => {
      const catId = (params.cat || "world").toLowerCase();
      updateActiveNav(catId);
      renderCategoryView(this.mainContainer, catId, query.subcategory || "");
      window.scrollTo({ top: 0, behavior: "smooth" });
    });

    // Search Route (/search)
    router.register("/search", ({ query }) => {
      updateActiveNav("");
      hideSubcategoryRibbon("subcategory-ribbon-bar");
      renderSearchView(this.mainContainer, query);
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  renderHome() {
    if (!this.mainContainer) return;

    const allStories = getAllStories();
    const topStories = getTopStories(6);

    this.mainContainer.innerHTML = `
      <div class="editorial-grid">
        <!-- Main News Wire -->
        <main class="main-feed-col" id="home-feed-col"></main>

        <!-- Sidebar (Top Stories + Verified Publishers) -->
        <aside class="sidebar-col" id="home-sidebar-col">
          <div id="home-top-stories-slot"></div>
          <div id="home-sources-slot"></div>
        </aside>
      </div>
    `;

    // Render Latest Wire
    const feedCol = document.getElementById("home-feed-col");
    renderLatestNews(allStories, feedCol, {
      title: "Global Dispatches",
      visibleCount: this.homeVisibleCount,
      onLoadMore: (newCount) => {
        this.homeVisibleCount = newCount;
        this.renderHome();
      }
    });

    // Render Sidebar Top Stories
    const topStoriesSlot = document.getElementById("home-top-stories-slot");
    renderTopStories(topStories, topStoriesSlot);

    // Render Sidebar Sources Card
    const sourcesSlot = document.getElementById("home-sources-slot");
    renderSourcesCard(sourcesSlot);
  }

  setupAutoRefresh() {
    if (CONFIG.refreshInterval && CONFIG.refreshInterval > 0) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = setInterval(async () => {
        console.log("Checking for latest news updates...");
        await loadNewsData();
        // Refresh current route without losing scroll
        const currentPath = router.getCurrentPath();
        if (currentPath === "/") {
          this.renderHome();
        }
      }, CONFIG.refreshInterval);
    }
  }
}

// Bootstrap on DOM ready
document.addEventListener("DOMContentLoaded", () => {
  const app = new GlobalNewsApp();
  app.init();
});
