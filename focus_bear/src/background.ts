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

    chrome.storage.local.set({ focusSessionState }, () => {
      console.log("Focus Session started:", focusSessionState);
    });

    sendResponse({ success: true });
    return true;
  }

  if (request.action === "pauseFocusSession") {
    chrome.storage.local.get("focusSessionState", (data) => {
      const state = data.focusSessionState;
      if (state) {
        const remaining = Math.max(Math.floor((state.endTime - Date.now()) / 1000), 0);
        const updated = { ...state, isRunning: false, timeLeft: remaining };
        chrome.storage.local.set({ focusSessionState: updated });
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
        chrome.storage.local.set({ focusSessionState });
      }
      sendResponse({ success: true });
    });
    return true;
  }

  if (request.action === "resetFocusSession") {
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
  return `${BLOCKED_PAGE}?d=${encodeURIComponent(host)}`;
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
});

export {};
