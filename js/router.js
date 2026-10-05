/**
 * GlobalNews Lightweight Client-Side Router
 * Fully compatible with GitHub Pages static hosting using both History API and Hash fallback.
 */

class Router {
  constructor() {
    this.routes = {};
    this.currentRoute = null;
    this.params = {};
    this.queryParams = {};

    window.addEventListener("popstate", () => this.handleRoute());
    window.addEventListener("hashchange", () => this.handleRoute());
  }

  register(path, handler) {
    this.routes[path] = handler;
  }

  getCurrentPath() {
    // If hash routing is used (e.g. #/category/world or #search?q=ai)
    if (window.location.hash.startsWith("#/")) {
      const hashPath = window.location.hash.slice(1).split("?")[0];
      return hashPath || "/";
    }

    const pathname = window.location.pathname;
    // Normalize root path for sub-folder deployments (e.g. /repo-name/)
    if (pathname.includes("/category/")) {
      return pathname.slice(pathname.indexOf("/category/"));
    }
    if (pathname.includes("/search")) {
      return "/search";
    }
    return "/";
  }

  getQueryParams() {
    const searchStr = window.location.hash.includes("?")
      ? window.location.hash.slice(window.location.hash.indexOf("?"))
      : window.location.search;

    const params = new URLSearchParams(searchStr);
    const result = {};
    for (const [key, val] of params.entries()) {
      result[key] = val;
    }
    return result;
  }

  navigate(path, queryParams = {}, replace = false) {
    let url = path;
    const query = new URLSearchParams(queryParams).toString();
    if (query) {
      url += `?${query}`;
    }

    // Use hash navigation for reliable static hosting without 404 rewrite requirements
    const targetHash = `#${url}`;
    if (replace) {
      window.history.replaceState(null, "", targetHash);
    } else {
      window.history.pushState(null, "", targetHash);
    }
    this.handleRoute();
  }

  handleRoute() {
    const rawPath = this.getCurrentPath();
    const query = this.getQueryParams();

    // Check exact matches
    if (this.routes[rawPath]) {
      this.routes[rawPath]({ path: rawPath, params: {}, query });
      return;
    }

    // Check parameterized paths like /category/:cat
    for (const pattern in this.routes) {
      if (pattern.includes(":")) {
        const patternParts = pattern.split("/").filter(Boolean);
        const pathParts = rawPath.split("/").filter(Boolean);

        if (patternParts.length === pathParts.length) {
          const params = {};
          let matches = true;

          for (let i = 0; i < patternParts.length; i++) {
            if (patternParts[i].startsWith(":")) {
              const paramName = patternParts[i].slice(1);
              params[paramName] = decodeURIComponent(pathParts[i]);
            } else if (patternParts[i] !== pathParts[i]) {
              matches = false;
              break;
            }
          }

          if (matches) {
            this.routes[pattern]({ path: rawPath, params, query });
            return;
          }
        }
      }
    }

    // Fallback to root route
    if (this.routes["/"]) {
      this.routes["/"]({ path: "/", params: {}, query });
    }
  }

  init() {
    this.handleRoute();
  }
}

export const router = new Router();
