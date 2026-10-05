/**
 * GlobalNews Theme Manager
 * Light mode, Dark mode, and OS preference detection with localStorage persistence.
 */

const THEME_KEY = "globalnews-theme";

export function initTheme() {
  const savedTheme = localStorage.getItem(THEME_KEY);
  const systemPrefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  
  const activeTheme = savedTheme || (systemPrefersDark ? "dark" : "light");
  setTheme(activeTheme, false);

  // Listen to system theme changes if user hasn't explicitly chosen
  if (window.matchMedia) {
    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", (e) => {
      if (!localStorage.getItem(THEME_KEY)) {
        setTheme(e.matches ? "dark" : "light", false);
      }
    });
  }
}

export function setTheme(theme, persist = true) {
  document.documentElement.setAttribute("data-theme", theme);
  if (persist) {
    localStorage.setItem(THEME_KEY, theme);
  }
  updateThemeButtonUI(theme);
}

export function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute("data-theme") || "light";
  const newTheme = currentTheme === "dark" ? "light" : "dark";
  setTheme(newTheme, true);
}

function updateThemeButtonUI(theme) {
  const btn = document.getElementById("theme-toggle-btn");
  if (!btn) return;
  
  if (theme === "dark") {
    btn.innerHTML = `
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
      <span>Light</span>
    `;
    btn.setAttribute("aria-label", "Switch to light mode");
  } else {
    btn.innerHTML = `
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
      <span>Dark</span>
    `;
    btn.setAttribute("aria-label", "Switch to dark mode");
  }
}
