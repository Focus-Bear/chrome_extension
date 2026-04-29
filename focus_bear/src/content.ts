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
window.postMessage(
  {
    type: "FOCUSBEAR_TRANSLATIONS",
    payload: translations,
  },
  "*",
);
console.log("[FocusBear] Translation message sent");

// Respond if popup requests translations again
window.addEventListener("message", (event) => {
  if (event.data?.type === "REQUEST_TRANSLATIONS") {
    console.log("[FocusBear] Popup requested translations, resending...");
    window.postMessage(
      {
        type: "FOCUSBEAR_TRANSLATIONS",
        payload: translations,
      },
      "*",
    );
  }
});

// Inject popup on first visit if no domain Unfocus Session exists
chrome.storage.local.get(["unfocusData"], ({ unfocusData }) => {
  const session = unfocusData?.[domain];
  if (!session) {
    console.log(`[Content] No unfocus session found for ${domain}, injecting popup`);
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
  } else {
    console.log(`[Content] Unfocus session already exists for ${domain}, no popup needed.`);
  }
});

// Domain-specific timer scheduling for Unfocus Sessions
chrome.storage.local.get(["unfocusData"], ({ unfocusData }) => {
  const session = unfocusData?.[domain];

  if (session?.unfocusStart && session?.unfocusDuration) {
    const elapsed = Date.now() - session.unfocusStart;
    const totalMs = session.unfocusDuration * 60 * 1000;
    const remaining = totalMs - elapsed;

    if (remaining > 0) {
      console.log(`[Content] [${domain}] Scheduling unfocus re-popup in ${remaining}ms`);
      setTimeout(() => {
        const currentDomain = window.location.hostname.replace(/^www\./, "");
        if (currentDomain === domain) {
          console.log(`[Content] [${domain}] Unfocus timer expired → showing popup`);
          window.dispatchEvent(new CustomEvent("show-popup-again"));
        } else {
          console.log(`[Content] Skipping popup: tab is on ${currentDomain}, not ${domain}`);
        }
      }, remaining);
    } else {
      console.log(`[Content] [${domain}] Unfocus timer already expired — showing popup now`);
      window.dispatchEvent(new CustomEvent("show-popup-again"));
    }
  }
});

// 5) In your show-popup-again listener, to see if you ever get this event:
window.addEventListener("show-popup-again", () => {
  console.log("[Content] show-popup-again event fired, attempting reinjection…");
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
        console.log("Stored unfocus session & hid popup permanently");

        // ─── schedule the popup in this tab right now ───
        const elapsed = Date.now() - unfocusStart;
        const totalMs = unfocusDuration * 60 * 1000;
        const remaining = totalMs - elapsed;

        if (remaining > 0) {
          console.log(`[Content] [STORE] Scheduling unfocus re-popup in ${remaining}ms`);
          setTimeout(() => {
            const currentDomain = window.location.hostname.replace(/^www\./, "");
            if (currentDomain === domain) {
              console.log(`[STORE] Unfocus timer expired for ${domain} → showing popup`);
              window.dispatchEvent(new CustomEvent("show-popup-again"));
            } else {
              console.log(
                `[STORE] Unfocus timer expired for ${domain}, but user is on ${currentDomain} → ignoring`,
              );
            }
          }, remaining);
        } else {
          console.log("[Content] [STORE] Unfocus timer already expired; showing now");
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
    const customEvent = new CustomEvent("intention-saved", {
      detail: intention,
    });
    window.dispatchEvent(customEvent);
  }

  if (event.data.type === "START_UNFOCUS_TIMER") {
    const durationInMinutes = event.data.payload;

    if (unfocusTimer) clearTimeout(unfocusTimer);

    console.log(`Starting unfocus timer for ${durationInMinutes} minutes.`);
    unfocusTimer = setTimeout(
      () => {
        console.log("Unfocus timer ended. Dispatching SHOW_POPUP event.");
        window.dispatchEvent(new CustomEvent("show-popup-again"));
      },
      durationInMinutes * 60 * 1000,
    );
  }

  // NEW: Save unfocus data to chrome.storage.local
  if (event.data.type === "STORE_UNFOCUS_DATA") {
    const { unfocusStart, unfocusDuration, unfocusIntention } = event.data.payload;
    const domain = window.location.hostname.replace(/^www\./, "");
    console.log(`[STORE_UNFOCUS_DATA] domain: ${domain}`);

    chrome.storage.local.get(["unfocusData"], (result) => {
      const unfocusData = result.unfocusData || {};

      unfocusData[domain] = {
        unfocusStart,
        unfocusDuration,
        unfocusIntention,
      };

      chrome.storage.local.set({ unfocusData }, () => {
        console.log(`✅ Stored unfocus session for ${domain}`);
        console.log("unfocusData is now:", unfocusData);
      });
    });
  }
});

window.addEventListener("show-popup-again", () => {
  // fetch only the data we need for pre-filling the form:
  chrome.storage.local.get(
    ["lastUnfocusIntention", "lastUnfocusDuration"],
    ({ lastUnfocusIntention, lastUnfocusDuration }) => {
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
        const domain = message.payload?.domain;
        if (domain && unfocusData[domain]) {
          delete unfocusData[domain];
          chrome.storage.local.set({ unfocusData });
        }
      }
    });
    window.postMessage({ type: "UNFOCUS_SESSION_COMPLETE" }, "*");
  }
});
