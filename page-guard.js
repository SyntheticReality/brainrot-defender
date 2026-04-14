const SETTINGS_KEY = "focusSettings";
const DEFAULT_SETTINGS = Object.freeze({
  enabled: false,
  blockedDays: Object.freeze([0, 1, 2, 3, 4, 5, 6]),
  windows: Object.freeze([
    Object.freeze({
      id: "window-1",
      start: "09:00",
      end: "18:00",
      enabled: true
    })
  ]),
  sites: Object.freeze([
    Object.freeze({ id: "x", domains: Object.freeze(["x.com", "twitter.com"]) }),
    Object.freeze({ id: "linkedin", domains: Object.freeze(["linkedin.com"]) }),
    Object.freeze({ id: "facebook", domains: Object.freeze(["facebook.com"]) }),
    Object.freeze({
      id: "youtube",
      domains: Object.freeze(["youtube.com", "youtu.be", "youtube-nocookie.com"])
    }),
    Object.freeze({ id: "instagram", domains: Object.freeze(["instagram.com"]) }),
    Object.freeze({ id: "tiktok", domains: Object.freeze(["tiktok.com"]) })
  ])
});

let redirectQueued = false;

function normalizeTimeValue(value, fallback) {
  if (typeof value !== "string") {
    return fallback;
  }

  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value.trim());
  return match ? `${match[1]}:${match[2]}` : fallback;
}

function parseTimeValue(value) {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value);

  if (!match) {
    return null;
  }

  return Number(match[1]) * 60 + Number(match[2]);
}

function matchesSiteDomain(hostname, domain) {
  return hostname === domain || hostname.endsWith(`.${domain}`);
}

function normalizeSettings(rawSettings) {
  const blockedDays = Array.isArray(rawSettings?.blockedDays)
    ? [...new Set(rawSettings.blockedDays.filter((dayId) => Number.isInteger(dayId) && dayId >= 0 && dayId <= 6))]
    : [...DEFAULT_SETTINGS.blockedDays];

  const windowsSource = Array.isArray(rawSettings?.windows) && rawSettings.windows.length > 0
    ? rawSettings.windows
    : DEFAULT_SETTINGS.windows;

  const windows = windowsSource
    .map((windowSettings, index) => ({
      id:
        typeof windowSettings?.id === "string" && windowSettings.id.trim()
          ? windowSettings.id.trim()
          : `window-${index + 1}`,
      enabled: typeof windowSettings?.enabled === "boolean" ? windowSettings.enabled : true,
      start: normalizeTimeValue(windowSettings?.start, index === 0 ? "09:00" : "18:00"),
      end: normalizeTimeValue(windowSettings?.end, index === 0 ? "18:00" : "19:00")
    }))
    .filter((windowSettings) => {
      const startMinutes = parseTimeValue(windowSettings.start);
      const endMinutes = parseTimeValue(windowSettings.end);
      return (
        windowSettings.enabled &&
        startMinutes !== null &&
        endMinutes !== null &&
        endMinutes > startMinutes
      );
    });

  const sitesSource = Array.isArray(rawSettings?.sites) ? rawSettings.sites : DEFAULT_SETTINGS.sites;
  const sites = sitesSource
    .map((site) => ({
      id:
        typeof site?.id === "string" && site.id.trim()
          ? site.id.trim()
          : "site",
      domains: Array.isArray(site?.domains)
        ? site.domains
            .map((domain) => (typeof domain === "string" ? domain.trim().toLowerCase() : ""))
            .filter(Boolean)
        : []
    }))
    .filter((site) => site.domains.length > 0);

  return {
    enabled: typeof rawSettings?.enabled === "boolean" ? rawSettings.enabled : DEFAULT_SETTINGS.enabled,
    blockedDays: blockedDays.length > 0 ? blockedDays : [...DEFAULT_SETTINGS.blockedDays],
    windows,
    sites
  };
}

function isBlockedNow(settings, date = new Date()) {
  if (!settings.enabled || settings.sites.length === 0 || !settings.blockedDays.includes(date.getDay())) {
    return false;
  }

  const currentMinutes = date.getHours() * 60 + date.getMinutes();

  return settings.windows.some((windowSettings) => {
    const startMinutes = parseTimeValue(windowSettings.start);
    const endMinutes = parseTimeValue(windowSettings.end);

    return (
      startMinutes !== null &&
      endMinutes !== null &&
      currentMinutes >= startMinutes &&
      currentMinutes < endMinutes
    );
  });
}

function getCurrentSite(settings) {
  const hostname = window.location.hostname.toLowerCase();

  return (
    settings.sites.find((site) => site.domains.some((domain) => matchesSiteDomain(hostname, domain))) ?? null
  );
}

function buildBlockedPageUrl(siteId) {
  const blockedUrl = new URL(chrome.runtime.getURL("blocked.html"));

  if (siteId) {
    blockedUrl.searchParams.set("site", siteId);
  }

  return blockedUrl.toString();
}

async function maybeRedirectCurrentPage() {
  if (!/^https?:$/.test(window.location.protocol)) {
    return;
  }

  const stored = await chrome.storage.sync.get(SETTINGS_KEY);
  const settings = normalizeSettings(stored[SETTINGS_KEY]);

  if (!isBlockedNow(settings)) {
    return;
  }

  const site = getCurrentSite(settings);

  if (!site) {
    return;
  }

  window.location.replace(buildBlockedPageUrl(site.id));
}

function queueRedirectCheck() {
  if (redirectQueued) {
    return;
  }

  redirectQueued = true;

  window.setTimeout(() => {
    redirectQueued = false;
    maybeRedirectCurrentPage().catch(() => {});
  }, 0);
}

const originalPushState = history.pushState.bind(history);
history.pushState = function pushStateOverride(...args) {
  const result = originalPushState(...args);
  queueRedirectCheck();
  return result;
};

const originalReplaceState = history.replaceState.bind(history);
history.replaceState = function replaceStateOverride(...args) {
  const result = originalReplaceState(...args);
  queueRedirectCheck();
  return result;
};

window.addEventListener("popstate", queueRedirectCheck, true);
window.addEventListener("hashchange", queueRedirectCheck, true);
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) {
    queueRedirectCheck();
  }
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === "sync" && changes[SETTINGS_KEY]) {
    queueRedirectCheck();
  }
});

queueRedirectCheck();
window.setInterval(queueRedirectCheck, 1200);
