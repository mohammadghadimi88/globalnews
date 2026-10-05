/**
 * GlobalNews Monetization & Advertising Framework
 * Ads are strictly disabled in MVP (enableAds = false).
 * Provides clean architectural stubs so enabling monetization in the future
 * requires zero layout refactoring.
 */

import { CONFIG } from "../config.js";

export function initAds() {
  const isEnabled = CONFIG.enableAds === true;
  document.documentElement.setAttribute("data-ads-enabled", isEnabled ? "true" : "false");

  if (!isEnabled) {
    // Keep all ad slots empty and collapsed
    document.querySelectorAll(".ad-slot").forEach(slot => {
      slot.innerHTML = "";
      slot.style.display = "none";
    });
    return;
  }

  // Future slot rendering logic (e.g., AdSense or Direct Sponsor)
  renderAdSlots();
}

export function createAdSlot(slotType, slotId) {
  const isEnabled = CONFIG.enableAds === true;
  if (!isEnabled) {
    return `<div class="ad-slot ${slotType}" data-ad-slot="${slotId}" style="display: none;" aria-hidden="true"></div>`;
  }
  return `
    <div class="ad-slot ${slotType}" data-ad-slot="${slotId}">
      <span>Sponsor / Advertisement (${slotId})</span>
    </div>
  `;
}

function renderAdSlots() {
  document.querySelectorAll(".ad-slot").forEach(slot => {
    const slotId = slot.getAttribute("data-ad-slot") || "generic";
    slot.innerHTML = `<span>Sponsored Notice</span>`;
    slot.style.display = "flex";
  });
}
