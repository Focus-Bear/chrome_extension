(() => {
  console.log("Content script injected at", location.href);

  const domain = window.location.hostname.replace(/^www\./, "");

  const translations = {
    heading: chrome.i18n.getMessage("heading"),
    prompt: chrome.i18n.getMessage("prompt"),
    placeholder: chrome.i18n.getMessage("placeholder"),
    warning: chrome.i18n.getMessage("warning"),
    duration: chrome.i18n.getMessage("duration"),
    button: chrome.i18n.getMessage("button"),
    time_default: chrome.i18n.getMessage("time_default"),
    minute_1: chrome.i18n.getMessage("minute_1"),
    minute_5: chrome.i18n.getMessage("minute_5"),
    minute_10: chrome.i18n.getMessage("minute_10"),
    minute_15: chrome.i18n.getMessage("minute_15"),
    minute_30: chrome.i18n.getMessage("minute_30"),
  };

  // Send translations initially
  window.postMessage({ type: "FOCUSBEAR_TRANSLATIONS", payload: translations }, "*");

  console.log("[FocusBear] Translation message sent");

  // Respond if popup requests translations again
  window.addEventListener("message", (event) => {
    if (event.data?.type === "REQUEST_TRANSLATIONS") {
      window.postMessage({ type: "FOCUSBEAR_TRANSLATIONS", payload: translations }, "*");
    }
  });

  // Inject popup on first visit if no domain Unfocus Session exists.
  chrome.storage.local.get(["unfocusData"], ({ unfocusData }) => {
    const session = unfocusData?.[domain];
    if (!session) {
      if (!document.getElementById("intention-popup-script")) {
        const script = document.createElement("script");
        script.src = chrome.runtime.getURL("floatingPopup.js");
        script.id = "intention-popup-script";
        script.type = "module";
        script.onload = () => {
          window.postMessage(
            {
              type: "INIT_INTENTION_DATA",
              payload: {
                lastUnfocusIntention: "",
                lastUnfocusDuration: 0,
              },
            },
            "*",
          );
        };
        document.body.appendChild(script);
      }
    }
  });

  chrome.storage.local.get(["unfocusData"], ({ unfocusData }) => {
    const session = unfocusData?.[domain];
    if (session?.unfocusStart && session?.unfocusDuration) {
      const elapsed = Date.now() - session.unfocusStart;
      const totalMs = session.unfocusDuration * 60 * 1000;
      const remaining = totalMs - elapsed;
      if (remaining > 0) {
        setTimeout(() => {
          const currentDomain = window.location.hostname.replace(/^www\./, "");
          if (currentDomain === domain) {
            window.dispatchEvent(new CustomEvent("show-popup-again"));
          }
        }, remaining);
      } else {
        window.dispatchEvent(new CustomEvent("show-popup-again"));
      }
    }
  });

  window.addEventListener("show-popup-again", () => {
    console.log("[Content] show-popup-again event fired, attempting reinjection...");
  });

  let unfocusTimer: ReturnType<typeof setTimeout> | null = null;
  // oxlint-disable-next-line no-unused-vars
  let isBlurEnabled = true;

  window.addEventListener("message", (event) => {
    if (event.source !== window) return;

    if (event.data.type === "SAVE_INTENTION") {
      const intention = event.data.payload;
      const customEvent = new CustomEvent("intention-saved", { detail: intention });
      window.dispatchEvent(customEvent);
    }

    if (event.data.type === "STORE_UNFOCUS_DATA") {
      const { unfocusStart, unfocusDuration, unfocusIntention } = event.data.payload;
      chrome.storage.local.set(
        {
          unfocusStart,
          unfocusDuration,
          unfocusIntention,
          showIntentionPopup: false,
          lastUnfocusIntention: unfocusIntention,
          lastUnfocusDuration: unfocusDuration,
        },
        () => {
          const elapsed = Date.now() - unfocusStart;
          const totalMs = unfocusDuration * 60 * 1000;
          const remaining = totalMs - elapsed;
          if (remaining > 0) {
            setTimeout(() => {
              const currentDomain = window.location.hostname.replace(/^www\./, "");
              if (currentDomain === domain) {
                window.dispatchEvent(new CustomEvent("show-popup-again"));
              }
            }, remaining);
          } else {
            window.dispatchEvent(new CustomEvent("show-popup-again"));
          }
        },
      );
    }
  });

  window.addEventListener("message", (event) => {
    if (event.source !== window) return;

    if (event.data.type === "SAVE_INTENTION") {
      const intention = event.data.payload;
      const customEvent = new CustomEvent("intention-saved", { detail: intention });
      window.dispatchEvent(customEvent);
    }

    if (event.data.type === "START_UNFOCUS_TIMER") {
      const durationInMinutes = event.data.payload;
      if (unfocusTimer) clearTimeout(unfocusTimer);
      unfocusTimer = setTimeout(
        () => {
          window.dispatchEvent(new CustomEvent("show-popup-again"));
        },
        durationInMinutes * 60 * 1000,
      );
    }

    if (event.data.type === "STORE_UNFOCUS_DATA") {
      const { unfocusStart, unfocusDuration, unfocusIntention } = event.data.payload;
      const localDomain = window.location.hostname.replace(/^www\./, "");
      chrome.storage.local.get(["unfocusData"], (result) => {
        const unfocusData = result.unfocusData || {};
        unfocusData[localDomain] = {
          unfocusStart,
          unfocusDuration,
          unfocusIntention,
        };
        chrome.storage.local.set({ unfocusData });
      });
    }
  });

  window.addEventListener("show-popup-again", () => {
    chrome.storage.local.get(
      ["lastUnfocusIntention", "lastUnfocusDuration"],
      ({ lastUnfocusIntention, lastUnfocusDuration }) => {
        if (document.getElementById("intention-popup-script")) {
          return;
        }
        const script = document.createElement("script");
        script.src = chrome.runtime.getURL("floatingPopup.js");
        script.id = "intention-popup-script";
        script.type = "module";
        script.onload = () => {
          window.postMessage(
            {
              type: "INIT_INTENTION_DATA",
              payload: { lastUnfocusIntention, lastUnfocusDuration },
            },
            "*",
          );
        };
        document.body.appendChild(script);
      },
    );
  });

  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === "COMPLETE_UNFOCUS_SESSION") {
      chrome.storage.local.get("unfocusData", ({ unfocusData }) => {
        if (unfocusData) {
          const msgDomain = message.payload?.domain;
          if (msgDomain && unfocusData[msgDomain]) {
            delete unfocusData[msgDomain];
            chrome.storage.local.set({ unfocusData });
          }
        }
      });
      window.postMessage({ type: "UNFOCUS_SESSION_COMPLETE" }, "*");
    }
  });
})();
