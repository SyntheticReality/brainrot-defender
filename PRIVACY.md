# Brainrot Defender Privacy Policy

Last updated: 2026-04-14

Brainrot Defender is a browser extension that blocks user-selected distraction sites on a schedule. This policy describes what data the extension handles, how it is used, and what is not shared.

## What The Extension Handles

- Browsing activity needed to determine whether a visited URL matches a blocked site.
- User settings such as enabled status, blocked days, scheduled blocking windows, and the list of blocked sites.
- Local runtime state such as blocked-attempt counts, timestamps, and temporary blocked-tab context used to return a tab to its original URL after blocking is disabled.

## How The Data Is Used

- To decide when blocking is active.
- To detect whether the current page matches a blocked site.
- To redirect blocked pages to the extension's defense screen.
- To show local usage insights in the popup, such as blocked attempts and top temptation sites.
- To restore a blocked tab to its original URL if the user disables blocking.

## Where The Data Is Stored

- Settings are stored in `chrome.storage.sync`.
- Runtime state is stored in `chrome.storage.local`.

## Data Sharing

Brainrot Defender does not transmit browsing activity, blocked-site settings, or local usage stats to any remote server controlled by the developer.

Brainrot Defender does not sell personal data, use browsing activity for advertising, or share browsing activity with third parties.

## Permissions

- `webNavigation` and site host permissions are used to detect and block configured sites.
- `tabs` is used to redirect blocked tabs and restore the original URL after blocking is disabled.
- `declarativeNetRequestWithHostAccess` is used to apply the active blocking rules.
- Optional host permissions are requested only when the user adds custom sites that are not already covered by the built-in list.

## User Control

- You can edit or remove blocked sites and schedules at any time from the extension popup.
- You can disable blocking at any time.
- You can remove the extension to stop all data handling and delete its stored data from Chrome.

## Contact

Questions about this policy should be directed through the publisher contact information listed on the Chrome Web Store page for Brainrot Defender.
