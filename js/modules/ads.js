/** GlobalNews future monetization framework. Ads are intentionally disabled. */
import { CONFIG } from "../config.js";

export function initAds() {
  const enabled = CONFIG.enableAds === true;
  document.documentElement.setAttribute("data-ads-enabled", enabled ? "true" : "false");
  document.querySelectorAll(".ad-slot").forEach(slot => {
    if (!enabled) {
      slot.innerHTML = "";
      slot.style.display = "none";
      slot.setAttribute("aria-hidden", "true");
    } else {
      slot.style.display = "flex";
      slot.setAttribute("aria-hidden", "false");
    }
  });
}

export function createAdSlot(slotType, slotId) {
  const enabled = CONFIG.enableAds === true;
  return `<div class="ad-slot ${slotType}" data-ad-slot="${slotId}" ${enabled ? "" : 'style="display:none" aria-hidden="true"'}></div>`;
}