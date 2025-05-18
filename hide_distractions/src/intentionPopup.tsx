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

  console.log("Current Intention:", intention);
  console.log("Has Intention?", isIntentionSet);

  /// use effect to handle the event listeners.
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

  /// use effect to check the proceed button validation whenever intention and timer changes.
  useEffect(() => {
    const trimmedIntention = intention.trim();
    const isShortIntention = trimmedIntention.length < 5;
    const isLongDuration = ["10", "15", "30"].includes(timer.toString());
    const needsDetailedIntention =
      isLongDuration && trimmedIntention.length < 15;

    const shouldDisable = !timer || isShortIntention || needsDetailedIntention;

    setProceedDisabled(shouldDisable);
  }, [intention, timer]);

  // ───── new INIT_INTENTION_DATA listener ─────
  useEffect(() => {
    function handleInit(event: MessageEvent) {
      if (event.source !== window) return;
      if (event.data?.type !== "INIT_INTENTION_DATA") return;

      const { lastIntention, lastFocusDuration } = event.data.payload;
      if (lastIntention)   setIntention(lastIntention);
      if (typeof lastFocusDuration === "number") setTimer(lastFocusDuration);
      setVisible(true);
    }

    window.addEventListener("message", handleInit);
    return () => {
      window.removeEventListener("message", handleInit);
    };
  }, []);


  /// to handle the intention save fucntionality
  const handleSave = () => {
    const focusDuration = timer;
    const focusStart = Date.now();

    // Send to content script to store in chrome.storage.local
    window.postMessage(
      {
        type: "STORE_FOCUS_DATA",
        payload: {
          focusStart,
          focusDuration,
          focusIntention: intention,
        },
      },
      "*"
    );
    window.postMessage(
      { type: "START_FOCUS_TIMER", payload: timer },
      "*"
    );
    
    setVisible(false); /// sets popup visibility.
  };

  /// to handle the intention change.
  const handleIntentionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setIntention(e.target.value);
    validateIntentionLength(timer); /// validation to check the lenght of intention based on timer.
  };

  /// to handle the timer change.
  const handleDurationChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = e.target.value;
    setTimer(parseInt(selected, 10));
    validateIntentionLength(parseInt(selected, 10)); /// validation to check the lenght of intention based on timer.
  };

  // Validate if intention is short for long durations
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
  if (!visible) return null;         // don’t show if storage says hide
  return (
    <div id="focus-popup" className="focus-popup">
      <div className="focus-popup-box">  
        {/* Logo */}
        <img src={iconUrl} alt="Focus Mode Icon" className="focus-logo"/>
        <h2>
          Hello there! Up to mischief are we?
        </h2>
        <p>
          What plans are brewing or should I say bearing?
        </p>
        <textarea
          value={intention}
          onChange={handleIntentionChange}
          placeholder="Type..."
          className="focus-input"
        />
        {showWarning && (
          <p className="focus-warning">
            Wow that's a while! I think a more thoughtful reason would help keep our focus! (15+ characters).
          </p>
        )}
        <p>
          How long should we watch together for?
        </p>
        <select
          value={timer}
          onChange={handleDurationChange}
          className="focus-input"
        >
          <option value="">Time... </option>
          <option value="1">1 minute</option>
          <option value="5">5 minutes</option>
          <option value="10">10 minutes</option>
          <option value="15">15 minutes</option>
          <option value="30">30 minutes</option>
        </select>
  
        <div className="focus-button-container">
          <button
            disabled={proceedDisabled}
            onClick={handleSave}
            className="focus-button"
          >
            Lets dig in!
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
