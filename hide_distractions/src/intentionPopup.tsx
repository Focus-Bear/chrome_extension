
import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { IntentionProvider } from "./context/intentionPopupContext";
import { useIntention } from "./context/intentionPopupContext";
import "./styles/intentionPopup.css";
import iconUrl from '../public/icons/bearLogo.png';

const containerId = "focus-popup-container";
const IntentionPopup = () => {
  const { intention, setIntention, isIntentionSet } = useIntention();
  const [visible, setVisible] = useState<boolean>(true);
  const { timer, setTimer } = useIntention();
  const [showWarning, setShowWarning] = useState(false);
  const [proceedDisabled, setProceedDisabled] = useState(true);
  const [localizedText, setLocalizedText] = useState<any | null>(null);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.source !== window) return;
      if (event.data.type === "FOCUSBEAR_TRANSLATIONS") {
        console.log("Received translations:", event.data.payload);
        setLocalizedText(event.data.payload);
      }
    };
    window.addEventListener("message", handleMessage);

    const timeout = setTimeout(() => {
      if (!localizedText) {
        console.log("📡 No translations received, requesting again...");
        window.postMessage({ type: "REQUEST_TRANSLATIONS" }, "*");
      }
    }, 300);

    return () => {
      window.removeEventListener("message", handleMessage);
      clearTimeout(timeout);
    };
  }, []);

  console.log("Current Intention:", intention);
  console.log("Has Intention?", isIntentionSet);

  useEffect(() => {
    const handler = () => {
      console.log("Received show-popup-again event");
      setVisible(true);
    };
    window.addEventListener("show-popup-again", handler);
    return () => {
      window.removeEventListener("show-popup-again", handler);
    };
  }, []);

  useEffect(() => {
    const trimmedIntention = intention.trim();
    const isShortIntention = trimmedIntention.length < 5;
    const isLongDuration = ["10", "15", "30"].includes(timer.toString());
    const needsDetailedIntention = isLongDuration && trimmedIntention.length < 15;
    const shouldDisable = !timer || isShortIntention || needsDetailedIntention;
    setProceedDisabled(shouldDisable);
  }, [intention, timer]);

  useEffect(() => {
    function handleInit(event: MessageEvent) {
      if (event.source !== window) return;
      if (event.data?.type !== "INIT_INTENTION_DATA") return;
      const { lastIntention, lastFocusDuration } = event.data.payload;
      if (lastIntention) setIntention(lastIntention);
      if (typeof lastFocusDuration === "number") setTimer(lastFocusDuration);
      setVisible(true);
    }
    window.addEventListener("message", handleInit);
    return () => {
      window.removeEventListener("message", handleInit);
    };
  }, []);

  const handleClose = () => {
    setVisible(false);
  };

  const handleSave = () => {
    const focusDuration = timer;
    const focusStart = Date.now();
    window.postMessage(
      {
        type: "STORE_FOCUS_DATA",
        payload: {
          domain: window.location.hostname,
          focusStart,
          focusDuration,
          focusIntention: intention,
        },
      },
      "*"
    );
    window.postMessage({ type: "START_FOCUS_TIMER", payload: timer }, "*");
    setVisible(false);
  };

  const handleIntentionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setIntention(e.target.value);
    validateIntentionLength(timer);
  };

  const handleDurationChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = e.target.value;
    setTimer(parseInt(selected, 10));
    validateIntentionLength(parseInt(selected, 10));
  };

  const validateIntentionLength = (selectedDuration: number) => {
    const minutes = selectedDuration;
    if (
      (minutes === 10 || minutes === 15 || minutes === 30) &&
      intention.trim().length < 15
    ) {
      setShowWarning(true);
    } else {
      setShowWarning(false);
    }
  };

  if (!visible) {
    return null;
  }

  if (!localizedText) {
    return (
      <div id="focus-popup" className="focus-popup">
        <div className="focus-popup-box">
          <button className="focus-popup-close" onClick={handleClose}>✕</button>
          <p style={{ padding: "20px", color: "#888" }}>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div id="focus-popup" className="focus-popup">
      <div className="focus-popup-box">
        <button className="focus-popup-close" onClick={handleClose}>✕</button>
        <img src={iconUrl} alt="Focus Mode Icon" className="focus-logo" />
        <h2>{localizedText.heading}</h2>
        <p>{localizedText.prompt}</p>
        <textarea
          value={intention}
          onChange={handleIntentionChange}
          placeholder={localizedText.placeholder}
          className="focus-input"
        />
        {showWarning && (
          <p className="focus-warning">{localizedText.warning}</p>
        )}
        <p>{localizedText.duration}</p>
        <select
          value={timer}
          onChange={handleDurationChange}
          className="focus-input"
        >
          <option value="">{localizedText.time_default}</option>
          <option value="1">{localizedText.minute_1}</option>
          <option value="5">{localizedText.minute_5}</option>
          <option value="10">{localizedText.minute_10}</option>
          <option value="15">{localizedText.minute_15}</option>
          <option value="30">{localizedText.minute_30}</option>
        </select>
        <div className="focus-button-container">
          <button
            disabled={proceedDisabled}
            onClick={handleSave}
            className="focus-button"
          >
            {localizedText.button}
          </button>
        </div>
      </div>
    </div>
  );
};

if (!document.getElementById(containerId)) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  root.render(
    <IntentionProvider>
      <IntentionPopup />
    </IntentionProvider>
  );
}

