import {
  isFocusActive,
  buildFocusSessionState,
  computeTimeLeft,
  buildResumedSessionState,
} from "./lib/focus.js";
import { urlIsBlocklisted, buildBlockedUrl } from "./lib/blocklist.js";

const browserApi = chrome;

// Fires on a real install or version-upgrade. (only when you first load or bump the version field in manifest.json)
browserApi.runtime.onInstalled.addListener((details) => {
  console.log("onInstalled:", details.reason);
  clearSessionData();
  if (details.reason === "install") {
    setInstallToggleDefaults();
  }
});

browserApi.runtime.onStartup.addListener(() => {
  console.log("onStartup");
  clearSessionData();
});

function clearSessionData() {
  browserApi.storage.local.remove(
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

  browserApi.alarms.clearAll();
}

function setInstallToggleDefaults() {
  browserApi.storage.local.set(
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
    () => console.log("Install toggle defaults set"),
  );
}

// ------------------------------------------------ Notifications ------------------------------------------------ //

function showNotification(id: string, title: string, message: string) {
  browserApi.notifications.create(id, {
    type: "basic",
    iconUrl: browserApi.runtime.getURL("icons/bearLogo.png"),
    title,
    message,
    priority: 2,
  });
}

// ------------------------------------------------ Alarms ------------------------------------------------ //
// browserApi.alarms are used to fire notifications even when the popup is closed.
// Service workers can be terminated by Chrome at any time; alarms persist and
// will wake the service worker when they fire.

const ALARM_FOCUS_WORK = "focus_work";
const ALARM_FOCUS_BREAK = "focus_break";
const ALARM_UNFOCUS_PREFIX = "unfocus_";

browserApi.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === ALARM_FOCUS_WORK) {
    browserApi.storage.local.get("focusSessionState", ({ focusSessionState }) => {
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

      browserApi.storage.local.set({ focusSessionState: updated }, () => {
        browserApi.alarms.create(ALARM_FOCUS_BREAK, { when: breakEndTime });
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
    browserApi.storage.local.get("focusSessionState", ({ focusSessionState }) => {
      if (!focusSessionState?.isRunning || !focusSessionState.onBreak) return;

      browserApi.storage.local.remove("focusSessionState", () => {
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
    browserApi.storage.local.get("unfocusData", ({ unfocusData }) => {
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

browserApi.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "startFocusSession") {
    const { workDuration, breakDuration, onBreak, task } = request;

    const focusSessionState = buildFocusSessionState({
      workDuration,
      breakDuration,
      onBreak,
      task,
    });
    const { endTime } = focusSessionState;

    // Clear any previous focus alarms before starting fresh
    browserApi.alarms.clear(ALARM_FOCUS_WORK);
    browserApi.alarms.clear(ALARM_FOCUS_BREAK);

    browserApi.storage.local.set({ focusSessionState }, () => {
      const alarmName = onBreak ? ALARM_FOCUS_BREAK : ALARM_FOCUS_WORK;
      browserApi.alarms.create(alarmName, { when: endTime });
      sendResponse({ success: true });
    });

    return true;
  }

  if (request.action === "pauseFocusSession") {
    browserApi.storage.local.get("focusSessionState", (data) => {
      const state = data.focusSessionState;
      if (state) {
        const updated = { ...state, isRunning: false, timeLeft: computeTimeLeft(state) };
        browserApi.storage.local.set({ focusSessionState: updated });
        // Cancel alarms while paused, re-created on resume
        browserApi.alarms.clear(ALARM_FOCUS_WORK);
        browserApi.alarms.clear(ALARM_FOCUS_BREAK);
      }
      sendResponse({ success: true });
    });
    return true;
  }

  if (request.action === "resumeFocusSession") {
    browserApi.storage.local.get("focusSessionState", (data) => {
      const prev = data.focusSessionState;
      if (prev && !prev.isRunning && prev.timeLeft) {
        const focusSessionState = buildResumedSessionState(prev);
        const { endTime } = focusSessionState;
        browserApi.storage.local.set({ focusSessionState }, () => {
          const alarmName = prev.onBreak ? ALARM_FOCUS_BREAK : ALARM_FOCUS_WORK;
          browserApi.alarms.create(alarmName, { when: endTime });
        });
      }
      sendResponse({ success: true });
    });
    return true;
  }

  if (request.action === "resetFocusSession") {
    browserApi.alarms.clear(ALARM_FOCUS_WORK);
    browserApi.alarms.clear(ALARM_FOCUS_BREAK);
    browserApi.storage.local.remove("focusSessionState", () => {
      sendResponse({ success: true });
    });
    return true;
  }

  if (request.action === "getFocusSessionState") {
    browserApi.storage.local.get("focusSessionState", (data) => {
      sendResponse({ state: data.focusSessionState || null });
    });
    return true;
  }
});

// ----------------------------- Blocklist Enforcement ----------------------------- //
// Hard redirect any url that matches blocklisted string while in a Focus Session
// Redirects to blocked.html

const BLOCKED_PAGE = browserApi.runtime.getURL("blocked.html");

function maybeBlockTab(tabId: number, url: string | undefined) {
  if (!url) return;
  if (url.startsWith(BLOCKED_PAGE)) return; // already blocked

  browserApi.storage.local.get(
    ["focusSessionState", "blocklist"],
    ({ focusSessionState, blocklist }) => {
      if (!isFocusActive(focusSessionState)) return;
      const { blocked, host } = urlIsBlocklisted(url, blocklist);
      if (!blocked) return;
      browserApi.tabs.update(tabId, { url: buildBlockedUrl(BLOCKED_PAGE, host) }).catch((err) => {
        console.warn("[FocusBear] failed to redirect blocked tab:", err);
      });
    },
  );
}

// Catch new navigations as they happen.
browserApi.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  const candidate = changeInfo.url || (changeInfo.status === "loading" ? tab.url : undefined);
  if (candidate) {
    maybeBlockTab(tabId, candidate);
  }
});

// When the focus session starts (or the blocklist changes mid-session), sweep
// every open tab and redirect any that should now be blocked.
function sweepAllTabs() {
  browserApi.tabs.query({}, (tabs) => {
    for (const t of tabs) {
      if (t.id !== undefined && t.url) {
        maybeBlockTab(t.id, t.url);
      }
    }
  });
}

browserApi.storage.onChanged.addListener((changes, areaName) => {
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
        browserApi.alarms.clear(ALARM_UNFOCUS_PREFIX + domain);
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
          browserApi.alarms.create(ALARM_UNFOCUS_PREFIX + domain, { when: endTime });
          console.log("[FocusBear] Unfocus alarm set for " + domain);
        }
      }
    }
  }
});

export {};
