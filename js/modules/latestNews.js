/**
 * GlobalNews Latest News Feed Module
 * Pure text-centric chronological news stream with pagination.
 */

import { escapeHTML, formatRelativeTime } from "../data.js";
import { CONFIG } from "../config.js";
import { router } from "../router.js";

const EXTERNAL_LINK_SVG = `
  <svg class="external-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
    <polyline points="15 3 21 3 21 9"/>
    <line x1="10" y1="14" x2="21" y2="3"/>
  </svg>
`;

export function renderStoryItem(story) {
  return `
    <article class="story-item" id="${escapeHTML(story.id)}">
      <div class="story-meta">
        <span class="meta-source" data-source="${escapeHTML(story.source)}">${escapeHTML(story.source)}</span>
        <span class="meta-sep" aria-hidden="true">·</span>
        <time class="meta-time" datetime="${escapeHTML(story.publishedAt)}">${formatRelativeTime(story.publishedAt)}</time>
        <span class="meta-sep" aria-hidden="true">·</span>
        <span class="meta-category" data-cat="${escapeHTML(story.category)}">${escapeHTML(story.category)}</span>
        ${story.subcategory && story.subcategory !== "general" ? `
          <span class="meta-sep" aria-hidden="true">/</span>
          <span class="meta-category" data-cat="${escapeHTML(story.category)}" data-subcat="${escapeHTML(story.subcategory)}">${escapeHTML(story.subcategory)}</span>
        ` : ""}
        ${story.region && story.region !== "Global" ? `
          <span class="meta-sep" aria-hidden="true">·</span>
          <span class="meta-region">${escapeHTML(story.region)}</span>
        ` : ""}
      </div>

      <h3 class="story-headline">
        <a href="${escapeHTML(story.url)}" target="_blank" rel="noopener noreferrer" class="story-link" title="Open original article on ${escapeHTML(story.source)}">
          ${escapeHTML(story.title)}
          ${EXTERNAL_LINK_SVG}
        </a>
      </h3>

      ${story.summary ? `
        <p class="story-summary">${escapeHTML(story.summary)}</p>
      ` : ""}

      ${story.tags && story.tags.length > 0 ? `
        <div class="story-tags">
          ${story.tags.map(t => `<span class="tag-item" data-tag="${escapeHTML(t)}">#${escapeHTML(t)}</span>`).join(" ")}
        </div>
      ` : ""}
    </article>
  `;
}

export function renderLatestNews(stories, container, options = {}) {
  if (!container) return;

  const title = options.title || "Latest Dispatches";
  const visibleCount = options.visibleCount || CONFIG.initialResults;
  const totalCount = stories.length;

  if (totalCount === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <h3>No Dispatches Found</h3>
        <p>No news stories are currently available for this selection.</p>
      </div>
    `;
    return;
  }

  const visibleStories = stories.slice(0, visibleCount);
  const hasMore = visibleCount < totalCount;

  container.innerHTML = `
    <div class="latest-news-section">
      <div class="section-header">
        <h2 class="section-title">${title}</h2>
        <span class="section-meta tabular-nums">Showing ${visibleStories.length} of ${totalCount}</span>
      </div>

      <div class="stories-stream" id="stories-stream">
        ${visibleStories.map(story => renderStoryItem(story)).join("")}
      </div>

      ${hasMore ? `
        <div class="load-more-container">
          <button id="load-more-btn" class="load-more-btn" data-count="${visibleCount}">
            Load More Stories (${totalCount - visibleCount} remaining)
          </button>
        </div>
      ` : ""}
    </div>
  `;

  // Bind interactive clicks: Load More, Source filter, Category filter, Tag filter
  const loadMoreBtn = container.querySelector("#load-more-btn");
  if (loadMoreBtn && options.onLoadMore) {
    loadMoreBtn.addEventListener("click", () => {
      options.onLoadMore(visibleCount + CONFIG.resultsPerPage);
    });
  }

  container.querySelectorAll(".meta-source").forEach(el => {
    el.addEventListener("click", (e) => {
      e.preventDefault();
      const source = el.getAttribute("data-source");
      router.navigate("/search", { source });
    });
  });

  container.querySelectorAll(".meta-category").forEach(el => {
    el.addEventListener("click", (e) => {
      e.preventDefault();
      const cat = el.getAttribute("data-cat");
      const subcat = el.getAttribute("data-subcat");
      if (subcat) {
        router.navigate(`/category/${cat}`, { subcategory: subcat });
      } else {
        router.navigate(`/category/${cat}`);
      }
    });
  });

  container.querySelectorAll(".tag-item").forEach(el => {
    el.addEventListener("click", (e) => {
      e.preventDefault();
      const tag = el.getAttribute("data-tag");
      router.navigate("/search", { q: tag });
    });
  });
}
