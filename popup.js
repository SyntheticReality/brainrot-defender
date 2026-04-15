import {
  ATTEMPT_STATS_KEY,
  DAYS,
  createCustomSiteEntry,
  createWindowEntry,
  formatClockTime,
  formatBoundaryTime,
  findSuggestedSiteByDomain,
  getAttemptTotal,
  getEnabledWindows,
  getMissingSuggestedSites,
  getOriginPatternsForDomain,
  getOriginPatternsForSite,
  getSelectedDaySummary,
  getSettings,
  getSiteById,
  getSuggestedSiteById,
  getTopAttemptSite,
  normalizeAttemptStats,
  normalizeDomainInput,
  saveSettings
} from "./schedule.js";
import {
  UNBLOCK_CHALLENGE_HISTORY_KEY,
  createUnblockChallenge,
  isMatchingUnblockPhrase,
  normalizeUnblockChallengeHistory,
  recordUnblockChallengeHistory,
  resolveChallengePhrase
} from "./unblock-flow.js";

const settingsForm = document.getElementById("settings-form");
const daysGridElement = document.getElementById("days-grid");
const hoursListElement = document.getElementById("hours-list");
const hoursToolbarElement = document.getElementById("hours-toolbar");
const hoursTitleElement = document.getElementById("hours-title");
const addWindowButtonElement = document.getElementById("add-window-button");
const statusChipElement = document.getElementById("status-chip");
const attemptsCardElement = document.getElementById("attempts-card");
const attemptsTotalElement = document.getElementById("attempts-total");
const insightsGridElement = document.getElementById("insights-grid");
const nextChangeLabelElement = document.getElementById("next-change-label");
const nextChangeValueElement = document.getElementById("next-change-value");
const topTemptationValueElement = document.getElementById("top-temptation-value");
const saveRowElement = document.getElementById("save-row");
const saveMessageElement = document.getElementById("save-message");
const modeActionButtonElement = document.getElementById("mode-action-button");
const sitesToolbarElement = document.getElementById("sites-toolbar");
const sitePanelTitleElement = document.getElementById("site-panel-title");
const siteToggleButtonElement = document.getElementById("site-toggle-button");
const siteListElement = document.getElementById("site-list");
const suggestedSectionElement = document.getElementById("suggested-section");
const suggestedListElement = document.getElementById("suggested-list");
const siteFormElement = document.getElementById("site-form");
const siteInputElement = document.getElementById("site-input");
const siteAddButtonElement = document.getElementById("site-add-button");
const siteMessageElement = document.getElementById("site-message");
const activeRulesCopyElement = document.getElementById("active-rules-copy");
const lastSyncCopyElement = document.getElementById("last-sync-copy");
const syncErrorCopyElement = document.getElementById("sync-error-copy");
const unblockOverlayElement = document.getElementById("unblock-overlay");
const modalTitleElement = document.getElementById("modal-title");
const modalContextElement = document.getElementById("modal-context");
const modalDescriptionElement = document.getElementById("modal-description");
const modalChoiceGroupElement = document.getElementById("modal-choice-group");
const modalChoiceLabelElement = document.getElementById("modal-choice-label");
const modalChoiceListElement = document.getElementById("modal-choice-list");
const modalPhraseElement = document.getElementById("modal-phrase");
const modalInputElement = document.getElementById("modal-input");
const modalErrorElement = document.getElementById("modal-error");
const modalCancelButtonElement = document.getElementById("modal-cancel-button");
const modalConfirmButtonElement = document.getElementById("modal-confirm-button");

let currentSettings = null;
let currentRuntimeState = null;
let unblockStepIndex = 0;
let unblockChallengeSession = null;
let selectedConsequenceId = "";
let unblockBusy = false;
let autoSaveTimer = null;
let autoSavePending = false;
let autoSaveInFlight = false;
let blockedSitesExpanded = false;

const POPUP_STATES = Object.freeze({
  DISABLED: "disabled",
  DEFENDING: "defending",
  ARMED: "armed"
});

function setElementVisible(element, visible) {
  element.hidden = !visible;
  element.style.display = visible ? "" : "none";
}

function setMessage(element, text, isError = false) {
  element.textContent = text;
  element.classList.toggle("error-copy", isError);
}

function getPopupState(settings, runtimeState) {
  if (!settings?.enabled) {
    return POPUP_STATES.DISABLED;
  }

  return runtimeState?.isBlockingActive ? POPUP_STATES.DEFENDING : POPUP_STATES.ARMED;
}

function setStatusChipState(state) {
  const chipCopy =
    state === POPUP_STATES.DEFENDING
      ? "DEFENDING"
      : state === POPUP_STATES.ARMED
        ? "ARMED"
        : "DISABLED";

  statusChipElement.textContent = chipCopy;
  statusChipElement.classList.remove(
    POPUP_STATES.DEFENDING,
    POPUP_STATES.ARMED,
    POPUP_STATES.DISABLED
  );
  statusChipElement.classList.add(state);
}

function formatSiteToggleLabel(siteCount) {
  const noun = siteCount === 1 ? "SITE" : "SITES";
  return `${siteCount} ${noun}`;
}

function formatSiteToggleAriaLabel(siteCount) {
  const noun = siteCount === 1 ? "site" : "sites";
  return `${blockedSitesExpanded ? "Hide" : "Show"} ${siteCount} blocked ${noun}`;
}

function formatTimestamp(value) {
  if (!value) {
    return "Not yet";
  }

  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
    month: "short",
    day: "numeric"
  }).format(new Date(value));
}

function addMinutesToTime(timeValue, deltaMinutes) {
  const [hours, minutes] = timeValue.split(":").map(Number);
  const totalMinutes = (hours * 60 + minutes + deltaMinutes + 24 * 60) % (24 * 60);
  const nextHours = String(Math.floor(totalMinutes / 60)).padStart(2, "0");
  const nextMinutes = String(totalMinutes % 60).padStart(2, "0");
  return `${nextHours}:${nextMinutes}`;
}

function isSameDay(leftDate, rightDate) {
  return leftDate.toDateString() === rightDate.toDateString();
}

function formatNextChangeTime(targetDate, referenceDate = new Date()) {
  if (isSameDay(targetDate, referenceDate)) {
    return formatClockTime(targetDate);
  }

  const tomorrow = new Date(referenceDate);
  tomorrow.setHours(0, 0, 0, 0);
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (isSameDay(targetDate, tomorrow)) {
    return `Tomorrow at ${formatClockTime(targetDate)}`;
  }

  return formatBoundaryTime(targetDate, referenceDate);
}

function getNextChangeSummary(popupState, runtimeState, referenceDate = new Date()) {
  const nextBoundary = runtimeState?.nextBoundaryAt ? new Date(runtimeState.nextBoundaryAt) : null;

  if (!nextBoundary || Number.isNaN(nextBoundary.getTime())) {
    return {
      label: popupState === POPUP_STATES.DEFENDING ? "DEFENSE ENDS" : "NEXT DEFENSE",
      value: "Standby"
    };
  }

  return {
    label: popupState === POPUP_STATES.DEFENDING ? "DEFENSE ENDS" : "NEXT DEFENSE",
    value: formatNextChangeTime(nextBoundary, referenceDate)
  };
}

function getTopTemptationSummary(settings, runtimeState, referenceDate = new Date()) {
  const topSite = getTopAttemptSite(runtimeState?.attemptStats, settings, referenceDate);

  if (!topSite) {
    return {
      value: "Clean"
    };
  }

  return {
    value: topSite.label
  };
}

async function loadRuntimeState() {
  const runtimeState = await chrome.storage.local.get([
    ATTEMPT_STATS_KEY,
    "activeRuleCount",
    "isBlockingActive",
    "lastSyncError",
    "lastSyncedAt",
    "nextBoundaryAt"
  ]);

  return {
    ...runtimeState,
    attemptStats: normalizeAttemptStats(runtimeState[ATTEMPT_STATS_KEY])
  };
}

function renderDayInputs(settings) {
  daysGridElement.textContent = "";

  if (settings.enabled) {
    const summary = document.createElement("div");
    summary.className = "compact-summary";
    summary.textContent = getSelectedDaySummary(settings).toUpperCase();
    daysGridElement.append(summary);
    return;
  }

  for (const day of DAYS) {
    const label = document.createElement("label");
    label.className = "day-chip";

    const input = document.createElement("input");
    input.type = "checkbox";
    input.name = "blockedDays";
    input.value = String(day.id);
    input.checked = settings.blockedDays.includes(day.id);

    const text = document.createElement("span");
    text.textContent = day.shortLabel;
    text.title = day.longLabel;

    label.append(input, text);
    daysGridElement.append(label);
  }
}

function renderHourRows(settings) {
  hoursListElement.textContent = "";

  if (settings.enabled) {
    const enabledWindows = getEnabledWindows(settings);

    if (enabledWindows.length === 0) {
      const emptyState = document.createElement("div");
      emptyState.className = "empty-state";
      emptyState.textContent = "No active blocks.";
      hoursListElement.append(emptyState);
      return;
    }

    enabledWindows.forEach((windowSettings) => {
      const row = document.createElement("div");
      row.className = "compact-row";
      row.textContent = windowSettings.displayLabel.toUpperCase();
      hoursListElement.append(row);
    });

    return;
  }

  if (settings.windows.length === 0) {
    const emptyState = document.createElement("div");
    emptyState.className = "empty-state";
    emptyState.textContent = "No hour windows added.";
    hoursListElement.append(emptyState);
    return;
  }

  settings.windows.forEach((windowSettings) => {
    const row = document.createElement("div");
    row.className = "hour-row";
    row.dataset.windowId = windowSettings.id;

    const prefix = document.createElement("div");
    prefix.className = "hour-index";
    prefix.textContent = "FROM";

    const start = document.createElement("input");
    start.type = "time";
    start.value = windowSettings.start;
    start.dataset.role = "start";

    const divider = document.createElement("span");
    divider.textContent = "TO";

    const end = document.createElement("input");
    end.type = "time";
    end.value = windowSettings.end;
    end.dataset.role = "end";

    const removeButton = document.createElement("button");
    removeButton.type = "button";
    removeButton.className = "ghost";
    removeButton.dataset.removeWindowId = windowSettings.id;
    removeButton.textContent = "Remove";

    row.append(prefix, start, divider, end, removeButton);
    hoursListElement.append(row);
  });
}

function renderScheduleForm(settings) {
  const compactView = settings.enabled;
  setElementVisible(addWindowButtonElement, !compactView);
  hoursToolbarElement.classList.toggle("toolbar-centered", compactView);
  hoursTitleElement.classList.toggle("centered", compactView);
  hoursListElement.classList.toggle("compact-list", compactView);
  renderDayInputs(settings);
  renderHourRows(settings);
}

function renderSites(settings) {
  const compactView = settings.enabled;
  siteListElement.textContent = "";
  suggestedListElement.textContent = "";
  setElementVisible(suggestedSectionElement, false);
  setElementVisible(siteFormElement, !compactView);
  sitesToolbarElement.classList.remove("toolbar-centered");
  sitePanelTitleElement.classList.remove("centered");
  siteListElement.classList.toggle("compact-list", compactView);
  setElementVisible(siteToggleButtonElement, compactView);

  if (compactView) {
    siteToggleButtonElement.textContent = formatSiteToggleLabel(settings.sites.length);
    siteToggleButtonElement.setAttribute("aria-expanded", String(blockedSitesExpanded));
    siteToggleButtonElement.setAttribute("aria-label", formatSiteToggleAriaLabel(settings.sites.length));
  } else {
    siteToggleButtonElement.setAttribute("aria-expanded", "false");
    siteToggleButtonElement.removeAttribute("aria-label");
  }

  if (settings.sites.length === 0) {
    const emptyState = document.createElement("div");
    emptyState.className = "empty-state";
    emptyState.textContent = "No sites selected.";
    siteListElement.append(emptyState);
  } else {
    for (const site of settings.sites) {
      const row = document.createElement("div");
      row.className = settings.enabled ? "compact-row compact-site-row" : "site-row";

      const meta = document.createElement("div");
      meta.className = "site-meta";

      const title = document.createElement("strong");
      title.className = "site-title";
      title.textContent = site.label;
      meta.append(title);

      row.append(meta);

      if (!settings.enabled) {
        const removeButton = document.createElement("button");
        removeButton.type = "button";
        removeButton.className = "site-remove-button icon-button";
        removeButton.dataset.removeSiteId = site.id;
        removeButton.textContent = "X";
        removeButton.title = `Remove ${site.label}`;
        removeButton.setAttribute("aria-label", `Remove ${site.label}`);
        row.append(removeButton);
      }

      siteListElement.append(row);
    }
  }

  setElementVisible(siteListElement, !compactView || blockedSitesExpanded);

  if (compactView) {
    return;
  }

  const missingSuggestedSites = getMissingSuggestedSites(settings);

  if (missingSuggestedSites.length === 0) {
    return;
  }

  setElementVisible(suggestedSectionElement, true);

  for (const site of missingSuggestedSites) {
    const row = document.createElement("div");
    row.className = "suggested-row";

    const meta = document.createElement("div");
    meta.className = "site-meta";

    const title = document.createElement("strong");
    title.className = "site-title";
    title.textContent = site.label;
    meta.append(title);

    const addButton = document.createElement("button");
    addButton.type = "button";
    addButton.className = "primary";
    addButton.dataset.addSuggestedSiteId = site.id;
    addButton.textContent = "Add";

    row.append(meta, addButton);
    suggestedListElement.append(row);
  }
}

function renderInsights(settings, runtimeState, popupState, referenceDate = new Date()) {
  const nextChange = getNextChangeSummary(popupState, runtimeState, referenceDate);
  const topTemptation = getTopTemptationSummary(settings, runtimeState, referenceDate);

  nextChangeLabelElement.textContent = nextChange.label;
  nextChangeValueElement.textContent = nextChange.value;
  topTemptationValueElement.textContent = topTemptation.value;
}

function renderRuntime(settings, runtimeState) {
  const now = new Date();
  const popupState = getPopupState(settings, runtimeState);
  const blockerEnabled = popupState !== POPUP_STATES.DISABLED;

  setStatusChipState(popupState);
  setElementVisible(attemptsCardElement, blockerEnabled);
  setElementVisible(insightsGridElement, blockerEnabled);
  setElementVisible(saveRowElement, !blockerEnabled);
  attemptsTotalElement.textContent = String(getAttemptTotal(runtimeState.attemptStats, now));
  renderInsights(settings, runtimeState, popupState, now);

  if (popupState === POPUP_STATES.DISABLED) {
    modeActionButtonElement.textContent = "ENABLE";
    modeActionButtonElement.className = "primary";
  } else if (popupState === POPUP_STATES.DEFENDING) {
    modeActionButtonElement.textContent = "UNBLOCK";
    modeActionButtonElement.className = "danger";
  } else {
    modeActionButtonElement.textContent = "DISABLE";
    modeActionButtonElement.className = "danger";
  }

  activeRulesCopyElement.textContent = `${runtimeState.activeRuleCount ?? 0} active`;
  lastSyncCopyElement.textContent = formatTimestamp(runtimeState.lastSyncedAt);
  syncErrorCopyElement.textContent = runtimeState.lastSyncError || "None";
}

function getBlockedSiteLabel(siteId, runtimeState, sourceUrl = "") {
  if (siteId) {
    const currentSite = currentSettings ? getSiteById(currentSettings, siteId) : null;
    const snapshotSite = runtimeState?.settingsSnapshot
      ? getSiteById(runtimeState.settingsSnapshot, siteId)
      : null;
    const matchedSite = currentSite ?? snapshotSite;

    if (matchedSite?.label) {
      return matchedSite.label;
    }
  }

  if (sourceUrl) {
    try {
      return new URL(sourceUrl).hostname.replace(/^www\./, "");
    } catch {
      return "this site";
    }
  }

  return "this site";
}

function buildUnblockChallengeContext(response) {
  const blockedContext = response?.context ?? null;
  const runtimeState = response?.runtimeState ?? {};
  const attemptStats = normalizeAttemptStats(
    response?.attemptStats ?? currentRuntimeState?.attemptStats ?? {}
  );
  const siteId = blockedContext?.siteId ?? "";
  const siteAttemptCountToday = siteId ? attemptStats.bySiteId[siteId] ?? 0 : 0;

  return {
    siteLabel: getBlockedSiteLabel(siteId, runtimeState, blockedContext?.sourceUrl ?? ""),
    siteAttemptCountToday,
    totalAttemptsToday: attemptStats.total ?? 0,
    hasBlockedContext: Boolean(blockedContext)
  };
}

async function getActiveTabId() {
  try {
    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    return Number.isInteger(activeTab?.id) ? activeTab.id : null;
  } catch {
    return null;
  }
}

async function loadUnblockChallengeHistory() {
  const stored = await chrome.storage.local.get(UNBLOCK_CHALLENGE_HISTORY_KEY);
  return normalizeUnblockChallengeHistory(stored[UNBLOCK_CHALLENGE_HISTORY_KEY]);
}

async function buildUnblockChallengeSession() {
  const activeTabId = await getActiveTabId();
  const history = await loadUnblockChallengeHistory();
  let context = {
    siteLabel: "this site",
    siteAttemptCountToday: 0,
    totalAttemptsToday: getAttemptTotal(currentRuntimeState?.attemptStats, new Date()),
    hasBlockedContext: false
  };

  try {
    const response = await chrome.runtime.sendMessage({
      type: "brainrot-get-blocked-context",
      tabId: activeTabId
    });

    if (response?.ok) {
      context = buildUnblockChallengeContext(response);
    }
  } catch (error) {
    console.error("Brainrot Defender unblock context lookup failed.", error);
  }

  const challengeSession = createUnblockChallenge(context, history);
  const nextHistory = recordUnblockChallengeHistory(history, challengeSession);
  await chrome.storage.local.set({ [UNBLOCK_CHALLENGE_HISTORY_KEY]: nextHistory });
  return challengeSession;
}

function getCurrentModalStep() {
  return unblockChallengeSession?.steps?.[unblockStepIndex] ?? null;
}

function getSelectedConsequence(step = getCurrentModalStep()) {
  if (!step?.consequenceOptions?.length) {
    return null;
  }

  return step.consequenceOptions.find((option) => option.id === selectedConsequenceId) ?? null;
}

function renderConsequenceChoices(step) {
  const consequenceOptions = step?.consequenceOptions ?? [];

  setElementVisible(modalChoiceGroupElement, consequenceOptions.length > 0);

  if (consequenceOptions.length === 0) {
    modalChoiceLabelElement.textContent = "";
    modalChoiceListElement.textContent = "";
    return;
  }

  modalChoiceLabelElement.textContent = step.choicePrompt;
  modalChoiceListElement.textContent = "";

  for (const option of consequenceOptions) {
    const button = document.createElement("button");
    const selected = option.id === selectedConsequenceId;
    button.type = "button";
    button.className = "consequence-option";
    button.dataset.consequenceId = option.id;
    button.setAttribute("aria-pressed", String(selected));

    const title = document.createElement("strong");
    title.textContent = option.label;

    const description = document.createElement("span");
    description.textContent = option.description;

    button.append(title, description);
    modalChoiceListElement.append(button);
  }
}

function renderModal() {
  const step = getCurrentModalStep();

  if (!step) {
    return;
  }

  const selectedConsequence = getSelectedConsequence(step);
  const resolvedPhrase = resolveChallengePhrase(step, selectedConsequence);
  const waitingForChoice = Boolean(step.consequenceOptions?.length) && !selectedConsequence;

  modalTitleElement.textContent = step.title;
  setElementVisible(modalTitleElement, Boolean(step.title));
  modalDescriptionElement.textContent = step.description;
  setElementVisible(modalDescriptionElement, Boolean(step.description));
  modalContextElement.textContent = unblockChallengeSession?.contextLine ?? "";
  setElementVisible(modalContextElement, Boolean(unblockChallengeSession?.contextLine));
  renderConsequenceChoices(step);
  modalPhraseElement.textContent = waitingForChoice
    ? "Choose your sacrifice to unlock the final sentence."
    : resolvedPhrase;
  modalPhraseElement.classList.toggle("pending", waitingForChoice);
  modalInputElement.value = "";
  modalInputElement.disabled = waitingForChoice || unblockBusy;
  modalInputElement.placeholder = waitingForChoice
    ? "Pick a consequence first"
    : "Type the phrase exactly";
  modalErrorElement.textContent = "";
  modalConfirmButtonElement.textContent = step.buttonLabel;
  modalConfirmButtonElement.disabled = unblockBusy || waitingForChoice;
  modalCancelButtonElement.disabled = unblockBusy;
}

function focusActiveModalControl() {
  const step = getCurrentModalStep();

  if (step?.consequenceOptions?.length && !getSelectedConsequence(step)) {
    modalChoiceListElement.querySelector("button[data-consequence-id]")?.focus();
    return;
  }

  modalInputElement.focus();
}

modalPhraseElement.addEventListener("copy", (event) => {
  event.preventDefault();
});

modalPhraseElement.addEventListener("cut", (event) => {
  event.preventDefault();
});

function openUnblockModal() {
  return buildUnblockChallengeSession().then((challengeSession) => {
    unblockChallengeSession = challengeSession;
    unblockStepIndex = 0;
    selectedConsequenceId = "";
    unblockBusy = false;
    document.body.classList.add("modal-open");
    renderModal();
    setElementVisible(unblockOverlayElement, true);
    focusActiveModalControl();
  });
}

function closeUnblockModal() {
  setElementVisible(unblockOverlayElement, false);
  document.body.classList.remove("modal-open");
  unblockStepIndex = 0;
  unblockChallengeSession = null;
  selectedConsequenceId = "";
  unblockBusy = false;
}

function collectSettingsFromForm() {
  if (currentSettings.enabled) {
    return {
      enabled: currentSettings.enabled,
      sites: currentSettings.sites,
      blockedDays: currentSettings.blockedDays,
      windows: currentSettings.windows
    };
  }

  return {
    enabled: currentSettings.enabled,
    sites: currentSettings.sites,
    blockedDays: [...daysGridElement.querySelectorAll('input[name="blockedDays"]:checked')].map(
      (input) => Number(input.value)
    ),
    windows: [...hoursListElement.querySelectorAll(".hour-row")].map((row, index) => ({
      id: row.dataset.windowId || `window-${index + 1}`,
      label: `Hour ${index + 1}`,
      enabled: true,
      start: row.querySelector('[data-role="start"]').value,
      end: row.querySelector('[data-role="end"]').value
    }))
  };
}

function buildNextWindow(settings) {
  const existingWindows = settings.windows;
  const lastWindow = existingWindows[existingWindows.length - 1] ?? null;
  const start = lastWindow?.end ?? "18:00";
  const end = addMinutesToTime(start, 60);

  return createWindowEntry(existingWindows.length, {
    id: `window-${Date.now()}-${existingWindows.length + 1}`,
    label: `Hour ${existingWindows.length + 1}`,
    start,
    end,
    enabled: true
  });
}

async function ensureSiteOriginsGranted(site) {
  if (site.source !== "custom") {
    return true;
  }

  const origins = getOriginPatternsForSite(site);

  const hasPermission = await chrome.permissions.contains({ origins });

  if (hasPermission) {
    return true;
  }

  return chrome.permissions.request({ origins });
}

async function syncSettings() {
  const response = await chrome.runtime.sendMessage({ type: "brainrot-settings-updated" });

  if (!response?.ok) {
    throw new Error(response?.error || "Settings sync failed.");
  }
}

async function disableBlockingFromPopup() {
  const response = await chrome.runtime.sendMessage({ type: "brainrot-disable-blocking" });

  if (!response?.ok) {
    throw new Error(response?.error || "Disable failed.");
  }
}

async function refreshPopup() {
  const wasEnabled = currentSettings?.enabled ?? false;
  currentSettings = await getSettings();

  if (currentSettings.enabled !== wasEnabled) {
    blockedSitesExpanded = false;
  }

  currentRuntimeState = await loadRuntimeState();
  renderScheduleForm(currentSettings);
  renderSites(currentSettings);
  renderRuntime(currentSettings, currentRuntimeState);
}

async function persistSettings(nextSettings, messageTarget, successMessage) {
  currentSettings = await saveSettings(nextSettings);
  await syncSettings();
  currentRuntimeState = await loadRuntimeState();
  renderScheduleForm(currentSettings);
  renderSites(currentSettings);
  renderRuntime(currentSettings, currentRuntimeState);
  setMessage(messageTarget, successMessage || "");
}

function sleep(ms) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

async function flushDraftSettings() {
  window.clearTimeout(autoSaveTimer);
  autoSavePending = false;

  while (autoSaveInFlight) {
    await sleep(40);
  }

  if (!currentSettings || currentSettings.enabled) {
    return;
  }

  await persistSettings(collectSettingsFromForm(), saveMessageElement, "");
}

async function runAutoSave() {
  if (autoSaveInFlight || !currentSettings) {
    autoSavePending = true;
    return;
  }

  autoSaveInFlight = true;
  try {
    await persistSettings(collectSettingsFromForm(), saveMessageElement, "");
  } catch (error) {
    console.error("Brainrot Defender schedule save failed.", error);
    setMessage(saveMessageElement, "Save failed.", true);
  } finally {
    autoSaveInFlight = false;

    if (autoSavePending) {
      autoSavePending = false;
      runAutoSave().catch(() => {});
    }
  }
}

function requestAutoSave() {
  autoSavePending = false;
  window.clearTimeout(autoSaveTimer);
  setMessage(saveMessageElement, "Saving...");
  autoSaveTimer = window.setTimeout(() => {
    runAutoSave().catch(() => {});
  }, 250);
}

settingsForm.addEventListener("submit", (event) => {
  event.preventDefault();
});

settingsForm.addEventListener("input", (event) => {
  if (event.target instanceof HTMLInputElement && event.target.type === "time") {
    requestAutoSave();
  }
});

settingsForm.addEventListener("change", (event) => {
  if (event.target instanceof HTMLInputElement && event.target.name === "blockedDays") {
    requestAutoSave();
  }
});

addWindowButtonElement.addEventListener("click", () => {
  const draftSettings = collectSettingsFromForm();
  currentSettings = {
    ...currentSettings,
    ...draftSettings,
    windows: [...draftSettings.windows, buildNextWindow(draftSettings)]
  };
  renderScheduleForm(currentSettings);
  requestAutoSave();
});

hoursListElement.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-remove-window-id]");

  if (!button) {
    return;
  }

  const draftSettings = collectSettingsFromForm();
  currentSettings = {
    ...currentSettings,
    ...draftSettings,
    windows: draftSettings.windows.filter((window) => window.id !== button.dataset.removeWindowId)
  };
  renderScheduleForm(currentSettings);
  requestAutoSave();
});

siteListElement.addEventListener("click", async (event) => {
  const button = event.target.closest("button[data-remove-site-id]");

  if (!button) {
    return;
  }

  button.disabled = true;
  setMessage(siteMessageElement, "Updating...");

  try {
    const draftSettings = collectSettingsFromForm();
    const nextSites = currentSettings.sites.filter((site) => site.id !== button.dataset.removeSiteId);
    await persistSettings({ ...draftSettings, sites: nextSites }, siteMessageElement, "Site removed.");
  } catch (error) {
    console.error("Brainrot Defender site removal failed.", error);
    setMessage(siteMessageElement, "Remove failed.", true);
  } finally {
    button.disabled = false;
  }
});

suggestedListElement.addEventListener("click", async (event) => {
  const button = event.target.closest("button[data-add-suggested-site-id]");

  if (!button) {
    return;
  }

  const suggestedSite = getSuggestedSiteById(button.dataset.addSuggestedSiteId);

  if (!suggestedSite) {
    return;
  }

  button.disabled = true;
  setMessage(siteMessageElement, "Adding...");

  try {
    const granted = await ensureSiteOriginsGranted(suggestedSite);

    if (!granted) {
      setMessage(siteMessageElement, "Permission denied.", true);
      return;
    }

    const draftSettings = collectSettingsFromForm();
    await persistSettings(
      { ...draftSettings, sites: [...currentSettings.sites, suggestedSite] },
      siteMessageElement,
      `${suggestedSite.label} added.`
    );
  } catch (error) {
    console.error("Brainrot Defender suggested site restore failed.", error);
    setMessage(siteMessageElement, "Add failed.", true);
  } finally {
    button.disabled = false;
  }
});

siteFormElement.addEventListener("submit", async (event) => {
  event.preventDefault();
  siteAddButtonElement.disabled = true;

  const rawValue = siteInputElement.value;
  const normalizedDomain = normalizeDomainInput(rawValue);

  if (!normalizedDomain) {
    setMessage(siteMessageElement, "Enter a valid domain or URL.", true);
    siteAddButtonElement.disabled = false;
    return;
  }

  const activeSite = currentSettings.sites.find((site) => site.domains.includes(normalizedDomain));

  if (activeSite) {
    setMessage(siteMessageElement, `${activeSite.label} is already blocked.`, true);
    siteAddButtonElement.disabled = false;
    return;
  }

  const missingSuggestedSite = getMissingSuggestedSites(currentSettings).find((site) =>
    site.domains.includes(normalizedDomain)
  );

  try {
    const draftSettings = collectSettingsFromForm();

    if (missingSuggestedSite) {
      const granted = await ensureSiteOriginsGranted(missingSuggestedSite);

      if (!granted) {
        setMessage(siteMessageElement, "Permission denied.", true);
        return;
      }

      await persistSettings(
        { ...draftSettings, sites: [...currentSettings.sites, missingSuggestedSite] },
        siteMessageElement,
        `${missingSuggestedSite.label} added.`
      );
      siteInputElement.value = "";
      return;
    }

    const suggestedConflict = findSuggestedSiteByDomain(normalizedDomain);

    if (suggestedConflict && currentSettings.sites.some((site) => site.id === suggestedConflict.id)) {
      setMessage(siteMessageElement, `${suggestedConflict.label} already covers that domain.`, true);
      return;
    }

    setMessage(siteMessageElement, "Requesting permission...");
    const granted = await chrome.permissions.request({
      origins: getOriginPatternsForDomain(normalizedDomain)
    });

    if (!granted) {
      setMessage(siteMessageElement, "Permission denied.", true);
      return;
    }

    const newSite = createCustomSiteEntry(normalizedDomain, currentSettings);

    if (!newSite) {
      setMessage(siteMessageElement, "Could not add that domain.", true);
      return;
    }

    await persistSettings(
      { ...draftSettings, sites: [...currentSettings.sites, newSite] },
      siteMessageElement,
      `${newSite.label} added.`
    );
    siteInputElement.value = "";
  } catch (error) {
    console.error("Brainrot Defender add-site flow failed.", error);
    setMessage(siteMessageElement, "Add failed.", true);
  } finally {
    siteAddButtonElement.disabled = false;
  }
});

siteToggleButtonElement.addEventListener("click", () => {
  if (!currentSettings?.enabled) {
    return;
  }

  blockedSitesExpanded = !blockedSitesExpanded;
  renderSites(currentSettings);
});

modeActionButtonElement.addEventListener("click", async () => {
  const popupState = getPopupState(currentSettings, currentRuntimeState);

  if (popupState === POPUP_STATES.DEFENDING || popupState === POPUP_STATES.ARMED) {
    modeActionButtonElement.disabled = true;

    try {
      await openUnblockModal();
    } catch (error) {
      console.error("Brainrot Defender unblock modal open failed.", error);
    } finally {
      modeActionButtonElement.disabled = false;
    }

    return;
  }

  modeActionButtonElement.disabled = true;

  setMessage(saveMessageElement, "Enabling...");

  try {
    await flushDraftSettings();
    const response = await chrome.runtime.sendMessage({ type: "brainrot-enable-blocking" });

    if (!response?.ok) {
      throw new Error(response?.error || "Enable failed.");
    }

    await refreshPopup();
    setMessage(saveMessageElement, "");
  } catch (error) {
    console.error("Brainrot Defender enable failed.", error);
    setMessage(saveMessageElement, "Enable failed.", true);
  } finally {
    modeActionButtonElement.disabled = false;
  }
});

modalCancelButtonElement.addEventListener("click", () => {
  if (!unblockBusy) {
    closeUnblockModal();
  }
});

modalChoiceListElement.addEventListener("click", (event) => {
  if (unblockBusy) {
    return;
  }

  const button = event.target.closest("button[data-consequence-id]");

  if (!button) {
    return;
  }

  selectedConsequenceId = button.dataset.consequenceId || "";
  modalErrorElement.textContent = "";
  renderModal();
  focusActiveModalControl();
});

modalConfirmButtonElement.addEventListener("click", async () => {
  const step = getCurrentModalStep();
  const selectedConsequence = getSelectedConsequence(step);

  if (!step) {
    return;
  }

  if (step.consequenceOptions?.length && !selectedConsequence) {
    modalErrorElement.textContent = "Pick the consequence first.";
    focusActiveModalControl();
    return;
  }

  if (!isMatchingUnblockPhrase(step, modalInputElement.value, selectedConsequence)) {
    modalErrorElement.textContent = "Phrase mismatch. Copy it exactly.";
    modalInputElement.focus();
    modalInputElement.select();
    return;
  }

  if (unblockStepIndex < (unblockChallengeSession?.steps?.length ?? 0) - 1) {
    unblockStepIndex += 1;
    selectedConsequenceId = "";
    renderModal();
    focusActiveModalControl();
    return;
  }

  unblockBusy = true;
  modalInputElement.disabled = true;
  modalConfirmButtonElement.disabled = true;
  modalCancelButtonElement.disabled = true;
  modalErrorElement.textContent = "";

  try {
    await disableBlockingFromPopup();
    closeUnblockModal();
    await refreshPopup();
    setMessage(saveMessageElement, "Blocking disabled.");
  } catch (error) {
    console.error("Brainrot Defender unblock flow failed.", error);
    unblockBusy = false;
    modalInputElement.disabled = false;
    modalConfirmButtonElement.disabled = false;
    modalCancelButtonElement.disabled = false;
    modalErrorElement.textContent = error?.message || "Disable failed.";
  }
});

refreshPopup().catch((error) => {
  console.error("Brainrot Defender popup load failed.", error);
  setStatusChipState(POPUP_STATES.DISABLED);
});
