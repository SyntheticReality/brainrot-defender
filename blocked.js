import { getSiteForUrl, isBlockedNow } from "./schedule.js";

function isTrustedResumeUrl(value) {
  if (typeof value !== "string" || !value) {
    return false;
  }

  try {
    const candidate = new URL(value);
    return candidate.protocol === "http:" || candidate.protocol === "https:";
  } catch {
    return false;
  }
}

function shouldStayBlocked(sourceUrl, runtimeState) {
  if (!isTrustedResumeUrl(sourceUrl)) {
    return true;
  }

  const settingsSnapshot = runtimeState?.settingsSnapshot;

  if (!settingsSnapshot) {
    return runtimeState?.isBlockingActive !== false;
  }

  return isBlockedNow(settingsSnapshot) && Boolean(getSiteForUrl(sourceUrl, settingsSnapshot));
}

async function maybeResumeSourceUrl() {
  try {
    const response = await chrome.runtime.sendMessage({ type: "brainrot-get-blocked-context" });

    if (!response?.ok) {
      return;
    }

    const sourceUrl = response.context?.sourceUrl ?? "";

    if (isTrustedResumeUrl(sourceUrl) && !shouldStayBlocked(sourceUrl, response.runtimeState)) {
      window.location.replace(sourceUrl);
    }
  } catch (error) {
    console.error("Brainrot Defender blocked page resume check failed.", error);
  }
}

maybeResumeSourceUrl();
window.setInterval(maybeResumeSourceUrl, 5000);
