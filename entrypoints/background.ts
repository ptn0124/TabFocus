// wxt auto-imports defineBackground and browser
import { focusStateStorage, blocklistStorage, DailyStudyData, studyDataStorage, standaloneTimerStorage } from '../utils/storage';

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
       
       // Update badge text if studying
       try {
         const focusState = await focusStateStorage.getValue();
         if (focusState?.isStudying && focusState.startTime) {
           const diff = Math.floor((Date.now() - focusState.startTime) / 1000) + focusState.elapsedSeconds;
           let m = Math.floor(diff / 60);
           let h = Math.floor(m / 60);
           m = m % 60;
           const badgeText = h > 0 ? `${h}h` : `${m}m`;
           if (browser.action) await browser.action.setBadgeText({ text: badgeText });
           else if (browser.browserAction) await browser.browserAction.setBadgeText({ text: badgeText });
         }
       } catch (err) {
         console.error('Badge update error', err);
       }
    } else if (alarm.name === 'countdown-timer') {
      try {
        const state = await standaloneTimerStorage.getValue();
        if (state.isRunning) {
          browser.notifications.create('countdown-done', {
            type: 'basic',
            iconUrl: browser.runtime.getURL('/icon/128.png'),
            title: 'TabFocus 타이머 종료',
            message: '설정한 카운트다운 시간이 모두 끝났습니다!',
          });
          await standaloneTimerStorage.setValue({ isRunning: false, endTime: null, remainingSeconds: 0 });
        }
      } catch (err) {
        console.error('Timer notification error', err);
      }
    }
  });

  // Watch for study state changes to immediately update the badge
  focusStateStorage.watch(async (state) => {
    try {
      if (state?.isStudying) {
        if (browser.action) {
          await browser.action.setBadgeBackgroundColor({ color: '#3b82f6' });
          await browser.action.setBadgeText({ text: 'ON' });
        } else if (browser.browserAction) {
          await browser.browserAction.setBadgeBackgroundColor({ color: '#3b82f6' });
          await browser.browserAction.setBadgeText({ text: 'ON' });
        }
      } else {
        if (browser.action) await browser.action.setBadgeText({ text: '' });
        else if (browser.browserAction) await browser.browserAction.setBadgeText({ text: '' });
      }
    } catch (err) {
      console.error('Badge watch error', err);
    }
  });

  // Initialize immediately on load in case we are already studying
  focusStateStorage.getValue().then(async (state) => {
    try {
      if (state?.isStudying) {
        let badgeText = 'ON';
        if (state.startTime) {
          const diff = Math.floor((Date.now() - (state.startTime || Date.now())) / 1000) + state.elapsedSeconds;
          let m = Math.floor(diff / 60);
          let h = Math.floor(m / 60);
          m = m % 60;
          badgeText = h > 0 ? `${h}h` : (m > 0 ? `${m}m` : 'ON');
        }
        
        if (browser.action) {
          await browser.action.setBadgeBackgroundColor({ color: '#3b82f6' });
          await browser.action.setBadgeText({ text: badgeText });
        } else if (browser.browserAction) {
          await browser.browserAction.setBadgeBackgroundColor({ color: '#3b82f6' });
          await browser.browserAction.setBadgeText({ text: badgeText });
        }
      } else {
        if (browser.action) await browser.action.setBadgeText({ text: '' });
        else if (browser.browserAction) await browser.browserAction.setBadgeText({ text: '' });
      }
    } catch (err) {
      console.error('Badge init error', err);
    }
  });

  // Schedule alarm for countdown timer
  standaloneTimerStorage.watch(async (state) => {
    try {
      if (state?.isRunning && state.endTime) {
        browser.alarms.create('countdown-timer', { when: state.endTime });
      } else {
        browser.alarms.clear('countdown-timer');
      }
    } catch (err) {
      console.error('Alarm creation error', err);
    }
  });
});
