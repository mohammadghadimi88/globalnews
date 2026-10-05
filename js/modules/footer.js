/**
 * GlobalNews Footer Module
 * Editorial philosophy, publisher attribution, legal design notices, and navigational links.
 */

import { router } from "../router.js";

export function renderFooter(containerId = "site-footer") {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = `
    <div class="footer-container">
      <div class="footer-top">
        <div>
          <span class="footer-brand">GlobalNews</span>
          <p class="footer-tagline">"Global news, without the noise."</p>
        </div>

        <nav class="footer-links" aria-label="Footer Navigation">
          <a href="#/" class="footer-link">Front Page</a>
          <a href="#/category/world" class="footer-link">World</a>
          <a href="#/category/business" class="footer-link">Business</a>
          <a href="#/category/technology" class="footer-link">Technology</a>
          <a href="#/category/science" class="footer-link">Science</a>
          <a href="#/search" class="footer-link">Search Terminal</a>
          <a href="#top" class="footer-link" id="footer-scroll-top">Back to Top ↑</a>
        </nav>
      </div>

      <div class="footer-bottom">
        <p class="footer-attribution">
          <strong>Content Policy &amp; Source Attribution:</strong>
          GlobalNews is a minimalist news discovery and navigation terminal. All article headlines, timestamps, and brief feed excerpts are credited to the original news organizations. When you select a story, you are directed immediately to the publisher's official website in a new tab. No full articles are scraped, mirrored, or republished.
        </p>
        <p class="footer-copy">
          Designed for speed, typography, and signal. Zero trackers. Pure static client.
        </p>
      </div>
    </div>
  `;

  container.querySelector("#footer-scroll-top")?.addEventListener("click", (e) => {
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
}
