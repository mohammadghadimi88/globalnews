/**
 * GlobalNews Facet Filters Module
 * Renders verified publishers list and region navigation widgets.
 */

import { getAllStories } from "../data.js";
import { router } from "../router.js";
import { escapeHTML } from "../data.js";

export function renderSourcesCard(container, activeSource = "") {
  if (!container) return;

  const stories = getAllStories();
  const sourceCounts = {};

  for (const s of stories) {
    const name = s.source || "Unknown";
    sourceCounts[name] = (sourceCounts[name] || 0) + 1;
  }

  // Sort by count descending
  const sortedSources = Object.entries(sourceCounts).sort((a, b) => b[1] - a[1]);

  container.innerHTML = `
    <div class="sources-card">
      <div class="section-header" style="margin-bottom: 0.75rem;">
        <h3 class="section-title" style="font-size: 1.1rem;">Reputable Publishers</h3>
        <span class="section-meta">${sortedSources.length} Active</span>
      </div>

      <div class="sources-list">
        <button class="source-item-btn ${!activeSource ? 'active' : ''}" data-source="">
          <span>All Publishers</span>
          <span class="source-item-count">${stories.length}</span>
        </button>
        ${sortedSources.map(([name, count]) => `
          <button class="source-item-btn ${activeSource.toLowerCase() === name.toLowerCase() ? 'active' : ''}" data-source="${escapeHTML(name)}">
            <span>${escapeHTML(name)}</span>
            <span class="source-item-count">${count}</span>
          </button>
        `).join("")}
      </div>
    </div>
  `;

  container.querySelectorAll(".source-item-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const src = btn.getAttribute("data-source");
      if (src) {
        router.navigate("/search", { source: src });
      } else {
        router.navigate("/");
      }
    });
  });
}
