import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { IntentionProvider } from "./context/intentionPopupContext";
import { useIntention } from "./context/intentionPopupContext";
import "./styles/intentionPopup.css";
import iconUrl from "../public/icons/bearLogo.png";

const containerId = "focus-popup-container";

const headings = [
  "Still here? Set your intention.",
  "Caught you mid-scroll—what's up?",
  "Real work—or rabbit hole?",
  "Focus check: what's this for?",
  "Sneak peek—or serious work?",
  "Before the feed eats you…",
  "Quick check—why this tab?",
  "Scrolling—or here on purpose?",
  "Honest—why open this tab?",
];

const prompts = [
  "What's worth your honest attention on this visit?",
  "Grizzly focus, or a quick paw through this page?",
  "If you finish one thing here, what should it be?",
  "Work brain fully on—or is curiosity driving?",
  "What would make closing this tab feel like a win?",
  "Something you're chasing—or still stirring the pot?",
  "Deadline sprint, deep learning, or a mindful break?",
  "What would productivity mean in the next few minutes?",
  "Proud to log this as work—or honest about wandering?",
  "In your own words: what are you actually doing here?",
];

const IntentionPopup = () => {
  const { intention, setIntention } = useIntention();
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
    const needsDetailedIntention = isLongDuration && trimmedIntention.length < 15;

    const shouldDisable = !timer || isShortIntention || needsDetailedIntention;
    setProceedDisabled(shouldDisable);
  }, [intention, timer]);

  useEffect(() => {
    function handleInit(event: MessageEvent) {
      if (event.source !== window) return;
      if (event.data?.type !== "INIT_INTENTION_DATA") return;

      const { lastUnfocusIntention, lastUnfocusDuration } = event.data.payload;
      if (lastUnfocusIntention) setIntention(lastUnfocusIntention);
      if (typeof lastUnfocusDuration === "number") setTimer(lastUnfocusDuration);
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
    const unfocusDuration = timer;
    const unfocusStart = Date.now();

    window.postMessage(
      {
        type: "STORE_UNFOCUS_DATA",
        payload: {
          domain: window.location.hostname,
          unfocusStart,
          unfocusDuration,
          unfocusIntention: intention,
        },
      },
      "*",
    );
    window.postMessage({ type: "START_UNFOCUS_TIMER", payload: timer }, "*");

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
    if ((minutes === 10 || minutes === 15) && intention.trim().length < 15) {
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
        <div className="focus-popup-header">
          <img src={iconUrl} alt="Focus Mode Icon" className="focus-logo" />
          <h2>{randomHeading}</h2>
        </div>
        <p className="focus-popup-text">{randomPrompt}</p>
        <textarea
          value={intention}
          onChange={handleIntentionChange}
          placeholder={localizedText.placeholder}
          className="focus-input"
        />
        {showWarning && <p className="focus-warning">{localizedText.warning}</p>}
        <p className="focus-popup-text focus-popup-duration-label">{localizedText.duration}</p>
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
          <button disabled={proceedDisabled} onClick={handleSave} className="focus-button">
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
    </IntentionProvider>,
  );
}
