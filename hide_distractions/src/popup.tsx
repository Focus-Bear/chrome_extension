import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom/client";
import "./styles/popup.css";
import iconUrl from "../public/icons/bearLogo.png";
import setIcon from "../public/icons/settingsIcon.png";

const Toggle = ({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: () => void;
}) => (
  <div
    className={`toggle ${checked ? "active" : "inactive"}`}
    onClick={onChange}
  >
    <span className="toggle-text">{checked ? "ON" : "OFF"}</span>
    <div className="toggle-button" />
  </div>
);

const App = () => {
  const t = (key: string) => chrome.i18n.getMessage(key); // i18n helper
  const [blurEnabled, setBlurEnabled] = useState(true);
  const [hidden, setHidden] = useState(false);
  const [homeBlurEnabled, setHomeBlurEnabled] = useState(true);
  const [shortsBlurEnabled, setShortsBlurEnabled] = useState(true);
  const [linkedinBlurPYMK, setLinkedinBlurPYMK] = useState(true);
  const [linkedinBlurNews, setLinkedinBlurNews] = useState(true);
  const [linkedinBlurJobs, setLinkedinBlurJobs] = useState(true);
  const [linkedinBlurHome, setLinkedinBlurHome] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [settingsBlockedMessage, setSettingsBlockedMessage] = useState(false);
  const [currentDomain, setCurrentDomain] = useState<string | null>(null);

  const [allFocusSessions, setAllFocusSessions] = useState<
    Record<string, { intention: string; timeLeft: number }>
  >({});

  useEffect(() => {
    chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
      if (tab?.url) {
        const domain = new URL(tab.url).hostname.replace(/^www\./, "");
        setCurrentDomain(domain);
      }
    });
  }, []);

  // Load toggles
  useEffect(() => {
    chrome.storage.local.get(
      [
        "blurEnabled",
        "commentsHidden",
        "homePageBlurEnabled",
        "shortsBlurEnabled",
        "linkedinBlurPYMK",
        "linkedinBlurNews",
        "linkedinBlurJobs",
        "linkedinBlurHome"
      ],
      ({
        blurEnabled,
        commentsHidden,
        homePageBlurEnabled,
        shortsBlurEnabled,
        linkedinBlurPYMK,
        linkedinBlurNews,
        linkedinBlurJobs,
        linkedinBlurHome
      }) => {
        setBlurEnabled(blurEnabled ?? true);
        setHidden(commentsHidden ?? true);
        setHomeBlurEnabled(homePageBlurEnabled ?? true);
        setShortsBlurEnabled(shortsBlurEnabled ?? true);
        setLinkedinBlurPYMK(linkedinBlurPYMK ?? true);
        setLinkedinBlurNews(linkedinBlurNews ?? true);
        setLinkedinBlurJobs(linkedinBlurJobs ?? true);
        setLinkedinBlurHome(linkedinBlurHome ?? true);
      }
    );
  }, []);

  // Live session timer update
  useEffect(() => {
    chrome.storage.local.get({ blurEnabled: true }, ({ blurEnabled }) => {
      setBlurEnabled(blurEnabled);
    });
    chrome.storage.local.get({ commentsHidden: true }, ({ commentsHidden }) => {
      setHidden(commentsHidden);
    });
    chrome.storage.local.get(
      { homePageBlurEnabled: true },
      ({ homePageBlurEnabled }) => {
        setHomeBlurEnabled(homePageBlurEnabled);
      }
    );
    chrome.storage.local.get(
      { shortsBlurEnabled: true },
      ({ shortsBlurEnabled }) => {
        setShortsBlurEnabled(shortsBlurEnabled);
      }
    );
    chrome.storage.local.get(
      { linkedinBlurPYMK: true }, 
      ({ linkedinBlurPYMK }) => {
        setLinkedinBlurPYMK(linkedinBlurPYMK);
      }
    );
    chrome.storage.local.get(
      { linkedinBlurNews: true }, 
      ({ linkedinBlurNews }) => {
        setLinkedinBlurNews(linkedinBlurNews);
      }
    );
    chrome.storage.local.get(
      { linkedinBlurJobs: true }, 
      ({ linkedinBlurJobs }) => {
        setLinkedinBlurJobs(linkedinBlurJobs);
      }
    );
    chrome.storage.local.get(
      { linkedinBlurHome: true }, 
      ({ linkedinBlurHome }) => {
        setLinkedinBlurHome(linkedinBlurHome);
      }
    );
  }, []);

  useEffect(() => {
    const updateSessions = () => {
      chrome.storage.local.get("focusData", ({ focusData }) => {
        const sessions: Record<
          string,
          { intention: string; timeLeft: number }
        > = {};
        const now = Date.now();

        if (focusData) {
          Object.entries(focusData).forEach(([domain, data]: [string, any]) => {
            const { focusStart, focusDuration, focusIntention } = data;
            const end = focusStart + focusDuration * 60 * 1000;
            const timeLeft = Math.floor((end - now) / 1000);

            if (timeLeft > 0) {
              sessions[domain] = {
                intention: focusIntention,
                timeLeft,
              };
            }
          });
        }

        setAllFocusSessions(sessions);
      });
    };

    console.log("sessions", allFocusSessions);
    updateSessions(); // first load
    const interval = setInterval(updateSessions, 1000); // update every second
    return () => clearInterval(interval);
  }, []);

  const handleShortsBlurToggle = async () => {
    const newValue = !shortsBlurEnabled;
    setShortsBlurEnabled(newValue);
    chrome.storage.local.set({ shortsBlurEnabled: newValue });
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) {
      chrome.tabs.sendMessage(tab.id, {
        type: "TOGGLE_SHORTS_BLUR",
        payload: newValue,
      });
      chrome.tabs.sendMessage(tab.id, { type: "TOGGLE_BLUR", payload: newValue });
    }
  };

  const handleBlurToggle = async () => {
    const newValue = !blurEnabled;
    setBlurEnabled(newValue);
    chrome.storage.local.set({ blurEnabled: newValue });
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) {
      chrome.tabs.sendMessage(tab.id, {
        type: "TOGGLE_BLUR",
        payload: newValue,
      });
      chrome.tabs.sendMessage(tab.id, { type: "TOGGLE_BLUR", payload: newValue });
    }
  };

  const handleCommentsToggle = async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) return;
    chrome.tabs.sendMessage(tab.id, { action: "toggleComments" }, (res) => {
      if (!chrome.runtime.lastError && res?.status) {
        setHidden(res.status === "hidden");
      }
    });
  };

  const handleHomeBlurToggle = async () => {
    const newValue = !homeBlurEnabled;
    setHomeBlurEnabled(newValue);
    setBlurEnabled(newValue);
    chrome.storage.local.set({ homePageBlurEnabled: newValue, blurEnabled: newValue });

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) {
      chrome.tabs.sendMessage(tab.id, {
        type: "TOGGLE_HOME_PAGE_BLUR",
        payload: newValue,
      });
      chrome.tabs.sendMessage(tab.id, {
        type: "TOGGLE_BLUR",
        payload: newValue,
      });
    }
  };

  const handleLinkedinBlurToggle = async () => {
    const newValue = !linkedinBlurPYMK;
    setLinkedinBlurPYMK(newValue);
    await chrome.storage.local.set({ linkedinBlurPYMK: newValue });

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) {
      await chrome.tabs.sendMessage(tab.id, {
        type: "TOGGLE_LINKEDIN_BLUR",
        payload: newValue,
      });
    }
  };

  const handleLinkedinNewsToggle = async () => {
    const newValue = !linkedinBlurNews;
    setLinkedinBlurNews(newValue);
    await chrome.storage.local.set({ linkedinBlurNews: newValue });

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) {
      await chrome.tabs.sendMessage(tab.id, {
        type: "TOGGLE_LINKEDIN_NEWS",
        payload: newValue,
      });
    }
  };

  const handleLinkedinJobsToggle = async () => {
    const newValue = !linkedinBlurJobs;
    setLinkedinBlurJobs(newValue);
    await chrome.storage.local.set({ linkedinBlurJobs: newValue });

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) {
      await chrome.tabs.sendMessage(tab.id, {
        type: "TOGGLE_LINKEDIN_JOBS_BLUR",
        payload: newValue,
      });
    }
  };

  const handleLinkedinHomeToggle = async () => {
    const newValue = !linkedinBlurHome;
    setLinkedinBlurHome(newValue);
    await chrome.storage.local.set({ linkedinBlurHome: newValue });

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) {
      await chrome.tabs.sendMessage(tab.id, {
        type: "TOGGLE_LINKEDIN_HOME",
        payload: newValue,
      });
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60)
      .toString()
      .padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const mainView = (
    <div className="main-view">
      <img src={iconUrl} alt="Focus Mode Icon" className="focus-logo" />
      <h1 className="popup-title">{t("home_title")}</h1>

      {Object.keys(allFocusSessions).length > 0 ? (
        <div className="session-list">
          {Object.entries(allFocusSessions).map(([domain, session]) => (
            <div key={domain} className="session-card">
              <strong className="domain">{domain}</strong>
              <br />
              <span className="label">{t("time_left")}</span>{" "}
              {formatTime(session.timeLeft)}
              <br />
              <span className="label">{t("intention_label")}</span> {session.intention}
            </div>
          ))}
        </div>
      ) : (
        <p className="no-session">{t("no_focus_session")}</p>
      )}

      <img
        src={setIcon}
        alt="Settings Icon"
        className="settings-icon"
        onClick={() => {
          if (currentDomain && allFocusSessions[currentDomain]) {
            setSettingsBlockedMessage(true);
            setTimeout(() => setSettingsBlockedMessage(false), 3000); // hide after 3 sec
          } else {
            setShowSettings(true);
          }
        }}
      />
      {settingsBlockedMessage && (
        <p className="settings-warning">
          {t("settings_locked_during_session")}
        </p>
      )}
    </div>
  );

  const settingsView = (
    <div>
      <img src={iconUrl} alt="Focus Mode Icon" className="focus-logo" />
      <h2 className="settings-title">{t("settings_title")}</h2>
      <div className="options-container">
        <h3 className="settings-label">YouTube</h3>
        <label className="option-label">
          <span className="option-text">{t("blur_home")}</span>
          <Toggle checked={homeBlurEnabled} onChange={handleHomeBlurToggle} />
        </label>
        <div style={{ display: "none" }}>
          <label className="option-label">
            <span className="option-text">{t("blur_distractions")}</span>
            <Toggle checked={blurEnabled} onChange={handleBlurToggle} />
          </label>
        </div>
        <label className="option-label">
          <span className="option-text">{t("hide_comments")}</span>
          <Toggle checked={hidden} onChange={handleCommentsToggle} />
        </label>
        <label className="option-label">
          <span className="option-text">{t("blur_shorts")}</span>
          <Toggle checked={shortsBlurEnabled} onChange={handleShortsBlurToggle} />
        </label>
        <h3 className="settings-label">LinkedIn</h3>
        <label className="option-label">
          <span className="option-text">{t("blur_PYMK")}</span>
          <Toggle checked={linkedinBlurPYMK} onChange={handleLinkedinBlurToggle} />
        </label>
        <label className="option-label">
          <span className="option-text">{t("blur_news")}</span>
          <Toggle checked={linkedinBlurNews} onChange={handleLinkedinNewsToggle} />
        </label>
        <label className="option-label">
          <span className="option-text">{t("blur_jobs")}</span>
          <Toggle checked={linkedinBlurJobs} onChange={handleLinkedinJobsToggle} />
        </label>
        <label className="option-label">
          <span className="option-text">{t("blur_home")}</span>
          <Toggle checked={linkedinBlurHome} onChange={handleLinkedinHomeToggle} />
        </label>
      </div>
      <button className="close-button" onClick={() => setShowSettings(false)}>
        {t("close_button")}
      </button>
    </div>
  );

  return (
    <div className="popup-container">
      {showSettings ? settingsView : mainView}
    </div>
  );
};

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
