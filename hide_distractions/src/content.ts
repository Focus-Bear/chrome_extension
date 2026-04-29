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
window.postMessage({
  type: "FOCUSBEAR_TRANSLATIONS",
  payload: translations
}, "*");
console.log("[FocusBear] Translation message sent");

// Respond if popup requests translations again
window.addEventListener("message", (event) => {
  if (event.data?.type === "REQUEST_TRANSLATIONS") {
    console.log("[FocusBear] Popup requested translations, resending...");
    window.postMessage({
      type: "FOCUSBEAR_TRANSLATIONS",
      payload: translations
    }, "*");
  }
});

// Inject popup on first visit if no domain session exists
chrome.storage.local.get(["focusData"], ({ focusData }) => {
  const session = focusData?.[domain];
  if (!session) {
    console.log(`[Content] No session found for ${domain}, injecting popup`);
    if (!document.getElementById("intention-popup-script")) {
      const script = document.createElement("script");
      script.src = chrome.runtime.getURL("floatingPopup.js");
      script.id = "intention-popup-script";
      script.type = "module";
      script.onload = () => {
        window.postMessage({
          type: "INIT_INTENTION_DATA",
          payload: {
            lastIntention: "",
            lastFocusDuration: 0,
          },
        }, "*");
      };
      document.body.appendChild(script);
    }
  } else {
    console.log(`[Content] Session already exists for ${domain}, no popup needed.`);
  }
});

// Domain-specific timer scheduling
chrome.storage.local.get(["focusData"], ({ focusData }) => {
  const session = focusData?.[domain];

  if (session?.focusStart && session?.focusDuration) {
    const elapsed = Date.now() - session.focusStart;
    const totalMs = session.focusDuration * 60 * 1000;
    const remaining = totalMs - elapsed;

    if (remaining > 0) {
      console.log(`[Content] [${domain}] Scheduling re-popup in ${remaining}ms`);
      setTimeout(() => {
        const currentDomain = window.location.hostname.replace(/^www\./, "");
        if (currentDomain === domain) {
          console.log(`[Content] [${domain}] Timer expired → showing popup`);
          window.dispatchEvent(new CustomEvent("show-popup-again"));
        } else {
          console.log(`[Content] Skipping popup: tab is on ${currentDomain}, not ${domain}`);
        }
      }, remaining);
    } else {
      console.log(`[Content] [${domain}] Timer already expired — showing popup now`);
      window.dispatchEvent(new CustomEvent("show-popup-again"));
    }
  }
});

// 5) In your show-popup-again listener, to see if you ever get this event:
window.addEventListener("show-popup-again", () => {
  console.log(
    "[Content] show-popup-again event fired, attempting reinjection…"
  );
});


let focusTimer: ReturnType<typeof setTimeout> | null = null;
let isBlurEnabled = true;

window.addEventListener("message", (event) => {
  if (event.source !== window) return;

  if (event.data.type === "SAVE_INTENTION") {
    const intention = event.data.payload;
    const customEvent = new CustomEvent("intention-saved", { detail: intention });
    window.dispatchEvent(customEvent);
  }

  if (event.data.type === "STORE_FOCUS_DATA") {
    const { focusStart, focusDuration, focusIntention } = event.data.payload;
    chrome.storage.local.set(
      {
        focusStart,
        focusDuration,
        focusIntention,
        showIntentionPopup: false,
        lastIntention: focusIntention,
        lastFocusDuration: focusDuration,
      },
      () => {
        console.log("Stored focus session & hid popup permanently");

        // ─── schedule the popup in this tab right now ───
        const elapsed = Date.now() - focusStart;
        const totalMs = focusDuration * 60 * 1000;
        const remaining = totalMs - elapsed;

        if (remaining > 0) {
          console.log(
            `[Content] [STORE] Scheduling re-popup in ${remaining}ms`
          );
          setTimeout(() => {
            const currentDomain = window.location.hostname.replace(
              /^www\./,
              ""
            );
            if (currentDomain === domain) {
              console.log(
                `[STORE] Timer expired for ${domain} → showing popup`
              );
              window.dispatchEvent(new CustomEvent("show-popup-again"));
            } else {
              console.log(
                `[STORE] Timer expired for ${domain}, but user is on ${currentDomain} → ignoring`
              );
            }
          }, remaining);
        } else {
          console.log("[Content] [STORE] Timer already expired; showing now");
          window.dispatchEvent(new CustomEvent("show-popup-again"));
        }
      }
    );
  }
});


window.addEventListener("message", (event) => {
  if (event.source !== window) return;

  if (event.data.type === "SAVE_INTENTION") {
    const intention = event.data.payload;
    const customEvent = new CustomEvent("intention-saved", {
      detail: intention,
    });
    window.dispatchEvent(customEvent);
  }

  if (event.data.type === "START_FOCUS_TIMER") {
    const durationInMinutes = event.data.payload;

    if (focusTimer) clearTimeout(focusTimer);

    console.log(`Starting focus timer for ${durationInMinutes} minutes.`);
    focusTimer = setTimeout(() => {
      console.log("Focus timer ended. Dispatching SHOW_POPUP event.");
      window.dispatchEvent(new CustomEvent("show-popup-again"));
    }, durationInMinutes * 60 * 1000);
  }

  // NEW: Save focus data to chrome.storage.local
  if (event.data.type === "STORE_FOCUS_DATA") {
    const { focusStart, focusDuration, focusIntention } = event.data.payload;
    const domain = window.location.hostname.replace(/^www\./, "");
    console.log(`[STORE_FOCUS_DATA] domain: ${domain}`);

    chrome.storage.local.get(["focusData"], (result) => {
      const focusData = result.focusData || {};

      focusData[domain] = {
        focusStart,
        focusDuration,
        focusIntention,
      };

      chrome.storage.local.set({ focusData }, () => {
        console.log(`✅ Stored focus session for ${domain}`);
        console.log("focusData is now:", focusData);
      });
    });
  }
});

window.addEventListener("show-popup-again", () => {
  // fetch only the data we need for pre-filling the form:
  chrome.storage.local.get(
    ["lastIntention", "lastFocusDuration"],
    ({ lastIntention, lastFocusDuration }) => {
      // never inject twice
      if (document.getElementById("intention-popup-script")) {
        return;
      }

      // inject the popup script
      const script = document.createElement("script");
      script.src = chrome.runtime.getURL("floatingPopup.js");
      script.id = "intention-popup-script";
      script.type = "module";

      script.onload = () => {
        // send it its saved data
        window.postMessage(
          {
            type: "INIT_INTENTION_DATA",
            payload: { lastIntention, lastFocusDuration },
          },
          "*"
        );
      };

      document.body.appendChild(script);
    }
  );
});