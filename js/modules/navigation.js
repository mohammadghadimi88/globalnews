/**
 * GlobalNews Navigation & Subcategory Ribbon Module
 */

import { CONFIG } from "../config.js";
import { router } from "../router.js";

export function renderSubcategoryRibbon(containerId, activeCategory, activeSubcategory = "") {
  const container = document.getElementById(containerId);
  if (!container) return;

  const catMeta = CONFIG.categories.find(c => c.id === activeCategory);
  if (!catMeta || !catMeta.subcategories || catMeta.subcategories.length === 0) {
    container.style.display = "none";
    container.innerHTML = "";
    return;
  }

  container.style.display = "block";
  const subcats = catMeta.subcategories;

  container.innerHTML = `
    <div class="ribbon-container">
      <span class="ribbon-label">${catMeta.name} Topics:</span>
      <button class="ribbon-pill ${!activeSubcategory ? 'active' : ''}" data-subcat="">All</button>
      ${subcats.map(sub => `
        <button class="ribbon-pill ${activeSubcategory === sub ? 'active' : ''}" data-subcat="${sub}">
          ${sub.charAt(0).toUpperCase() + sub.slice(1)}
        </button>
      `).join("")}
    </div>
  `;

  // Attach click handlers
  container.querySelectorAll(".ribbon-pill").forEach(btn => {
    btn.addEventListener("click", () => {
      const selectedSub = btn.getAttribute("data-subcat");
      if (selectedSub) {
        router.navigate(`/category/${activeCategory}`, { subcategory: selectedSub });
      } else {
        router.navigate(`/category/${activeCategory}`);
      }
    });
  });
}

export function hideSubcategoryRibbon(containerId) {
  const container = document.getElementById(containerId);
  if (container) {
    container.style.display = "none";
    container.innerHTML = "";
  }
}
