// Fires on a real install or version-upgrade. (only when you first load or bump the version field in manifest.json)
chrome.runtime.onInstalled.addListener((details) => {
  console.log("onInstalled:", details.reason);
  resetDefaults();
});

// Fires whenever the service worker comes alive, including when you hit "Reload" in chrome://extensions.
chrome.runtime.onStartup.addListener(() => {
  console.log("onStartup");
  resetDefaults();
});

// Bring _all_ your flags back to true (or your chosen defaults).
function resetDefaults() {
  chrome.storage.local.remove(
    [
      "unfocusStart",
      "unfocusDuration",
      "unfocusIntention",
      "lastUnfocusIntention",
      "lastUnfocusDuration",
      "unfocusData",
      "focusSessionState",
    ],
    () => {
      console.log("Cleared focus & unfocus session data");
    },
  );

  // Clear any lingering alarms from a previous session
  chrome.alarms.clearAll();

  // The "first-run" gate
  chrome.storage.local.set(
    {
      showIntentionPopup: true,
      blurEnabled: true,
      commentsHidden: true,
      homePageBlurEnabled: true,
      shortsBlurEnabled: true,
      linkedinBlurNews: true,
      linkedinRemoveBadges: true,
      linkedinBlurHome: true,
    },
    () => console.log("Defaults reset on install/startup"),
  );
}

// ------------------------------------------------ Notifications ------------------------------------------------ //

function showNotification(id: string, title: string, message: string) {
  chrome.notifications.create(id, {
    type: "basic",
    iconUrl: chrome.runtime.getURL("icons/bearLogo.png"),
    title,
    message,
    priority: 2,
  });
}

// ------------------------------------------------ Alarms ------------------------------------------------ //
// chrome.alarms are used to fire notifications even when the popup is closed.
// Service workers can be terminated by Chrome at any time; alarms persist and
// will wake the service worker when they fire.

const ALARM_FOCUS_WORK = "focus_work";
const ALARM_FOCUS_BREAK = "focus_break";
const ALARM_UNFOCUS_PREFIX = "unfocus_";

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === ALARM_FOCUS_WORK) {
    chrome.storage.local.get("focusSessionState", ({ focusSessionState }) => {
      if (!focusSessionState?.isRunning || focusSessionState.onBreak) return;

      const { breakDuration } = focusSessionState;
      const now = Date.now();
      const breakEndTime = now + breakDuration * 1000;

      const updated = {
        ...focusSessionState,
        onBreak: true,
        startTime: now,
        endTime: breakEndTime,
        isRunning: true,
      };

      chrome.storage.local.set({ focusSessionState: updated }, () => {
        chrome.alarms.create(ALARM_FOCUS_BREAK, { when: breakEndTime });
        showNotification(
          "focus_work_done_" + Date.now(),
          "Work phase complete!",
          "Nice work! Your break has started, let's take a step away from the screen.",
        );
        console.log("[FocusBear] Work phase done; break started.");
      });
    });
    return;
  }

  // Break ended - session complete
  if (alarm.name === ALARM_FOCUS_BREAK) {
    chrome.storage.local.get("focusSessionState", ({ focusSessionState }) => {
      if (!focusSessionState?.isRunning || !focusSessionState.onBreak) return;

      chrome.storage.local.remove("focusSessionState", () => {
        showNotification(
          "focus_session_done_" + Date.now(),
          "Focus session complete!",
          "Break is over! Time to plan your next move.",
        );
        console.log("[FocusBear] Focus session fully complete.");
      });
    });
    return;
  }

  // Unfocus timer ended for a specific domain
  if (alarm.name.startsWith(ALARM_UNFOCUS_PREFIX)) {
    const domain = alarm.name.slice(ALARM_UNFOCUS_PREFIX.length);
    chrome.storage.local.get("unfocusData", ({ unfocusData }) => {
      if (!unfocusData?.[domain]) return;
      showNotification(
        "unfocus_done_" + domain + "_" + Date.now(),
        "Unfocus time is up!",
        "Your allowed time on " + domain + " has ended. Time to refocus!",
      );
      console.log("[FocusBear] Unfocus session expired for " + domain);
    });
    return;
  }
});

// ------------------------------------------------ Focus Session State Management ------------------------------------------------//
// The Focus Session is the primary, blocking focus state, activated by the Focus Timer.

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "startFocusSession") {
    const { workDuration, breakDuration, onBreak, task } = request;

    const startTime = Date.now();
    const duration = onBreak ? breakDuration : workDuration;
    const endTime = startTime + duration * 1000;

    const focusSessionState = {
      task: task || "",
      workDuration,
      breakDuration,
      startTime,
      endTime,
      isRunning: true,
      onBreak,
      started: true,
    };

    // Clear any previous focus alarms before starting fresh
    chrome.alarms.clear(ALARM_FOCUS_WORK);
    chrome.alarms.clear(ALARM_FOCUS_BREAK);

    chrome.storage.local.set({ focusSessionState }, () => {
      const alarmName = onBreak ? ALARM_FOCUS_BREAK : ALARM_FOCUS_WORK;
      chrome.alarms.create(alarmName, { when: endTime });
      sendResponse({ success: true });
    });

    return true;
  }

  if (request.action === "pauseFocusSession") {
    chrome.storage.local.get("focusSessionState", (data) => {
      const state = data.focusSessionState;
      if (state) {
        const remaining = Math.max(Math.floor((state.endTime - Date.now()) / 1000), 0);
        const updated = { ...state, isRunning: false, timeLeft: remaining };
        chrome.storage.local.set({ focusSessionState: updated });
        // Cancel alarms while paused, re-created on resume
        chrome.alarms.clear(ALARM_FOCUS_WORK);
        chrome.alarms.clear(ALARM_FOCUS_BREAK);
      }
      sendResponse({ success: true });
    });
    return true;
  }

  if (request.action === "resumeFocusSession") {
    chrome.storage.local.get("focusSessionState", (data) => {
      const prev = data.focusSessionState;
      if (prev && !prev.isRunning && prev.timeLeft) {
        const startTime = Date.now();
        const endTime = startTime + prev.timeLeft * 1000;
        const focusSessionState = { ...prev, startTime, endTime, isRunning: true };
        chrome.storage.local.set({ focusSessionState }, () => {
          const alarmName = prev.onBreak ? ALARM_FOCUS_BREAK : ALARM_FOCUS_WORK;
          chrome.alarms.create(alarmName, { when: endTime });
        });
      }
      sendResponse({ success: true });
    });
    return true;
  }

  if (request.action === "resetFocusSession") {
    chrome.alarms.clear(ALARM_FOCUS_WORK);
    chrome.alarms.clear(ALARM_FOCUS_BREAK);
    chrome.storage.local.remove("focusSessionState", () => {
      sendResponse({ success: true });
    });
    return true;
  }

  if (request.action === "getFocusSessionState") {
    chrome.storage.local.get("focusSessionState", (data) => {
      sendResponse({ state: data.focusSessionState || null });
    });
    return true;
  }
});

// ----------------------------- Blocklist Enforcement ----------------------------- //
// Hard redirect any url that matches blocklisted string while in a Focus Session
// Redirects to blocked.html

type FocusState = { started?: boolean; onBreak?: boolean } | undefined;

const BLOCKED_PAGE = chrome.runtime.getURL("blocked.html");

function isFocusActive(state: FocusState): boolean {
  return !!(state && state.started === true && state.onBreak !== true);
}

function urlIsBlocklisted(
  url: string,
  blocklist: string[] | undefined,
): { blocked: boolean; host: string } {
  if (!blocklist || blocklist.length === 0) return { blocked: false, host: "" };
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return { blocked: false, host: parsed.hostname };
    }
    const host = parsed.hostname;
    const blocked = blocklist.some((site) => site && host.includes(site));
    return { blocked, host };
  } catch {
    return { blocked: false, host: "" };
  }
}

function buildBlockedUrl(host: string): string {
  return BLOCKED_PAGE + "?d=" + encodeURIComponent(host);
}

function maybeBlockTab(tabId: number, url: string | undefined) {
  if (!url) return;
  if (url.startsWith(BLOCKED_PAGE)) return; // already blocked

  chrome.storage.local.get(
    ["focusSessionState", "blocklist"],
    ({ focusSessionState, blocklist }) => {
      if (!isFocusActive(focusSessionState)) return;
      const { blocked, host } = urlIsBlocklisted(url, blocklist);
      if (!blocked) return;
      chrome.tabs.update(tabId, { url: buildBlockedUrl(host) }).catch((err) => {
        console.warn("[FocusBear] failed to redirect blocked tab:", err);
      });
    },
  );
}

// Catch new navigations as they happen.
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  const candidate = changeInfo.url || (changeInfo.status === "loading" ? tab.url : undefined);
  if (candidate) {
    maybeBlockTab(tabId, candidate);
  }
});

// When the focus session starts (or the blocklist changes mid-session), sweep
// every open tab and redirect any that should now be blocked.
function sweepAllTabs() {
  chrome.tabs.query({}, (tabs) => {
    for (const t of tabs) {
      if (t.id !== undefined && t.url) {
        maybeBlockTab(t.id, t.url);
      }
    }
  });
}

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== "local") return;
  if (changes.focusSessionState || changes.blocklist) {
    sweepAllTabs();
  }

  // Manage unfocus session alarms whenever unfocusData changes
  if (changes.unfocusData) {
    const oldData = (changes.unfocusData.oldValue as Record<string, any>) || {};
    const newData = (changes.unfocusData.newValue as Record<string, any>) || {};

    // Clear alarms for sessions that were removed (manually completed or expired)
    for (const domain of Object.keys(oldData)) {
      if (!newData[domain]) {
        chrome.alarms.clear(ALARM_UNFOCUS_PREFIX + domain);
      }
    }

    // Create alarms for newly added unfocus sessions
    for (const [domain, data] of Object.entries(newData)) {
      if (!oldData[domain]) {
        const { unfocusStart, unfocusDuration } = data as {
          unfocusStart: number;
          unfocusDuration: number;
        };
        const endTime = unfocusStart + unfocusDuration * 60 * 1000;
        if (endTime > Date.now()) {
          chrome.alarms.create(ALARM_UNFOCUS_PREFIX + domain, { when: endTime });
          console.log("[FocusBear] Unfocus alarm set for " + domain);
        }
      }
    }
  }
});

export {};
