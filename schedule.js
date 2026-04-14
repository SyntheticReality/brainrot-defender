export const SETTINGS_KEY = "focusSettings";
export const ATTEMPT_STATS_KEY = "blockedAttemptStats";
export const BLOCKED_TAB_CONTEXTS_KEY = "blockedTabContexts";
export const DYNAMIC_RULE_ID_OFFSET = 100000;

export const DAYS = Object.freeze([
  Object.freeze({ id: 0, shortLabel: "Sun", longLabel: "Sunday" }),
  Object.freeze({ id: 1, shortLabel: "Mon", longLabel: "Monday" }),
  Object.freeze({ id: 2, shortLabel: "Tue", longLabel: "Tuesday" }),
  Object.freeze({ id: 3, shortLabel: "Wed", longLabel: "Wednesday" }),
  Object.freeze({ id: 4, shortLabel: "Thu", longLabel: "Thursday" }),
  Object.freeze({ id: 5, shortLabel: "Fri", longLabel: "Friday" }),
  Object.freeze({ id: 6, shortLabel: "Sat", longLabel: "Saturday" })
]);

export const DEFAULT_SITE_SUGGESTIONS = Object.freeze([
  Object.freeze({
    id: "x",
    ruleId: 1001,
    label: "X",
    domains: Object.freeze(["x.com", "twitter.com"]),
    source: "suggested"
  }),
  Object.freeze({
    id: "linkedin",
    ruleId: 1002,
    label: "LinkedIn",
    domains: Object.freeze(["linkedin.com"]),
    source: "suggested"
  }),
  Object.freeze({
    id: "facebook",
    ruleId: 1003,
    label: "Facebook",
    domains: Object.freeze(["facebook.com"]),
    source: "suggested"
  }),
  Object.freeze({
    id: "youtube",
    ruleId: 1004,
    label: "YouTube",
    domains: Object.freeze(["youtube.com", "youtu.be", "youtube-nocookie.com"]),
    source: "suggested"
  }),
  Object.freeze({
    id: "instagram",
    ruleId: 1005,
    label: "Instagram",
    domains: Object.freeze(["instagram.com"]),
    source: "suggested"
  }),
  Object.freeze({
    id: "tiktok",
    ruleId: 1006,
    label: "TikTok",
    domains: Object.freeze(["tiktok.com"]),
    source: "suggested"
  })
]);

export const DEFAULT_SETTINGS = Object.freeze({
  enabled: false,
  blockedDays: Object.freeze(DAYS.map(({ id }) => id)),
  windows: Object.freeze([
    Object.freeze(createWindowEntry(0, { start: "09:00", end: "18:00" }))
  ]),
  sites: Object.freeze(DEFAULT_SITE_SUGGESTIONS.map(cloneSite))
});

const CLOCK_FORMATTER = new Intl.DateTimeFormat(undefined, {
  hour: "numeric",
  minute: "2-digit"
});

const HOUR_FORMATTER = new Intl.DateTimeFormat(undefined, {
  hour: "numeric"
});

const WEEKDAY_FORMATTER = new Intl.DateTimeFormat(undefined, { weekday: "long" });
const LEGACY_DEFAULT_WINDOWS = Object.freeze([
  Object.freeze({ start: "09:00", end: "12:00" }),
  Object.freeze({ start: "15:00", end: "19:00" })
]);

function cloneSite(site) {
  return {
    id: site.id,
    ruleId: site.ruleId,
    label: site.label,
    domains: [...site.domains],
    source: site.source
  };
}

function isPlainObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isValidDayId(value) {
  return Number.isInteger(value) && value >= 0 && value <= 6;
}

function normalizeCountMap(value, normalizeKey) {
  if (!isPlainObject(value)) {
    return {};
  }

  const normalized = {};

  for (const [rawKey, count] of Object.entries(value)) {
    const key = normalizeKey(rawKey);

    if (!key || !Number.isInteger(count) || count <= 0) {
      continue;
    }

    normalized[key] = count;
  }

  return normalized;
}

function normalizeSiteCountKey(value) {
  return typeof value === "string" && value ? value : null;
}

function normalizeHourCountKey(value) {
  const hour = Number(value);
  return Number.isInteger(hour) && hour >= 0 && hour <= 23 ? String(hour) : null;
}

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

function minutesToDate(minutes, baseDate = new Date()) {
  const value = new Date(baseDate);
  value.setHours(0, 0, 0, 0);
  value.setMinutes(minutes, 0, 0);
  return value;
}

export function createWindowEntry(index, overrides = {}) {
  return {
    id:
      typeof overrides.id === "string" && overrides.id.trim()
        ? overrides.id.trim()
        : `window-${index + 1}`,
    label:
      typeof overrides.label === "string" && overrides.label.trim()
        ? overrides.label.trim()
        : `Hour ${index + 1}`,
    enabled: typeof overrides.enabled === "boolean" ? overrides.enabled : true,
    start: normalizeTimeValue(
      overrides.start,
      index === 0 ? "09:00" : "18:00"
    ),
    end: normalizeTimeValue(
      overrides.end,
      index === 0 ? "18:00" : "19:00"
    )
  };
}

function normalizeWindow(windowSettings, fallbackWindow, index) {
  const fallback = fallbackWindow ?? createWindowEntry(index);

  return {
    id:
      typeof windowSettings?.id === "string" && windowSettings.id.trim()
        ? windowSettings.id.trim()
        : fallback.id,
    label:
      typeof windowSettings?.label === "string" && windowSettings.label.trim()
        ? windowSettings.label.trim()
        : fallback.label,
    enabled:
      typeof windowSettings?.enabled === "boolean"
        ? windowSettings.enabled
        : fallback.enabled,
    start: normalizeTimeValue(windowSettings?.start, fallback.start),
    end: normalizeTimeValue(windowSettings?.end, fallback.end)
  };
}

function normalizeSiteId(value, fallbackValue) {
  const candidate = typeof value === "string" && value.trim() ? value : fallbackValue;

  return String(candidate)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "site";
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function titleCaseLabel(value) {
  return value
    .split(".")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(".");
}

export function normalizeDomainInput(value) {
  if (typeof value !== "string") {
    return null;
  }

  let candidate = value.trim().toLowerCase();

  if (!candidate) {
    return null;
  }

  if (!candidate.includes("://")) {
    candidate = `https://${candidate}`;
  }

  try {
    const parsed = new URL(candidate);
    let hostname = parsed.hostname.toLowerCase().replace(/\.+$/g, "");

    if (hostname.startsWith("www.")) {
      hostname = hostname.slice(4);
    }

    if (!hostname || hostname.length > 253) {
      return null;
    }

    const segments = hostname.split(".");

    if (
      segments.length < 2 ||
      segments.some(
        (segment) =>
          !segment ||
          segment.length > 63 ||
          segment.startsWith("-") ||
          segment.endsWith("-") ||
          !/^[a-z0-9-]+$/.test(segment)
      )
    ) {
      return null;
    }

    return hostname;
  } catch {
    return null;
  }
}

function normalizeSiteEntry(site, fallbackSite = null) {
  const source = site?.source === "custom" ? "custom" : fallbackSite?.source ?? "suggested";

  const domainsSource = Array.isArray(site?.domains)
    ? site.domains
    : fallbackSite?.domains ?? [];

  const domains = [...new Set(domainsSource.map(normalizeDomainInput).filter(Boolean))];

  if (domains.length === 0) {
    return null;
  }

  const label =
    typeof site?.label === "string" && site.label.trim()
      ? site.label.trim()
      : fallbackSite?.label ?? titleCaseLabel(domains[0]);

  return {
    id: normalizeSiteId(site?.id, fallbackSite?.id ?? domains[0]),
    ruleId: Number.isInteger(site?.ruleId) && site.ruleId > 0 ? site.ruleId : fallbackSite?.ruleId,
    label,
    domains,
    source
  };
}

function dedupeSiteId(siteId, usedIds) {
  let candidate = siteId;
  let suffix = 2;

  while (usedIds.has(candidate)) {
    candidate = `${siteId}-${suffix}`;
    suffix += 1;
  }

  return candidate;
}

function isSettingsEqual(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function isLegacyDefaultWindowPreset(windows) {
  if (!Array.isArray(windows) || windows.length !== LEGACY_DEFAULT_WINDOWS.length) {
    return false;
  }

  return windows.every((windowSettings, index) => {
    const expected = LEGACY_DEFAULT_WINDOWS[index];

    return (
      normalizeTimeValue(windowSettings?.start, "") === expected.start &&
      normalizeTimeValue(windowSettings?.end, "") === expected.end
    );
  });
}

export function getDefaultSuggestedSites() {
  return DEFAULT_SITE_SUGGESTIONS.map(cloneSite);
}

export function normalizeSettings(settings = {}) {
  const blockedDaysSource = Array.isArray(settings.blockedDays)
    ? settings.blockedDays
    : DEFAULT_SETTINGS.blockedDays;

  const blockedDays = [...new Set(blockedDaysSource.filter(isValidDayId))].sort(
    (left, right) => left - right
  );
  const storedWindows = Array.isArray(settings.windows) ? settings.windows : null;
  const sourceWindows = isLegacyDefaultWindowPreset(storedWindows)
    ? DEFAULT_SETTINGS.windows
    : storedWindows ?? DEFAULT_SETTINGS.windows;

  const sourceSites = Array.isArray(settings.sites) ? settings.sites : getDefaultSuggestedSites();
  const fallbackById = new Map(DEFAULT_SITE_SUGGESTIONS.map((site) => [site.id, site]));
  const usedIds = new Set();
  const usedDomains = new Set();
  const usedRuleIds = new Set();
  const usedWindowIds = new Set();
  let nextRuleId = Math.max(
    2000,
    ...sourceSites.map((site) => (Number.isInteger(site?.ruleId) ? site.ruleId : 0)),
    ...DEFAULT_SITE_SUGGESTIONS.map((site) => site.ruleId)
  );
  const windows = (sourceWindows.length > 0 ? sourceWindows : DEFAULT_SETTINGS.windows)
    .map((windowSettings, index) =>
      normalizeWindow(windowSettings, DEFAULT_SETTINGS.windows[index], index)
    )
    .map((windowSettings, index) => {
      let windowId = windowSettings.id;
      let suffix = 2;

      while (usedWindowIds.has(windowId)) {
        windowId = `${windowSettings.id}-${suffix}`;
        suffix += 1;
      }

      usedWindowIds.add(windowId);

      return {
        ...windowSettings,
        id: windowId,
        label: windowSettings.label || `Hour ${index + 1}`
      };
    });

  const sites = sourceSites
    .map((site) => normalizeSiteEntry(site, fallbackById.get(site?.id) ?? null))
    .filter(Boolean)
    .map((site) => {
      const uniqueDomains = site.domains.filter((domain) => {
        if (usedDomains.has(domain)) {
          return false;
        }

        usedDomains.add(domain);
        return true;
      });

      if (uniqueDomains.length === 0) {
        return null;
      }

      const id = dedupeSiteId(site.id, usedIds);
      usedIds.add(id);

      let ruleId = site.ruleId;

      if (!Number.isInteger(ruleId) || ruleId <= 0 || usedRuleIds.has(ruleId)) {
        nextRuleId += 1;
        ruleId = nextRuleId;
      }

      usedRuleIds.add(ruleId);

      return {
        ...site,
        id,
        ruleId,
        domains: uniqueDomains
      };
    })
    .filter(Boolean);

  return {
    enabled: typeof settings.enabled === "boolean" ? settings.enabled : DEFAULT_SETTINGS.enabled,
    blockedDays,
    windows,
    sites
  };
}

export async function getSettings() {
  const stored = await chrome.storage.sync.get(SETTINGS_KEY);
  return normalizeSettings(stored[SETTINGS_KEY]);
}

export async function ensureSettingsStored() {
  const stored = await chrome.storage.sync.get(SETTINGS_KEY);
  const normalized = normalizeSettings(stored[SETTINGS_KEY]);

  if (!isSettingsEqual(stored[SETTINGS_KEY], normalized)) {
    await chrome.storage.sync.set({ [SETTINGS_KEY]: normalized });
  }

  return normalized;
}

export async function saveSettings(settings) {
  const normalized = normalizeSettings(settings);
  await chrome.storage.sync.set({ [SETTINGS_KEY]: normalized });
  return normalized;
}

export function getMinutesSinceMidnight(date = new Date()) {
  return date.getHours() * 60 + date.getMinutes();
}

export function getEnabledWindows(settings) {
  const normalized = normalizeSettings(settings);

  return normalized.windows
    .filter((window) => window.enabled)
    .map((window) => {
      const startMinutes = parseTimeValue(window.start);
      const endMinutes = parseTimeValue(window.end);

      if (startMinutes === null || endMinutes === null || endMinutes <= startMinutes) {
        return null;
      }

      return {
        ...window,
        startMinutes,
        endMinutes,
        displayLabel: `${formatClockTime(minutesToDate(startMinutes))} to ${formatClockTime(
          minutesToDate(endMinutes)
        )}`
      };
    })
    .filter(Boolean)
    .sort((left, right) => left.startMinutes - right.startMinutes);
}

export function isDaySelected(settings, dayId) {
  return normalizeSettings(settings).blockedDays.includes(dayId);
}

export function getActiveWindow(settings, date = new Date()) {
  const normalized = normalizeSettings(settings);

  if (
    !normalized.enabled ||
    normalized.sites.length === 0 ||
    !normalized.blockedDays.includes(date.getDay())
  ) {
    return null;
  }

  const currentMinutes = getMinutesSinceMidnight(date);

  return (
    getEnabledWindows(normalized).find(
      ({ startMinutes, endMinutes }) =>
        currentMinutes >= startMinutes && currentMinutes < endMinutes
    ) ?? null
  );
}

export function isBlockedNow(settings, date = new Date()) {
  return getActiveWindow(settings, date) !== null;
}

export function getNextBoundary(settings, date = new Date()) {
  const normalized = normalizeSettings(settings);
  const windows = getEnabledWindows(normalized);

  if (
    !normalized.enabled ||
    normalized.blockedDays.length === 0 ||
    windows.length === 0 ||
    normalized.sites.length === 0
  ) {
    return null;
  }

  const currentMinutes = getMinutesSinceMidnight(date);

  for (let dayOffset = 0; dayOffset < 14; dayOffset += 1) {
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    dayStart.setDate(dayStart.getDate() + dayOffset);

    if (!normalized.blockedDays.includes(dayStart.getDay())) {
      continue;
    }

    let nextBoundary = null;

    for (const window of windows) {
      for (const boundaryMinutes of [window.startMinutes, window.endMinutes]) {
        if (dayOffset === 0 && boundaryMinutes <= currentMinutes) {
          continue;
        }

        const boundary = minutesToDate(boundaryMinutes, dayStart);

        if (!nextBoundary || boundary < nextBoundary) {
          nextBoundary = boundary;
        }
      }
    }

    if (nextBoundary) {
      return nextBoundary;
    }
  }

  return null;
}

export function getNextUnblockTime(settings, date = new Date()) {
  const activeWindow = getActiveWindow(settings, date);

  if (!activeWindow) {
    return null;
  }

  return minutesToDate(activeWindow.endMinutes, date);
}

export function formatClockTime(date) {
  return CLOCK_FORMATTER.format(date);
}

export function formatBoundaryTime(date, referenceDate = new Date()) {
  if (date.toDateString() === referenceDate.toDateString()) {
    return formatClockTime(date);
  }

  return `${WEEKDAY_FORMATTER.format(date)} at ${formatClockTime(date)}`;
}

export function getSiteById(settings, siteId) {
  return normalizeSettings(settings).sites.find((site) => site.id === siteId) ?? null;
}

export function getSiteLabel(siteId, settings = DEFAULT_SETTINGS) {
  const activeSite = getSiteById(settings, siteId);

  if (activeSite) {
    return activeSite.label;
  }

  return DEFAULT_SITE_SUGGESTIONS.find((site) => site.id === siteId)?.label ?? "This site";
}

export function getBlockedSitesText(settings) {
  const sites = normalizeSettings(settings).sites;

  if (sites.length === 0) {
    return "No blocked sites selected";
  }

  return sites.map((site) => site.label).join(", ");
}

export function matchesSiteDomain(hostname, domain) {
  return hostname === domain || hostname.endsWith(`.${domain}`);
}

export function getSiteForUrl(url, settings = DEFAULT_SETTINGS) {
  try {
    const parsedUrl = new URL(url);

    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
      return null;
    }

    const hostname = parsedUrl.hostname.toLowerCase();

    return (
      normalizeSettings(settings).sites.find((site) =>
        site.domains.some((domain) => matchesSiteDomain(hostname, domain))
      ) ?? null
    );
  } catch {
    return null;
  }
}

export function getBlockedPagePath(siteId = "") {
  const query = siteId ? `?site=${encodeURIComponent(siteId)}` : "";
  return `/blocked.html${query}`;
}

export function getBlockedPageUrl(siteId, sourceUrl = "") {
  const pageUrl = new URL(chrome.runtime.getURL(getBlockedPagePath(siteId)));

  if (sourceUrl) {
    pageUrl.searchParams.set("from", sourceUrl);
  }

  return pageUrl.toString();
}

export function getSelectedDaySummary(settings) {
  const normalized = normalizeSettings(settings);

  if (normalized.blockedDays.length === 0) {
    return "No days selected";
  }

  if (normalized.blockedDays.length === DAYS.length) {
    return "All days";
  }

  const weekdayIds = [1, 2, 3, 4, 5];
  const weekendIds = [0, 6];

  if (
    normalized.blockedDays.length === weekdayIds.length &&
    weekdayIds.every((dayId) => normalized.blockedDays.includes(dayId))
  ) {
    return "Weekdays";
  }

  if (
    normalized.blockedDays.length === weekendIds.length &&
    weekendIds.every((dayId) => normalized.blockedDays.includes(dayId))
  ) {
    return "Weekends";
  }

  return DAYS.filter(({ id }) => normalized.blockedDays.includes(id))
    .map(({ shortLabel }) => shortLabel)
    .join(", ");
}

export function getMissingSuggestedSites(settings) {
  const activeSiteIds = new Set(normalizeSettings(settings).sites.map((site) => site.id));
  return DEFAULT_SITE_SUGGESTIONS.filter((site) => !activeSiteIds.has(site.id)).map(cloneSite);
}

export function getSuggestedSiteById(siteId) {
  const site = DEFAULT_SITE_SUGGESTIONS.find((entry) => entry.id === siteId);
  return site ? cloneSite(site) : null;
}

export function findSuggestedSiteByDomain(domain) {
  return (
    DEFAULT_SITE_SUGGESTIONS.find((site) =>
      site.domains.some((candidateDomain) => candidateDomain === domain)
    ) ?? null
  );
}

export function getNextSiteRuleId(settings) {
  const normalized = normalizeSettings(settings);
  return (
    Math.max(
      1000,
      ...normalized.sites.map((site) => site.ruleId),
      ...DEFAULT_SITE_SUGGESTIONS.map((site) => site.ruleId)
    ) + 1
  );
}

export function createCustomSiteEntry(inputValue, settings) {
  const domain = normalizeDomainInput(inputValue);

  if (!domain) {
    return null;
  }

  const normalized = normalizeSettings(settings);
  const baseId = normalizeSiteId(`custom-${domain}`, domain);
  const usedIds = new Set(normalized.sites.map((site) => site.id));
  const id = dedupeSiteId(baseId, usedIds);

  return {
    id,
    ruleId: getNextSiteRuleId(normalized),
    label: domain,
    domains: [domain],
    source: "custom"
  };
}

export function getOriginPatternsForDomain(domain) {
  return [`*://${domain}/*`, `*://*.${domain}/*`];
}

export function getOriginPatternsForSite(site) {
  return site.domains.flatMap((domain) => getOriginPatternsForDomain(domain));
}

export function buildDynamicRules(settings) {
  const domains = [
    ...new Set(normalizeSettings(settings).sites.flatMap((site) => site.domains))
  ];

  if (domains.length === 0) {
    return [];
  }

  return domains.map((domain, index) => ({
    id: DYNAMIC_RULE_ID_OFFSET + index,
    priority: 1,
    action: {
      type: "redirect",
      redirect: {
        extensionPath: "/blocked.html"
      }
    },
    condition: {
      urlFilter: `||${domain}^`,
      resourceTypes: ["main_frame"]
    }
  }));
}

export function getLocalDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function normalizeAttemptStats(stats = {}, date = new Date()) {
  const dateKey = getLocalDateKey(date);

  if (!isPlainObject(stats) || stats.dateKey !== dateKey) {
    return {
      dateKey,
      total: 0,
      bySiteId: {},
      byHour: {},
      lastAttemptAt: null
    };
  }

  const bySiteId = normalizeCountMap(stats.bySiteId, normalizeSiteCountKey);
  const byHour = normalizeCountMap(stats.byHour, normalizeHourCountKey);

  return {
    dateKey,
    total: Number.isInteger(stats.total) && stats.total >= 0 ? stats.total : 0,
    bySiteId,
    byHour,
    lastAttemptAt: typeof stats.lastAttemptAt === "string" ? stats.lastAttemptAt : null
  };
}

export function getAttemptTotal(stats, date = new Date()) {
  return normalizeAttemptStats(stats, date).total;
}

export function getTopAttemptSite(stats, settings = DEFAULT_SETTINGS, date = new Date()) {
  const normalizedStats = normalizeAttemptStats(stats, date);
  let topSiteId = null;
  let topCount = 0;

  for (const [siteId, count] of Object.entries(normalizedStats.bySiteId)) {
    if (count > topCount) {
      topSiteId = siteId;
      topCount = count;
    }
  }

  if (!topSiteId || topCount === 0) {
    return null;
  }

  const site = getSiteById(settings, topSiteId);

  return {
    siteId: topSiteId,
    label: site?.label ?? topSiteId,
    count: topCount
  };
}

export function getDangerHour(stats, date = new Date()) {
  const normalizedStats = normalizeAttemptStats(stats, date);
  let topHour = null;
  let topCount = 0;

  for (const [hourKey, count] of Object.entries(normalizedStats.byHour)) {
    const hour = Number(hourKey);

    if (
      count > topCount ||
      (count === topCount && Number.isInteger(topHour) && hour < topHour)
    ) {
      topHour = hour;
      topCount = count;
    } else if (count > 0 && topHour === null) {
      topHour = hour;
      topCount = count;
    }
  }

  if (!Number.isInteger(topHour) || topCount === 0) {
    return null;
  }

  return {
    hour: topHour,
    label: HOUR_FORMATTER.format(minutesToDate(topHour * 60, date)),
    count: topCount
  };
}

export function normalizeBlockedTabContexts(value) {
  if (!isPlainObject(value)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(value)
      .filter(([, context]) => isPlainObject(context) && typeof context.sourceUrl === "string")
      .map(([tabId, context]) => [
        tabId,
        {
          siteId: typeof context.siteId === "string" ? context.siteId : "",
          sourceUrl: context.sourceUrl,
          blockedAt: typeof context.blockedAt === "string" ? context.blockedAt : null
        }
      ])
  );
}
