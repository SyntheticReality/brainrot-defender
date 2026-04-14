import { getSettings, getSiteForUrl, isBlockedNow } from "./schedule.js";

const searchParams = new URLSearchParams(window.location.search);
const sourceUrl = searchParams.get("from") || "";

async function maybeResumeSourceUrl() {
  if (!sourceUrl) {
    return;
  }

  try {
    const settings = await getSettings();
    const shouldStillBlock = isBlockedNow(settings) && Boolean(getSiteForUrl(sourceUrl, settings));

    if (!shouldStillBlock) {
      window.location.replace(sourceUrl);
    }
  } catch (error) {
    console.error("Brainrot Defender blocked page sync failed.", error);
  }
}

maybeResumeSourceUrl();
window.setInterval(maybeResumeSourceUrl, 5000);
