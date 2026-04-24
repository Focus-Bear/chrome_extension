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
      "focusStart",
      "focusDuration",
      "focusIntention",
      "lastIntention",
      "lastFocusDuration",
      "focusData",
    ],
    () => {
      console.log("Cleared focus session data");
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

// ------------------------------------------------ Pomodoro State Management ------------------------------------------------//

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "startPomodoro") {
    const { workDuration, breakDuration, onBreak, task } = request;

    const startTime = Date.now();
    const duration = onBreak ? breakDuration : workDuration;
    const endTime = startTime + duration * 1000;

    const pomodoroState = {
      task: task || "",
      workDuration,
      breakDuration,
      startTime,
      endTime,
      isRunning: true,
      onBreak,
      started: true,
    };

    chrome.storage.local.set({ pomodoroState }, () => {
      console.log("Pomodoro started:", pomodoroState);
    });

    sendResponse({ success: true });
    return true;
  }

  if (request.action === "pausePomodoro") {
    chrome.storage.local.get("pomodoroState", (data) => {
      const state = data.pomodoroState;
      if (state) {
        const remaining = Math.max(Math.floor((state.endTime - Date.now()) / 1000), 0);
        const updated = {
          ...state,
          isRunning: false,
          timeLeft: remaining,
        };
        chrome.storage.local.set({ pomodoroState: updated }, () => {
          console.log("Pomodoro paused:", updated);
        });
      }
      sendResponse({ success: true });
    });
    return true; // keep channel open for async
  }

  if (request.action === "resumePomodoro") {
    chrome.storage.local.get("pomodoroState", (data) => {
      const prev = data.pomodoroState;
      if (prev && !prev.isRunning && prev.timeLeft) {
        const startTime = Date.now();
        const endTime = startTime + prev.timeLeft * 1000;
        const pomodoroState = {
          ...prev,
          startTime,
          endTime,
          isRunning: true,
        };
        chrome.storage.local.set({ pomodoroState }, () => {
          console.log("Pomodoro resumed:", pomodoroState);
        });
      }
      sendResponse({ success: true });
    });
    return true;
  }

  if (request.action === "resetPomodoro") {
    chrome.storage.local.remove("pomodoroState", () => {
      console.log("Pomodoro reset");
      sendResponse({ success: true });
    });
    return true;
  }

  if (request.action === "getPomodoroState") {
    chrome.storage.local.get("pomodoroState", (data) => {
      sendResponse({ state: data.pomodoroState || null });
    });
    return true;
  }
});

export {};
