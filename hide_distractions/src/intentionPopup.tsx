import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { IntentionProvider } from "./context/intentionPopupContext";
import { useIntention } from "./context/intentionPopupContext";
import "./styles/intentionPopup.css";
import iconUrl from '../public/icons/bearLogo.png';

const containerId = "focus-popup-container";

const headings = [
  "Hello there! Up to mischief are we?",
  "Caught you lurking again, didn't I?",
  "Planning trouble, or just thinking about it?",
  "Back for more fun, are we?",
  "Sneaky little visit, hmm?",
  "Stirring up chaos, or just passing through?",
  "Oh look, it’s the mastermind again!",
  "Plotting something brilliant... or ridiculous?",
  "Should I be worried, or just impressed?"
];

const prompts = [
  "What plans are brewing or should I say bearing?",
  "What’s the big idea—or is that just your inner bear stirring?",
  "Got something grizzly planned, or just hibernating on it?",
  "Are we clawing toward success or just paw-sing for thought?",
  "Is that a wild idea, or are you just bear-ly getting started?",
  "Planning something bold, or just padding around the possibilities?",
  "Are you bear-ing the weight of brilliance again?",
  "Got a beary good plan, or is it still in hibernation mode?",
  "Is that a growl of ambition I hear, or just your creativity waking up?",
  "Plotting something fierce, or just feeling a bit fuzzy today?"
];

const IntentionPopup = () => {
  const { intention, setIntention, isIntentionSet } = useIntention();
  const [visible, setVisible] = useState<boolean>(true);
  const { timer, setTimer } = useIntention();
  const [showWarning, setShowWarning] = useState(false);
  const [proceedDisabled, setProceedDisabled] = useState(true);
  const [localizedText, setLocalizedText] = useState<any | null>(null);

  const [randomHeading, setRandomHeading] = useState<string>("");
  const [randomPrompt, setRandomPrompt] = useState<string>("");

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.source !== window) return;
      if (event.data.type === "FOCUSBEAR_TRANSLATIONS") {
        setLocalizedText(event.data.payload);
        setRandomHeading(headings[Math.floor(Math.random() * headings.length)]);
        setRandomPrompt(prompts[Math.floor(Math.random() * prompts.length)]);
      }
    };
    window.addEventListener("message", handleMessage);

    const timeout = setTimeout(() => {
      if (!localizedText) {
        window.postMessage({ type: "REQUEST_TRANSLATIONS" }, "*");
      }
    }, 300);

    return () => {
      window.removeEventListener("message", handleMessage);
      clearTimeout(timeout);
    };
  }, []);

  useEffect(() => {
    const handler = () => {
      setVisible(true);
      setRandomHeading(headings[Math.floor(Math.random() * headings.length)]);
      setRandomPrompt(prompts[Math.floor(Math.random() * prompts.length)]);
    };
    window.addEventListener("show-popup-again", handler);

    return () => {
      window.removeEventListener("show-popup-again", handler);
    };
  }, []);

  useEffect(() => {
    const trimmedIntention = intention.trim();
    const isShortIntention = trimmedIntention.length < 5;
    const isLongDuration = ["10", "15"].includes(timer.toString());
    const needsDetailedIntention =
      isLongDuration && trimmedIntention.length < 15;

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
      setRandomHeading(headings[Math.floor(Math.random() * headings.length)]);
      setRandomPrompt(prompts[Math.floor(Math.random() * prompts.length)]);
    }

    window.addEventListener("message", handleInit);
    return () => {
      window.removeEventListener("message", handleInit);
    };
  }, []);

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
    window.postMessage(
      { type: "START_FOCUS_TIMER", payload: timer },
      "*"
    );

    setVisible(false);
  };

  const handleIntentionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setIntention(e.target.value);
    validateIntentionLength(timer);
  };

  const handleDurationChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const minutes = parseInt(e.target.value, 10);
    setTimer(minutes);
    validateIntentionLength(minutes);
  };

  const validateIntentionLength = (selectedDuration: number) => {
    const minutes = selectedDuration;
    if (
      (minutes === 10 || minutes === 15) &&
      intention.trim().length < 15
    ) {
      setShowWarning(true);
    } else {
      setShowWarning(false);
    }
  };

  if (!visible || !localizedText) {
    return null;
  }

  return (
    <div id="focus-popup" className="focus-popup">
      <div className="focus-popup-box">
        <img src={iconUrl} alt="Focus Mode Icon" className="focus-logo" />
        <h2>{randomHeading}</h2>
        <p>{randomPrompt}</p>
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
          value={timer === 0 ? "" : timer.toString()}
          onChange={handleDurationChange}
          className="focus-input"
        >
          <option value="">{localizedText.time_default}</option>
          <option value="1">{localizedText.minute_1}</option>
          <option value="5">{localizedText.minute_5}</option>
          <option value="10">{localizedText.minute_10}</option>
          <option value="15">{localizedText.minute_15}</option>
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
