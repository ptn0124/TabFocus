// wxt auto-imports defineBackground and browser
import { focusStateStorage, blocklistStorage, DailyStudyData, studyDataStorage } from '../utils/storage';

export default defineBackground(() => {
  // Listen for navigation to block restricted sites
  browser.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    // We only care about URLs when they change
    if (!changeInfo.url) return;
    
    const urlStr = changeInfo.url;
    if (urlStr.startsWith('chrome://') || urlStr.startsWith('about:') || urlStr.startsWith('moz-extension://') || urlStr.startsWith('chrome-extension://')) {
      return; 
    }

    const focusState = await focusStateStorage.getValue();
    if (!focusState.isStudying) {
      return; // Not currently studying, no restrictions
    }

    const blocklist = await blocklistStorage.getValue();
    try {
      const url = new URL(urlStr);
      const isBlocked = blocklist.some((domain: string) => {
        return url.hostname === domain || url.hostname.endsWith('.' + domain) || urlStr.includes(domain);
      });

      if (isBlocked) {
        // Redirect to our block page
        const blockPageUrl = browser.runtime.getURL('/block.html' as any);
        browser.tabs.update(tabId, { url: blockPageUrl });
      }
    } catch (e) {
      // Invalid URL
    }
  });

  // A simple alarm to periodically run logic (e.g. daily resets, though popup usually computes)
  browser.alarms.create('focus-sync', { periodInMinutes: 1 });
  browser.alarms.onAlarm.addListener(async (alarm) => {
    if (alarm.name === 'focus-sync') {
       // Since the background worker could die, relying on alarms or popup to commit time is safer.
       // The timer logic will update elapsedSeconds when it's running. 
       // For exact 10-min block fractions, we compute dynamically in Popup based on elapsed time vs total time studied today.
    }
  });
});
