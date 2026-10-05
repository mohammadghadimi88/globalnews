/**
 * GlobalNews Header & Top Bar Module
 * Strictly follows the One-Row Three-Zone Top Bar Contract.
 */

import { toggleTheme } from "./theme.js";
import { router } from "../router.js";

export function initHeader() {
  const headerEl = document.getElementById("site-header");
  if (!headerEl) return;

  headerEl.innerHTML = `
    <div class="header-container">
      <!-- Zone 1: Single text element wordmark -->
      <div class="brand-zone">
        <a href="#/" class="brand-link" id="brand-home-link" aria-label="GlobalNews Homepage">
          <span>GlobalNews</span>
          <span class="brand-badge">Terminal</span>
        </a>
      </div>

      <!-- Zone 2: Navigation Links (Clean text links) -->
      <nav class="nav-zone" id="primary-nav" aria-label="Primary Categories">
        <a href="#/" class="nav-link" data-cat="all">All News</a>
        <a href="#/category/world" class="nav-link" data-cat="world">World</a>
        <a href="#/category/politics" class="nav-link" data-cat="politics">Politics</a>
        <a href="#/category/business" class="nav-link" data-cat="business">Business</a>
        <a href="#/category/technology" class="nav-link" data-cat="technology">Technology</a>
        <a href="#/category/science" class="nav-link" data-cat="science">Science</a>
        <a href="#/category/health" class="nav-link" data-cat="health">Health</a>
        <a href="#/category/sports" class="nav-link" data-cat="sports">Sports</a>
        <a href="#/category/culture" class="nav-link" data-cat="culture">Culture</a>
        <a href="#/category/environment" class="nav-link" data-cat="environment">Environment</a>
      </nav>

      <!-- Zone 3: Actions (Search affordance & Theme toggle) -->
      <div class="actions-zone">
        <button id="header-search-btn" class="action-btn" aria-label="Search global news">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
          <span>Search</span>
          <span class="kbd-hint" aria-hidden="true">/</span>
        </button>

        <button id="theme-toggle-btn" class="action-btn" aria-label="Toggle visual theme">
          <!-- Populated by theme.js -->
        </button>
      </div>
    </div>
  `;

  // Attach event handlers
  document.getElementById("theme-toggle-btn")?.addEventListener("click", toggleTheme);

  // Handle category navigation explicitly so the selected section is highlighted
  // immediately and consistently on GitHub Pages hash routing.
  document.querySelectorAll("#primary-nav .nav-link").forEach((link) => {
    link.addEventListener("click", (event) => {
      event.preventDefault();
      const category = link.getAttribute("data-cat") || "all";
      updateActiveNav(category);
      router.navigate(category === "all" ? "/" : `/category/${category}`);
    });
  });

  document.getElementById("header-search-btn")?.addEventListener("click", () => {
    router.navigate("/search");
  });

  // Global keyboard shortcut: pressing '/' focuses search
  window.addEventListener("keydown", (e) => {
    if (e.key === "/" && !["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement?.tagName)) {
      e.preventDefault();
      router.navigate("/search");
      setTimeout(() => {
        const searchInput = document.getElementById("search-input-field");
        if (searchInput) {
          searchInput.focus();
          searchInput.select();
        }
      }, 50);
    }
  });
}

export function updateActiveNav(category = "all") {
  const navLinks = document.querySelectorAll(".nav-zone .nav-link");
  navLinks.forEach((link) => {
    const cat = link.getAttribute("data-cat");
    if (cat === category || (!category && cat === "all")) {
      link.classList.add("active");
    } else {
      link.classList.remove("active");
    }
  });
}
