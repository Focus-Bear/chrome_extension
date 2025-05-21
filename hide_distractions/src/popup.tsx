import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { IntentionProvider, useIntention } from "./context/intentionPopupContext";
import { useFocusTimer } from "./hooks/useFocusTimer";
import "./styles/popup.css";
import setIcon from '../public/icons/settingsIcon.png';

// Add custom Toggle component
const Toggle = ({ checked, onChange }: { checked: boolean; onChange: () => void }) => {
  return (
    <div className={`toggle ${checked ? 'active' : 'inactive'}`} onClick={onChange}>
      <span className="toggle-text">
        {checked ? 'ON' : 'OFF'}
      </span>
      <div className="toggle-button" />
    </div>
  );
};

const App = () => {
  const [blurEnabled, setBlurEnabled] = useState(true);
  const [hidden, setHidden] = useState(false);
  const [homeBlurEnabled, setHomeBlurEnabled] = useState(true);
  const [shortsBlurEnabled, setShortsBlurEnabled] = useState(true);
  const { intention, timeLeft, timerActive } = useFocusTimer();

  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    chrome.storage.local.get({ blurEnabled: true }, ({ blurEnabled }) => {
      setBlurEnabled(blurEnabled);
    });

    chrome.storage.local.get({ commentsHidden: true }, ({ commentsHidden }) => {
      setHidden(commentsHidden);
    });

    chrome.storage.local.get({ homePageBlurEnabled: true }, ({ homePageBlurEnabled }) => {
      setHomeBlurEnabled(homePageBlurEnabled);
    });

    chrome.storage.local.get({ shortsBlurEnabled: true }, ({ shortsBlurEnabled }) => {
      setShortsBlurEnabled(shortsBlurEnabled);
    });

  }, []);

  const handleShortsBlurToggle = async () => {
    const newValue = !shortsBlurEnabled;
    setShortsBlurEnabled(newValue);
    chrome.storage.local.set({ shortsBlurEnabled: newValue });

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) {
      chrome.tabs.sendMessage(tab.id, {
        type: 'TOGGLE_SHORTS_BLUR',
        payload: newValue,
      });
    }
  };


  const handleBlurToggle = async () => {
    const newValue = !blurEnabled;
    setBlurEnabled(newValue);
    chrome.storage.local.set({ blurEnabled: newValue });

    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });
    if (tab?.id) {
      chrome.tabs.sendMessage(tab.id, {
        type: "TOGGLE_BLUR",
        payload: newValue,
      });
    }
  };

  const handleCommentsToggle = async () => {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });
    if (!tab?.id) return;

    chrome.tabs.sendMessage(tab.id, { action: "toggleComments" }, (res) => {
      if (!chrome.runtime.lastError && res?.status) {
        setHidden(res.status === "hidden");
      }
    });
  };
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60)
      .toString()
      .padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const handleHomeBlurToggle = async () => {
    const newValue = !homeBlurEnabled;
    setHomeBlurEnabled(newValue);
    chrome.storage.local.set({ homePageBlurEnabled: newValue });

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) {
      chrome.tabs.sendMessage(tab.id, {
        type: 'TOGGLE_HOME_PAGE_BLUR',
        payload: newValue,
      });
    }
  };

  const mainView = (
    <div>
      <h1 style={{ fontSize: 20, marginBottom: 12 }}>Focus Bear</h1>
      {timerActive ? (
        <div style={{ marginTop: 20 }}>
          <strong>Intention:</strong> <span>{intention}</span>
          <br />
          <strong>Time Left:</strong> <span>{formatTime(timeLeft)}</span>
        </div>
      ) : (
        <p style={{ marginTop: 20 }}>No active focus session.</p>
      )}
      <img
        src={setIcon} alt="Settings Icon"
        style={{
          position: 'absolute',
          top: 16,
          right: 16,
          width: 24,
          height: 24,
          cursor: 'pointer'}}
        onClick={() => setShowSettings(true)}
      />
    </div>
  )

  const settingsView = (
    <div>
      <div>
        <h2 style={{ marginTop: 0 }}>Settings</h2>
        <div className="options-container">
        <label className="option-label">
          <span className="option-text">Blur Home Page</span>
          <Toggle checked={homeBlurEnabled} onChange={handleHomeBlurToggle} />
        </label>

        <label className="option-label">
          <span className="option-text">Blur Distractions</span>
          <Toggle checked={blurEnabled} onChange={handleBlurToggle} />
        </label>

        <label className="option-label">
          <span className="option-text">Hide Comments</span>
          <Toggle checked={hidden} onChange={handleCommentsToggle} />
        </label>

        <label className="option-label">
          <span className="option-text">Blur Shorts</span>
          <Toggle checked={shortsBlurEnabled} onChange={handleShortsBlurToggle} />
        </label>

      </div>

        <button
          style={{ marginTop: 16 }}
          onClick={() => setShowSettings(false)}
        >
          Close
        </button>
      </div>
    </div>
  )

  return (
    <div className="popup-container">
      {showSettings ? settingsView : mainView}
    </div>
  );
};

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <IntentionProvider>
      <App />
    </IntentionProvider>
  </React.StrictMode>
);