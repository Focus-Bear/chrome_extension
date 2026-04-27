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
        const updated = {
          ...state,
          isRunning: false,
          timeLeft: remaining,
        };
        chrome.storage.local.set({ focusSessionState: updated }, () => {
          console.log("Focus Session paused:", updated);
        });
      }
      sendResponse({ success: true });
    });
    return true; // keep channel open for async
  }

  if (request.action === "resumeFocusSession") {
    chrome.storage.local.get("focusSessionState", (data) => {
      const prev = data.focusSessionState;
      if (prev && !prev.isRunning && prev.timeLeft) {
        const startTime = Date.now();
        const endTime = startTime + prev.timeLeft * 1000;
        const focusSessionState = {
          ...prev,
          startTime,
          endTime,
          isRunning: true,
        };
        chrome.storage.local.set({ focusSessionState }, () => {
          console.log("Focus Session resumed:", focusSessionState);
        });
      }
      sendResponse({ success: true });
    });
    return true;
  }

  if (request.action === "resetFocusSession") {
    chrome.storage.local.remove("focusSessionState", () => {
      console.log("Focus Session reset");
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

export {};
