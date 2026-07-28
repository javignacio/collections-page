"use strict";

const ICONS = {
  coin: `<svg viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="16" r="11"></circle><path d="M12 11.5h5.2a3.3 3.3 0 0 1 0 6.6H14a3.3 3.3 0 0 0 0 6.6h6"></path><path d="M16 8.5v15"></path></svg>`,
  game: `<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M9.5 10.5h13a6 6 0 0 1 5.7 7.9l-1.4 4.3a3.3 3.3 0 0 1-5.3 1.5l-2.1-1.8h-6.8l-2.1 1.8a3.3 3.3 0 0 1-5.3-1.5l-1.4-4.3a6 6 0 0 1 5.7-7.9Z"></path><path d="M10 15v5M7.5 17.5h5"></path><circle cx="21.5" cy="16" r="1"></circle><circle cx="24.5" cy="19" r="1"></circle></svg>`,
  disc: `<svg viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="16" r="11"></circle><circle cx="16" cy="16" r="3"></circle><path d="M16 5a11 11 0 0 1 11 11M8.2 23.8 13.9 18"></path></svg>`,
  shirt: `<svg viewBox="0 0 32 32" aria-hidden="true"><path d="m11 7 5 2.5L21 7l6 4-3.5 5-2.5-1.5V27H11V14.5L8.5 16 5 11l6-4Z"></path><path d="M13 8.2c.3 2 1.3 3 3 3s2.7-1 3-3"></path></svg>`,
  stadium: `<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M5 13c2.7-3 6.4-4.5 11-4.5S24.3 10 27 13v10c-2.7-3-6.4-4.5-11-4.5S7.7 20 5 23V13Z"></path><path d="M10 10.3v10.4M22 10.3v10.4M5 14h22M8 24h16"></path><ellipse cx="16" cy="16" rx="4.5" ry="2.5"></ellipse></svg>`
};

const grid = document.querySelector("#collection-grid");
const template = document.querySelector("#collection-card-template");
const portalStatus = document.querySelector("#portal-status");
const statusContainer = portalStatus.parentElement;
const footerUpdated = document.querySelector("#footer-updated");

function isLocalPreview() {
  return ["localhost", "127.0.0.1", "0.0.0.0"].includes(window.location.hostname);
}

function formatUpdated(value) {
  if (!value) return "Update date unavailable";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Update date unavailable";

  return `Updated ${new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric"
  }).format(date)}`;
}

function normalizeMetrics(metrics) {
  if (!Array.isArray(metrics)) return [];
  return metrics
    .filter((metric) => metric && metric.label !== undefined && metric.value !== undefined)
    .slice(0, 3);
}

function createLoadingCard(config) {
  const card = template.content.firstElementChild.cloneNode(true);
  card.dataset.collectionId = config.id;
  card.style.setProperty("--accent", config.accent || "#9ca3af");
  card.querySelector(".collection-icon").innerHTML = ICONS[config.icon] || ICONS.disc;
  card.querySelector(".collection-kicker").textContent = config.label || "COLLECTION";
  card.querySelector(".collection-title").textContent = "Loading collection";
  card.querySelector(".collection-description").textContent = "Loading the latest published summary.";
  card.querySelector(".metrics").innerHTML = [1, 2, 3]
    .map(() => `<div class="metric"><span class="metric-value">—</span><span class="metric-label">Loading</span></div>`)
    .join("");
  card.querySelector(".updated-label").textContent = "Loading…";
  card.querySelector(".open-link").href = config.pageUrl;
  grid.append(card);
  return card;
}

function populateCard(card, config, summary) {
  const metrics = normalizeMetrics(summary.metrics);
  card.classList.remove("is-loading", "has-error");
  card.querySelector(".collection-title").textContent = summary.title || config.id;
  card.querySelector(".collection-description").textContent = summary.description || "Open this collection.";
  card.querySelector(".updated-label").textContent = formatUpdated(summary.updated);
  card.querySelector(".open-link").href = config.pageUrl;
  card.querySelector(".open-link").setAttribute("aria-label", `Open ${summary.title || config.id}`);
  card.querySelector(".metrics").innerHTML = metrics.length
    ? metrics.map((metric) => `
      <div class="metric">
        <span class="metric-value" title="${escapeAttribute(metric.value)}">${escapeHtml(metric.value)}</span>
        <span class="metric-label" title="${escapeAttribute(metric.label)}">${escapeHtml(metric.label)}</span>
      </div>`).join("")
    : `<div class="metric"><span class="metric-value">—</span><span class="metric-label">No metrics</span></div>`;
}

function showCardError(card, config) {
  card.classList.remove("is-loading");
  card.classList.add("has-error");
  card.querySelector(".collection-title").textContent = config.id;
  card.querySelector(".collection-description").textContent = "The published summary could not be loaded. The collection page may still be available.";
  card.querySelector(".metrics").innerHTML = `
    <div class="metric"><span class="metric-value">—</span><span class="metric-label">Unavailable</span></div>`;
  card.querySelector(".updated-label").textContent = "Summary unavailable";
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttribute(value) {
  return escapeHtml(value);
}

async function fetchJson(url) {
  const separator = url.includes("?") ? "&" : "?";
  const response = await fetch(`${url}${separator}t=${Date.now()}`, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}`);
  }
  return response.json();
}

async function loadCollection(config) {
  const card = createLoadingCard(config);
  const summaryUrl = isLocalPreview() && config.localSummaryUrl
    ? config.localSummaryUrl
    : config.summaryUrl;

  try {
    const summary = await fetchJson(summaryUrl);
    populateCard(card, config, summary);
    return { ok: true, updated: summary.updated };
  } catch (error) {
    console.error(`Unable to load ${config.id}:`, error);
    showCardError(card, config);
    return { ok: false, updated: null };
  }
}

async function initialize() {
  try {
    const collections = await fetchJson("collections.json");
    if (!Array.isArray(collections) || collections.length === 0) {
      throw new Error("collections.json is empty or invalid");
    }

    const results = await Promise.all(collections.map(loadCollection));
    const successCount = results.filter((result) => result.ok).length;
    const errorCount = results.length - successCount;

    statusContainer.classList.toggle("is-ready", errorCount === 0);
    statusContainer.classList.toggle("has-errors", errorCount > 0);
    portalStatus.textContent = errorCount === 0
      ? `${successCount} collections online`
      : `${successCount} online · ${errorCount} unavailable`;

    const validDates = results
      .map((result) => result.updated && new Date(result.updated))
      .filter((date) => date instanceof Date && !Number.isNaN(date.getTime()));

    if (validDates.length) {
      const newest = new Date(Math.max(...validDates.map((date) => date.getTime())));
      footerUpdated.textContent = `Latest published update: ${new Intl.DateTimeFormat(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric"
      }).format(newest)}`;
    }
  } catch (error) {
    console.error("Unable to initialize the portal:", error);
    statusContainer.classList.add("has-errors");
    portalStatus.textContent = "Portal configuration unavailable";
    grid.innerHTML = `<p class="collection-description">The portal configuration could not be loaded.</p>`;
  }
}

initialize();
