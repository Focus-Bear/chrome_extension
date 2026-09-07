(() => {
  console.log("Content script injected at", location.href);

  const domain = window.location.hostname.replace(/^www\./, "");

  const browserApi = chrome;

  const translations = {
    heading: browserApi.i18n.getMessage("heading"),
    prompt: browserApi.i18n.getMessage("prompt"),
    placeholder: browserApi.i18n.getMessage("placeholder"),
    warning: browserApi.i18n.getMessage("warning"),
    duration: browserApi.i18n.getMessage("duration"),
    button: browserApi.i18n.getMessage("button"),
    time_default: browserApi.i18n.getMessage("time_default"),
    minute_1: browserApi.i18n.getMessage("minute_1"),
    minute_5: browserApi.i18n.getMessage("minute_5"),
    minute_10: browserApi.i18n.getMessage("minute_10"),
    minute_15: browserApi.i18n.getMessage("minute_15"),
    minute_30: browserApi.i18n.getMessage("minute_30"),
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
  browserApi.storage.local.get(["unfocusData"], ({ unfocusData }) => {
    const session = unfocusData?.[domain];
    if (!session) {
      if (!document.getElementById("intention-popup-script")) {
        const script = document.createElement("script");
        script.src = browserApi.runtime.getURL("floatingPopup.js");
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

  browserApi.storage.local.get(["unfocusData"], ({ unfocusData }) => {
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

  window.addEventListener("message", (event) => {
    if (event.source !== window) return;

    if (event.data.type === "SAVE_INTENTION") {
      const intention = event.data.payload;
      const customEvent = new CustomEvent("intention-saved", { detail: intention });
      window.dispatchEvent(customEvent);
    }

    if (event.data.type === "STORE_UNFOCUS_DATA") {
      const { unfocusStart, unfocusDuration, unfocusIntention } = event.data.payload;
      try {
        browserApi.storage.local.set(
          {
            unfocusStart,
            unfocusDuration,
            unfocusIntention,
            showIntentionPopup: false,
            lastUnfocusIntention: unfocusIntention,
            lastUnfocusDuration: unfocusDuration,
          },
          () => {
            if (browserApi.runtime.lastError) {
              console.warn("[FocusBear] storage.set error:", browserApi.runtime.lastError.message);
              return;
            }
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
      } catch (err) {
        console.warn("[FocusBear] Could not persist unfocus session (context invalid):", err);
      }
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
      try {
        browserApi.storage.local.get(["unfocusData"], (result) => {
          if (browserApi.runtime.lastError) {
            console.warn("[FocusBear] storage.get error:", browserApi.runtime.lastError.message);
            return;
          }
          const unfocusData = result.unfocusData || {};
          unfocusData[localDomain] = {
            unfocusStart,
            unfocusDuration,
            unfocusIntention,
          };
          try {
            browserApi.storage.local.set({ unfocusData });
          } catch (err) {
            console.warn("[FocusBear] Could not update unfocusData (context invalid):", err);
          }
        });
      } catch (err) {
        console.warn("[FocusBear] Could not read unfocusData (context invalid):", err);
      }
    }
  });

  window.addEventListener("show-popup-again", () => {
    try {
      browserApi.storage.local.get(
        ["lastUnfocusIntention", "lastUnfocusDuration"],
        ({ lastUnfocusIntention, lastUnfocusDuration }) => {
          if (browserApi.runtime.lastError) {
            console.warn("[FocusBear] storage.get error:", browserApi.runtime.lastError.message);
            return;
          }
          if (document.getElementById("intention-popup-script")) {
            return;
          }
          try {
            const script = document.createElement("script");
            script.src = browserApi.runtime.getURL("floatingPopup.js");
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
          } catch (err) {
            console.warn("[FocusBear] Could not inject popup script (context invalid):", err);
          }
        },
      );
    } catch (err) {
      console.warn("[FocusBear] show-popup-again: context invalid:", err);
    }
  });

  browserApi.runtime.onMessage.addListener((message) => {
    if (message.type === "COMPLETE_UNFOCUS_SESSION") {
      browserApi.storage.local.get("unfocusData", ({ unfocusData }) => {
        if (unfocusData) {
          const msgDomain = message.payload?.domain;
          if (msgDomain && unfocusData[msgDomain]) {
            delete unfocusData[msgDomain];
            browserApi.storage.local.set({ unfocusData });
          }
        }
      });
      window.postMessage({ type: "UNFOCUS_SESSION_COMPLETE" }, "*");
    }
  });
})();
