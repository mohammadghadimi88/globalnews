/**
 * GlobalNews Top Stories Section Module
 * Renders editorial curated top stories without images or cards-within-cards clutter.
 */

import { escapeHTML, formatRelativeTime } from "../data.js";
import { router } from "../router.js";

const EXTERNAL_LINK_SVG = `
  <svg class="external-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
    <polyline points="15 3 21 3 21 9"/>
    <line x1="10" y1="14" x2="21" y2="3"/>
  </svg>
`;

export function renderTopStories(stories, container) {
  if (!container) return;
  if (!stories || stories.length === 0) {
    container.innerHTML = "";
    return;
  }

  const [leadStory, ...secondaryStories] = stories.slice(0, 6);

  container.innerHTML = `
    <div class="top-stories-box">
      <div class="section-header">
        <h2 class="section-title">Top Stories</h2>
        <span class="section-meta">Curated by priority & recency</span>
      </div>

      <!-- Lead Story -->
      ${leadStory ? `
        <article class="story-item featured">
          <div class="story-meta">
            <span class="meta-source" data-source-id="${escapeHTML(leadStory.sourceId)}">${escapeHTML(leadStory.source)}</span>
            <span class="meta-sep" aria-hidden="true">·</span>
            <time class="meta-time">${formatRelativeTime(leadStory.publishedAt)}</time>
            <span class="meta-sep" aria-hidden="true">·</span>
            <span class="meta-category" data-cat="${escapeHTML(leadStory.category)}">${escapeHTML(leadStory.category)}</span>
            ${leadStory.subcategory && leadStory.subcategory !== 'general' ? `
              <span class="meta-sep" aria-hidden="true">/</span>
              <span class="meta-category" data-cat="${escapeHTML(leadStory.category)}" data-subcat="${escapeHTML(leadStory.subcategory)}">${escapeHTML(leadStory.subcategory)}</span>
            ` : ''}
          </div>

          <h3 class="story-headline">
            <a href="${escapeHTML(leadStory.url)}" target="_blank" rel="noopener noreferrer" class="story-link" title="Read original article on ${escapeHTML(leadStory.source)}">
              ${escapeHTML(leadStory.title)}
              ${EXTERNAL_LINK_SVG}
            </a>
          </h3>

          ${leadStory.summary ? `
            <p class="story-summary">${escapeHTML(leadStory.summary)}</p>
          ` : ''}
        </article>
      ` : ''}

      <!-- Secondary Mini Stories -->
      <div class="secondary-top-stories">
        ${secondaryStories.map(story => `
          <article class="top-story-mini">
            <h4 class="mini-headline">
              <a href="${escapeHTML(story.url)}" target="_blank" rel="noopener noreferrer" class="story-link" title="Read original article on ${escapeHTML(story.source)}">
                ${escapeHTML(story.title)}
                ${EXTERNAL_LINK_SVG}
              </a>
            </h4>
            <div class="mini-meta">
              <span class="meta-source" data-source-id="${escapeHTML(story.sourceId)}">${escapeHTML(story.source)}</span>
              <span class="meta-sep" aria-hidden="true">·</span>
              <time class="meta-time">${formatRelativeTime(story.publishedAt)}</time>
              <span class="meta-sep" aria-hidden="true">·</span>
              <span class="meta-category" data-cat="${escapeHTML(story.category)}">${escapeHTML(story.category)}</span>
            </div>
          </article>
        `).join("")}
      </div>
    </div>
  `;

  // Attach interactive filter clicks for source and category
  container.querySelectorAll(".meta-source").forEach(el => {
    el.addEventListener("click", (e) => {
      e.preventDefault();
      const sourceName = el.textContent.trim();
      router.navigate("/search", { source: sourceName });
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
}
