import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { IntentionProvider } from "./context/intentionPopupContext.js";
import { useIntention } from "./context/intentionPopupContext.js";
// ?inline bundles the CSS as a string so we can inject it into the shadow root
// @ts-ignore: Vite inline CSS query module
import popupStyles from "./styles/intentionPopup.css?inline";

const iconUrl = new URL("icons/bearLogo.png", import.meta.url).href;

// Build @font-face declarations using the extension's own font URLs so they
// resolve correctly inside the shadow DOM regardless of the host page's origin.
const fontBase = new URL("fonts/", import.meta.url).href;
const fontStyles = `
  @font-face {
    font-family: "Inter";
    src: url("${fontBase}Inter-Regular.woff2") format("woff2");
    font-weight: 400;
    font-style: normal;
    font-display: swap;
  }
  @font-face {
    font-family: "Inter";
    src: url("${fontBase}Inter-Medium.woff2") format("woff2");
    font-weight: 500;
    font-style: normal;
    font-display: swap;
  }
`;

const containerId = "focus-bear-shadow-host";

const headings = [
  "Still here? Set your intention.",
  "Caught you scrolling, what's up?",
  "Real work, or a rabbit hole?",
  "Focus check: what's this for?",
  "Sneak peek or serious work?",
  "Before the feed eats you…",
  "Question... why this tab?",
  "Scrolling or here on purpose?",
  "Why are we opening this tab?",
];

const DURATIONS: Array<{ value: number; key: keyof LocalizedText }> = [
  { value: 1, key: "minute_1" },
  { value: 5, key: "minute_5" },
  { value: 10, key: "minute_10" },
  { value: 15, key: "minute_15" },
];

type LocalizedText = {
  placeholder: string;
  warning: string;
  duration: string;
  time_default: string;
  minute_1: string;
  minute_5: string;
  minute_10: string;
  minute_15: string;
  button: string;
};

const IntentionPopup = () => {
  const { intention, setIntention } = useIntention();
  const [visible, setVisible] = useState<boolean>(true);
  const { timer, setTimer } = useIntention();
  const [proceedDisabled, setProceedDisabled] = useState(true);
  const [localizedText, setLocalizedText] = useState<LocalizedText | null>(null);

  const [randomHeading, setRandomHeading] = useState<string>("");

  const domain =
    typeof window !== "undefined" ? window.location.hostname.replace(/^www\./, "") : "";

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.source !== window) return;
      if (event.data.type === "FOCUSBEAR_TRANSLATIONS") {
        setLocalizedText(event.data.payload);
        setRandomHeading(headings[Math.floor(Math.random() * headings.length)]);
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
    };
    window.addEventListener("show-popup-again", handler);
    return () => window.removeEventListener("show-popup-again", handler);
  }, []);

  // Validate — disable proceed until intention + duration meet thresholds
  useEffect(() => {
    const trimmed = intention.trim();
    const isShort = trimmed.length < 5;
    const isLongDuration = timer === 10 || timer === 15;
    const needsDetailed = isLongDuration && trimmed.length < 15;
    setProceedDisabled(!timer || isShort || needsDetailed);
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
    }
    window.addEventListener("message", handleInit);
    return () => window.removeEventListener("message", handleInit);
  }, []);

  const handleSave = () => {
    if (proceedDisabled) return;
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
  };

  if (!visible || !localizedText) {
    return null;
  }

  // ─── Derived UI state ────────────────────────────────────────────
  const trimmed = intention.trim();
  const isShort = trimmed.length < 5;
  const isLongDuration = timer === 10 || timer === 15;
  const showWarning = isLongDuration && trimmed.length >= 5 && trimmed.length < 15;

  let actionHelp: string | null = null;
  if (!timer && !trimmed) actionHelp = "Add an intention and pick a duration to continue.";
  else if (!timer) actionHelp = "Choose how long you'll be on this site.";
  else if (isShort) actionHelp = "Tell us a bit more...";

  const helperText = isLongDuration
    ? "At least 15 characters for longer sessions"
    : "At least 5 characters";

  return (
    <div
      id="focus-popup"
      className="focus-popup"
      role="dialog"
      aria-modal="true"
      aria-labelledby="focus-popup-heading"
    >
      <div className="focus-popup-box">
        {/* Header */}
        <header className="focus-popup-header">
          <img src={iconUrl} alt="" className="focus-logo" aria-hidden="true" />
          <div className="focus-popup-header-text">
            <p className="focus-eyebrow">
              Unfocus check · <span className="focus-domain">{domain}</span>
            </p>
            <h2 id="focus-popup-heading" className="focus-heading">
              {randomHeading}
            </h2>
          </div>
        </header>

        {/* Intention textarea */}
        <div className="focus-field">
          <label className="focus-label" htmlFor="focus-intention">
            Your intention:
          </label>
          <div className={`focus-textarea-shell ${trimmed.length >= 5 ? "is-filled" : ""}`}>
            <textarea
              id="focus-intention"
              value={intention}
              onChange={handleIntentionChange}
              placeholder={localizedText.placeholder}
              className="focus-textarea"
              maxLength={200}
              rows={3}
              aria-describedby="focus-intention-help focus-intention-warn"
            />
          </div>
          <div className="focus-help-row">
            <p id="focus-intention-help" className="focus-help">
              {helperText}
            </p>
            <span className="focus-count">{intention.length}/200</span>
          </div>
          {showWarning && (
            <div id="focus-intention-warn" className="focus-warning" role="alert">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
              <span>{localizedText.warning}</span>
            </div>
          )}
        </div>

        {/* Duration chips */}
        <div className="focus-field">
          <span className="focus-label" id="focus-duration-label">
            {localizedText.duration}
          </span>
          <div
            className="focus-duration-grid"
            role="radiogroup"
            aria-labelledby="focus-duration-label"
          >
            {DURATIONS.map((d) => (
              <button
                key={d.value}
                type="button"
                role="radio"
                aria-checked={timer === d.value}
                className={`focus-chip ${timer === d.value ? "is-active" : ""}`}
                onClick={() => setTimer(d.value)}
              >
                <span className="focus-chip-num">{d.value}</span>
                <span className="focus-chip-unit">min</span>
              </button>
            ))}
          </div>
        </div>

        {/* Primary action */}
        <div className="focus-actions">
          <button
            type="button"
            disabled={proceedDisabled}
            onClick={handleSave}
            className={`focus-button ${proceedDisabled ? "is-disabled" : ""}`}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M8 5v14l11-7z" />
            </svg>
            <span>{localizedText.button}</span>
          </button>
          {actionHelp && <p className="focus-action-help">{actionHelp}</p>}
        </div>
      </div>
    </div>
  );
};

// ─── Shadow DOM mount ─────────────────────────────────────────────────────────
// We use a shadow root so the popup lives in a completely isolated DOM subtree.
// The host page's CSS cannot penetrate shadow DOM, and our CSS cannot bleed out.
// The host element is attached to <html> (not <body>) with !important inline
// styles so that transforms/filters/contain on <body> (common on Reddit and
// other SPAs) cannot create a new containing block that breaks position:fixed.
if (!document.getElementById(containerId)) {
  const host = document.createElement("div");
  host.id = containerId;

  // Force positioning via setProperty so site stylesheets cannot override it
  const fixedProps: [string, string][] = [
    ["position", "fixed"],
    ["top", "0"],
    ["left", "0"],
    ["width", "100vw"],
    ["height", "100vh"],
    ["z-index", "2147483647"],
    ["pointer-events", "none"],
    ["display", "block"],
    ["margin", "0"],
    ["padding", "0"],
    ["border", "none"],
    ["background", "none"],
    ["transform", "none"],
    ["filter", "none"],
    ["contain", "none"],
    ["overflow", "visible"],
  ];
  fixedProps.forEach(([prop, val]) => host.style.setProperty(prop, val, "important"));

  // Attach shadow root — complete CSS isolation
  const shadow = host.attachShadow({ mode: "open" });

  // NOTE: We intentionally do NOT inject a Google Fonts <link> here.
  // External stylesheet loads from fonts.googleapis.com are blocked by the
  // Content Security Policy of sites like Reddit. JetBrains Mono is listed
  // first in --fp-font-mono so it will be used if the user has it installed
  // system-wide; otherwise the stack falls back to ui-monospace / SF Mono.

  // Inject @font-face for Inter (local extension fonts) + all component styles
  const styleEl = document.createElement("style");
  styleEl.textContent = fontStyles + "\n" + popupStyles;
  shadow.appendChild(styleEl);

  // React mount point inside shadow root
  const mountPoint = document.createElement("div");
  shadow.appendChild(mountPoint);

  // Attach to <html> not <body> — body-level transforms/filters won't affect us
  (document.documentElement ?? document.body).appendChild(host);

  const root = createRoot(mountPoint);
  root.render(
    <IntentionProvider>
      <IntentionPopup />
    </IntentionProvider>,
  );
}
