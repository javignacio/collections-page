"use strict";

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

function applyCollectionVisuals(card, config) {
  const icon = card.querySelector(".collection-icon");
  const image = document.createElement("img");
  image.src = config.logo;
  image.alt = "";
  image.decoding = "async";
  image.loading = "eager";
  icon.replaceChildren(image);

  if (config.logoStyle === "photo") icon.classList.add("is-photo");
  if (config.logoStyle === "dark") icon.classList.add("is-dark");
  if (config.logoStyle === "accent") icon.classList.add("is-accent");
  if (config.logoStyle === "crest") icon.classList.add("is-crest");
  if (config.logoStyle === "sprite") icon.classList.add("is-sprite");
  if (config.logoStyle === "shirt") icon.classList.add("is-shirt");

  const watermark = card.querySelector(".card-watermark");
  if (config.watermark) {
    watermark.style.backgroundImage = `url("${config.watermark}")`;
  }
}

function createLoadingCard(config) {
  const card = template.content.firstElementChild.cloneNode(true);
  card.dataset.collectionId = config.id;
  card.classList.add(`collection-${config.id}`);
  card.style.setProperty("--accent", config.accent || "#9ca3af");
  applyCollectionVisuals(card, config);
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
  const title = summary.title || config.title || config.id;

  card.classList.remove("is-loading", "has-error");
  card.querySelector(".collection-title").textContent = title;
  card.querySelector(".collection-description").textContent = summary.description || config.description || "Open this collection.";
  card.querySelector(".updated-label").textContent = formatUpdated(summary.updated);
  card.querySelector(".open-link").href = config.pageUrl;
  card.querySelector(".open-link").setAttribute("aria-label", `Open ${title}`);
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
  card.querySelector(".collection-title").textContent = config.title || config.id;
  card.querySelector(".collection-description").textContent = "The summary could not be loaded. The collection page may still be available.";
  card.querySelector(".metrics").innerHTML = `<div class="metric"><span class="metric-value">—</span><span class="metric-label">Unavailable</span></div>`;
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
  if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}`);
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
      footerUpdated.textContent = `Latest update: ${new Intl.DateTimeFormat(undefined, {
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
