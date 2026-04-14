import {
  ATTEMPT_STATS_KEY,
  BLOCKED_TAB_CONTEXTS_KEY,
  buildDynamicRules,
  ensureSettingsStored,
  getBlockedPageUrl,
  getNextBoundary,
  getSettings,
  getSiteForUrl,
  isBlockedNow,
  normalizeAttemptStats,
  normalizeBlockedTabContexts,
  saveSettings,
  SETTINGS_KEY
} from "./schedule.js";

const SYNC_ALARM_NAME = "brainrot-killer-sync";
const ATTEMPT_DEDUPE_TTL_MS = 2500;
const BLOCKED_PAGE_URL = chrome.runtime.getURL("blocked.html");
const MIN_DYNAMIC_RULE_ID = 100000;
const recentAttemptCache = new Map();
let syncQueue = Promise.resolve();

async function scheduleNextSync(settings) {
  const nextBoundary = getNextBoundary(settings);

  await chrome.alarms.clear(SYNC_ALARM_NAME);

  if (nextBoundary) {
    chrome.alarms.create(SYNC_ALARM_NAME, {
      when: nextBoundary.getTime()
    });
  }

  return nextBoundary;
}

async function resetDeclarativeNetRequestState() {
  const [dynamicRulesResult, sessionRulesResult, enabledRulesetsResult] = await Promise.allSettled([
    chrome.declarativeNetRequest.getDynamicRules(),
    chrome.declarativeNetRequest.getSessionRules(),
    chrome.declarativeNetRequest.getEnabledRulesets()
  ]);

  if (dynamicRulesResult.status === "fulfilled") {
    const dynamicRuleIds = dynamicRulesResult.value.map((rule) => rule.id);

    if (dynamicRuleIds.length > 0) {
      await chrome.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: dynamicRuleIds
      });
    }
  }

  if (sessionRulesResult.status === "fulfilled") {
    const sessionRuleIds = sessionRulesResult.value.map((rule) => rule.id);

    if (sessionRuleIds.length > 0) {
      await chrome.declarativeNetRequest.updateSessionRules({
        removeRuleIds: sessionRuleIds
      });
    }
  }

  if (enabledRulesetsResult.status === "fulfilled" && enabledRulesetsResult.value.length > 0) {
    await chrome.declarativeNetRequest.updateEnabledRulesets({
      disableRulesetIds: enabledRulesetsResult.value
    });
  }
}

async function rebuildDynamicRules(settings, shouldBlock) {
  const addRules = shouldBlock ? sanitizeDynamicRules(buildDynamicRules(settings)) : [];

  await resetDeclarativeNetRequestState();

  if (addRules.length > 0) {
    try {
      await chrome.declarativeNetRequest.updateDynamicRules({
        addRules
      });
    } catch (error) {
      if (!String(error?.message ?? "").includes("unique ID")) {
        throw error;
      }

      await resetDeclarativeNetRequestState();

      await chrome.declarativeNetRequest.updateDynamicRules({
        addRules
      });
    }
  }

  return addRules.length;
}

function sanitizeDynamicRules(rules) {
  const usedIds = new Set();
  let nextRuleId = MIN_DYNAMIC_RULE_ID;

  return rules.map((rule) => {
    let ruleId = Number.isInteger(rule?.id) ? rule.id : 0;

    if (ruleId < MIN_DYNAMIC_RULE_ID) {
      ruleId = MIN_DYNAMIC_RULE_ID + ruleId;
    }

    nextRuleId = Math.max(nextRuleId, ruleId + 1);

    while (usedIds.has(ruleId)) {
      ruleId = nextRuleId;
      nextRuleId += 1;
    }

    usedIds.add(ruleId);

    return {
      ...rule,
      id: ruleId
    };
  });
}

async function getBlockedTabContexts() {
  const stored = await chrome.storage.local.get(BLOCKED_TAB_CONTEXTS_KEY);
  return normalizeBlockedTabContexts(stored[BLOCKED_TAB_CONTEXTS_KEY]);
}

async function replaceBlockedTabContexts(contexts) {
  await chrome.storage.local.set({
    [BLOCKED_TAB_CONTEXTS_KEY]: normalizeBlockedTabContexts(contexts)
  });
}

async function setBlockedTabContext(tabId, context) {
  if (!Number.isInteger(tabId) || tabId < 0) {
    return;
  }

  const contexts = await getBlockedTabContexts();
  contexts[String(tabId)] = {
    siteId: context.siteId,
    sourceUrl: context.sourceUrl,
    blockedAt: new Date().toISOString()
  };

  await replaceBlockedTabContexts(contexts);
}

async function takeBlockedTabContext(tabId) {
  if (!Number.isInteger(tabId) || tabId < 0) {
    return null;
  }

  const contexts = await getBlockedTabContexts();
  const key = String(tabId);
  const context = contexts[key] ?? null;

  if (context) {
    delete contexts[key];
    await replaceBlockedTabContexts(contexts);
  }

  return context;
}

async function clearBlockedTabContext(tabId) {
  if (!Number.isInteger(tabId) || tabId < 0) {
    return;
  }

  const contexts = await getBlockedTabContexts();
  const key = String(tabId);

  if (!(key in contexts)) {
    return;
  }

  delete contexts[key];
  await replaceBlockedTabContexts(contexts);
}

function cleanupAttemptCache(now = Date.now()) {
  for (const [cacheKey, cacheTime] of recentAttemptCache.entries()) {
    if (now - cacheTime > ATTEMPT_DEDUPE_TTL_MS) {
      recentAttemptCache.delete(cacheKey);
    }
  }
}

async function recordBlockedAttempt(tabId, sourceUrl, siteId) {
  const now = Date.now();
  const cacheKey = `${tabId}:${siteId}:${sourceUrl}`;

  cleanupAttemptCache(now);

  if (recentAttemptCache.has(cacheKey)) {
    return false;
  }

  recentAttemptCache.set(cacheKey, now);

  const stored = await chrome.storage.local.get(ATTEMPT_STATS_KEY);
  const attemptDate = new Date(now);
  const hourKey = String(attemptDate.getHours());
  const stats = normalizeAttemptStats(stored[ATTEMPT_STATS_KEY], attemptDate);
  stats.total += 1;
  stats.bySiteId[siteId] = (stats.bySiteId[siteId] ?? 0) + 1;
  stats.byHour[hourKey] = (stats.byHour[hourKey] ?? 0) + 1;
  stats.lastAttemptAt = attemptDate.toISOString();

  await chrome.storage.local.set({ [ATTEMPT_STATS_KEY]: stats });
  return true;
}

async function redirectOpenTabs(settings) {
  const openTabs = await chrome.tabs.query({});

  await Promise.allSettled(
    openTabs.map(async (tab) => {
      const candidateUrl = tab.pendingUrl || tab.url;

      if (!Number.isInteger(tab.id) || !candidateUrl || candidateUrl.startsWith(BLOCKED_PAGE_URL)) {
        return;
      }

      const site = getSiteForUrl(candidateUrl, settings);

      if (!site) {
        return;
      }

      await setBlockedTabContext(tab.id, {
        siteId: site.id,
        sourceUrl: candidateUrl
      });

      await chrome.tabs.update(tab.id, {
        url: getBlockedPageUrl(site.id, candidateUrl)
      });
    })
  );
}

async function redirectTabIfBlocked(tabId, url, options = {}) {
  if (!Number.isInteger(tabId) || tabId < 0 || !url || url.startsWith(BLOCKED_PAGE_URL)) {
    return false;
  }

  const settings = options.settings ?? (await getSettings());

  if (!isBlockedNow(settings)) {
    await clearBlockedTabContext(tabId);
    return false;
  }

  const site = getSiteForUrl(url, settings);

  if (!site) {
    await clearBlockedTabContext(tabId);
    return false;
  }

  await setBlockedTabContext(tabId, {
    siteId: site.id,
    sourceUrl: url
  });

  if (options.recordAttempt) {
    await recordBlockedAttempt(tabId, url, site.id);
  }

  await chrome.tabs.update(tabId, {
    url: getBlockedPageUrl(site.id, url)
  });

  return true;
}

async function syncBlockingState(trigger) {
  const settings = await ensureSettingsStored();
  const shouldBlock = isBlockedNow(settings);
  const activeRuleCount = await rebuildDynamicRules(settings, shouldBlock);
  const nextBoundary = await scheduleNextSync(settings);

  if (shouldBlock) {
    await redirectOpenTabs(settings);
  }

  await chrome.storage.local.set({
    isBlockingActive: shouldBlock,
    activeRuleCount,
    settingsSnapshot: settings,
    lastSyncTrigger: trigger,
    lastSyncError: null,
    lastSyncedAt: new Date().toISOString(),
    nextBoundaryAt: nextBoundary ? nextBoundary.toISOString() : null
  });
}

function enqueueSync(trigger) {
  const task = syncQueue.then(() => syncBlockingState(trigger));
  syncQueue = task.catch(() => {});
  return task;
}

function runSync(trigger) {
  enqueueSync(trigger).catch((error) => {
    console.error(`Brainrot Defender sync failed during ${trigger}.`, error);
    chrome.storage.local
      .set({
        lastSyncTrigger: trigger,
        lastSyncError: error?.message ?? String(error),
        lastSyncedAt: new Date().toISOString()
      })
      .catch(() => {});
  });
}

async function handleBlockedNavigation(tabId, url) {
  if (!url || url.startsWith(BLOCKED_PAGE_URL)) {
    return;
  }

  const settings = await getSettings();

  if (!isBlockedNow(settings)) {
    return;
  }

  const site = getSiteForUrl(url, settings);

  if (!site) {
    return;
  }

  await setBlockedTabContext(tabId, {
    siteId: site.id,
    sourceUrl: url
  });

  await recordBlockedAttempt(tabId, url, site.id);
}

async function handleSpaBlockedNavigation(tabId, url) {
  const settings = await getSettings();
  await redirectTabIfBlocked(tabId, url, {
    settings,
    recordAttempt: true
  });
}

async function disableBlocking(tabId) {
  const settings = await getSettings();
  const savedSettings = await saveSettings({ ...settings, enabled: false });
  await enqueueSync("manual-unblock");

  let resumedUrl = null;
  let blockedContext = null;

  if (Number.isInteger(tabId) && tabId >= 0) {
    blockedContext = await takeBlockedTabContext(tabId);
    resumedUrl = blockedContext?.sourceUrl ?? null;
  }

  await replaceBlockedTabContexts({});

  if (Number.isInteger(tabId) && tabId >= 0) {
    if (resumedUrl) {
      await chrome.tabs.update(tabId, { url: resumedUrl });
    }
  }

  return { savedSettings, resumedUrl };
}

async function enableBlocking() {
  const settings = await getSettings();
  const savedSettings = await saveSettings({ ...settings, enabled: true });
  await enqueueSync("manual-enable");
  return savedSettings;
}

chrome.runtime.onInstalled.addListener(() => {
  runSync("installed");
});

chrome.runtime.onStartup.addListener(() => {
  runSync("startup");
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === SYNC_ALARM_NAME) {
    runSync("alarm");
  }
});

chrome.webNavigation.onBeforeNavigate.addListener((details) => {
  if (details.frameId !== 0) {
    return;
  }

  handleBlockedNavigation(details.tabId, details.url).catch((error) => {
    console.error("Brainrot Defender navigation tracking failed.", error);
  });
});

chrome.webNavigation.onCommitted.addListener((details) => {
  if (details.frameId !== 0) {
    return;
  }

  redirectTabIfBlocked(details.tabId, details.url, { recordAttempt: false }).catch((error) => {
    console.error("Brainrot Defender committed navigation blocking failed.", error);
  });
});

chrome.webNavigation.onHistoryStateUpdated.addListener((details) => {
  if (details.frameId !== 0) {
    return;
  }

  handleSpaBlockedNavigation(details.tabId, details.url).catch((error) => {
    console.error("Brainrot Defender SPA navigation blocking failed.", error);
  });
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  const candidateUrl = changeInfo.url || tab.pendingUrl || tab.url;

  if (!candidateUrl) {
    return;
  }

  redirectTabIfBlocked(tabId, candidateUrl, { recordAttempt: false }).catch((error) => {
    console.error("Brainrot Defender tab update blocking failed.", error);
  });
});

chrome.tabs.onRemoved.addListener((tabId) => {
  clearBlockedTabContext(tabId).catch(() => {});
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === "sync" && changes[SETTINGS_KEY]) {
    runSync("settings-changed");
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === "brainrot-settings-updated") {
    enqueueSync("settings-message")
      .then(() => sendResponse({ ok: true }))
      .catch((error) => {
        console.error("Brainrot Defender settings sync failed.", error);
        sendResponse({ ok: false, error: error?.message ?? String(error) });
      });
    return true;
  }

  if (message?.type === "brainrot-disable-blocking") {
    disableBlocking(sender.tab?.id)
      .then((result) => sendResponse({ ok: true, ...result }))
      .catch((error) => {
        console.error("Brainrot Defender unblock failed.", error);
        sendResponse({ ok: false, error: error?.message ?? String(error) });
      });
    return true;
  }

  if (message?.type === "brainrot-enable-blocking") {
    enableBlocking()
      .then((savedSettings) => sendResponse({ ok: true, savedSettings }))
      .catch((error) => {
        console.error("Brainrot Defender re-enable failed.", error);
        sendResponse({ ok: false, error: error?.message ?? String(error) });
      });
    return true;
  }

  if (message?.type === "brainrot-get-blocked-context") {
    Promise.all([
      getBlockedTabContexts(),
      chrome.storage.local.get([
        ATTEMPT_STATS_KEY,
        "activeRuleCount",
        "isBlockingActive",
        "lastSyncError",
        "lastSyncedAt",
        "nextBoundaryAt",
        "settingsSnapshot"
      ])
    ])
      .then(([contexts, runtimeState]) => {
        sendResponse({
          ok: true,
          context: sender.tab?.id ? contexts[String(sender.tab.id)] ?? null : null,
          attemptStats: normalizeAttemptStats(runtimeState[ATTEMPT_STATS_KEY]),
          runtimeState
        });
      })
      .catch((error) => {
        console.error("Brainrot Defender blocked context lookup failed.", error);
        sendResponse({ ok: false, error: error?.message ?? String(error) });
      });
    return true;
  }

  return false;
});

runSync("service-worker-load");
