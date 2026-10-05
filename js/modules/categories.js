/**
 * GlobalNews Category View Module
 * Renders dedicated category browsing with subcategory filters, category top stories, and latest stream.
 */

import { getAllStories } from "../data.js";
import { CONFIG } from "../config.js";
import { renderTopStories } from "./topStories.js";
import { renderLatestNews } from "./latestNews.js";
import { renderSubcategoryRibbon } from "./navigation.js";
import { router } from "../router.js";

export function renderCategoryView(container, categoryId, subcategory = "") {
  if (!container) return;

  const catMeta = CONFIG.categories.find(c => c.id === categoryId) || {
    id: categoryId,
    name: categoryId.charAt(0).toUpperCase() + categoryId.slice(1)
  };

  const allStories = getAllStories();
  let catStories = allStories.filter(s => (s.category || "").toLowerCase() === categoryId.toLowerCase());

  if (subcategory) {
    catStories = catStories.filter(s => (s.subcategory || "").toLowerCase() === subcategory.toLowerCase());
  }

  // Update subcategory ribbon in header area
  renderSubcategoryRibbon("subcategory-ribbon-bar", categoryId, subcategory);

  let visibleCount = CONFIG.initialResults;

  function render() {
    if (catStories.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <h3>No dispatches in ${catMeta.name} ${subcategory ? `(${subcategory})` : ''}</h3>
          <p>There are currently no active stories filed under this category.</p>
          <button class="empty-reset-btn" id="cat-all-news-btn">Return to All News</button>
        </div>
      `;
      container.querySelector("#cat-all-news-btn")?.addEventListener("click", () => {
        router.navigate("/");
      });
      return;
    }

    const topForCategory = catStories.slice(0, 4);

    container.innerHTML = `
      <div class="category-header section-header">
        <div>
          <h1 class="section-title">${catMeta.name}</h1>
          <p class="section-meta">Global reporting across ${catMeta.name.toLowerCase()} affairs${subcategory ? ` · Topic: ${subcategory}` : ''}</p>
        </div>
        <button id="search-in-category-btn" class="action-btn" aria-label="Search within this category">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
          <span>Search in ${catMeta.name}</span>
        </button>
      </div>

      <div class="editorial-grid">
        <main class="main-feed-col" id="category-feed-col"></main>
        <aside class="sidebar-col" id="category-sidebar-col"></aside>
      </div>
    `;

    // Render feed
    const feedCol = container.querySelector("#category-feed-col");
    renderLatestNews(catStories, feedCol, {
      title: `${catMeta.name} Wire`,
      visibleCount,
      onLoadMore: (newCount) => {
        visibleCount = newCount;
        render();
      }
    });

    // Render sidebar top stories
    const sidebarCol = container.querySelector("#category-sidebar-col");
    renderTopStories(topForCategory, sidebarCol);

    // Bind Search in Category button
    container.querySelector("#search-in-category-btn")?.addEventListener("click", () => {
      router.navigate("/search", { category: categoryId });
    });
  }

  render();
}
