import React, { useState, useEffect, useRef } from "react";
import ReactDOM from "react-dom/client";
import "./styles/popup.css";
import focusBearLogoUrl from "../public/icons/focusBearLogo.png";
import settingsBearLogoUrl from "../public/icons/bearLogoSettings.png";
import setIcon from "../public/icons/settingsIcon.png";
import { Home, Info } from "lucide-react";

import "@radix-ui/themes/styles.css";
import FocusTimer from "./components/FocusTimer.js";

const storageSet = (values: Record<string, unknown>): Promise<void> =>
  new Promise((resolve) => chrome.storage.local.set(values, resolve));

const Toggle = ({
  checked,
  onChange,
  disabled = false,
}: {
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
}) => (
  <div
    className={`toggle ${checked ? "active" : "inactive"}${disabled ? " disabled" : ""}`}
    onClick={disabled ? undefined : onChange}
    aria-disabled={disabled}
  >
    <span className="toggle-text">{checked ? "ON" : "OFF"}</span>
    <div className="toggle-button" />
  </div>
);

const BlocklistEditor = () => {
  const [blocklist, setBlocklist] = useState<string[]>([]);
  const [newSite, setNewSite] = useState("");
  const [inFocusSession, setInFocusSession] = useState(false);
  const loadedOnce = useRef(false);

  const computeInFocusSession = (state: any) => {
    return !!(state && state.started === true && state.onBreak !== true);
  };

  useEffect(() => {
    if (loadedOnce.current) return;
    chrome.storage.local.get(["blocklist", "focusSessionState"], (data) => {
      if (data.blocklist) setBlocklist(data.blocklist);
      setInFocusSession(computeInFocusSession(data.focusSessionState));
      loadedOnce.current = true;
    });

    const handler = (
      changes: { [key: string]: chrome.storage.StorageChange },
      areaName: string,
    ) => {
      if (areaName !== "local") return;
      if (changes.focusSessionState) {
        setInFocusSession(computeInFocusSession(changes.focusSessionState.newValue));
      }
      if (changes.blocklist) {
        setBlocklist(changes.blocklist.newValue || []);
      }
    };
    chrome.storage.onChanged.addListener(handler);
    return () => chrome.storage.onChanged.removeListener(handler);
  }, []);

  const normalizeDomain = (input: string) => {
    let domain = input.trim().toLowerCase();
    domain = domain.replace(/^https?:\/\//, "");
    domain = domain.split("/")[0];
    return domain;
  };

  const addSite = () => {
    if (inFocusSession || !newSite.trim()) return;
    const formatted = normalizeDomain(newSite);
    if (!formatted) {
      setNewSite("");
      return;
    }
    if (!blocklist.includes(formatted)) {
      const updated = [...blocklist, formatted];
      setBlocklist(updated);
      chrome.storage.local.set({ blocklist: updated });
    }
    setNewSite("");
  };

  const removeSite = (site: string) => {
    if (inFocusSession) return;
    const updatedBlock = blocklist.filter((s) => s !== site);
    setBlocklist(updatedBlock);
    chrome.storage.local.set({ blocklist: updatedBlock });
  };

  return (
    <div className="blocklist-editor">
      <p className="blocklist-instructions">Enter a site to block during your Focus Sessions:</p>
      <div className="site-input-container">
        <input
          type="text"
          value={newSite}
          placeholder="e.g. youtube.com"
          onChange={(e) => setNewSite(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") addSite();
          }}
          disabled={inFocusSession}
        />
        <button onClick={addSite} disabled={inFocusSession}>
          Add
        </button>
      </div>

      <ul className="site-list">
        {blocklist.length === 0 && <li>No sites in Blocklist</li>}
        {blocklist.map((site) => (
          <li key={site} className="site-card">
            <span>{site}</span>
            <button onClick={() => removeSite(site)} disabled={inFocusSession}>
              Remove
            </button>
          </li>
        ))}
      </ul>

      {inFocusSession && (
        <p className="settings-warning">Blocklist is locked during a Focus Session</p>
      )}
    </div>
  );
};

const App = () => {
  const t = (key: string) => chrome.i18n.getMessage(key); // i18n helper
  const [blurEnabled, setBlurEnabled] = useState(true);
  const [hidden, setHidden] = useState(false);
  const [homeBlurEnabled, setHomeBlurEnabled] = useState(true);
  const [shortsBlurEnabled, setShortsBlurEnabled] = useState(true);
  const [youBlurEnabled, setYouBlurEnabled] = useState(true);
  const [linkedinBlurHome, setLinkedinBlurHome] = useState(true);
  const [linkedinBlurNews, setLinkedinBlurNews] = useState(true);
  const [linkedinRemoveBadges, setLinkedinRemoveBadges] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [settingsBlockedMessage, setSettingsBlockedMessage] = useState(false);
  const [currentDomain, setCurrentDomain] = useState<string | null>(null);
  const [wikipediaLinkPopupEnabled, setWikipediaLinkPopupEnabled] = useState(true);
  const [wikipediaMainBlur, setWikipediaMainBlur] = useState(true);
  const [gmailBlurEnabled, setGmailBlurEnabled] = useState(true);
  const [promotionBlurEnabled, setPromotionBlurEnabled] = useState(true);
  const [socialBlurEnabled, setSocialBlurEnabled] = useState(true);
  const [redditBlurHomeFeed, setRedditBlurHomeFeed] = useState(true);
  const [redditBlurCommunities, setRedditBlurCommunities] = useState(true);
  const [redditBlurComments, setRedditBlurComments] = useState(true);
  const [_xBlurHomeFeed, setXBlurHomeFeed] = useState(true);
  const [_xBlurRecommendations, setXBlurRecommendations] = useState(true);
  const [_xBlurReplies, setXBlurReplies] = useState(true);

  const [currentTab, setCurrentTab] = useState<"timer" | "active">("timer");
  const [settingsTab, setSettingsTab] = useState<"blurring" | "blocklist">("blurring");
  const [sessionsInitialized, setSessionsInitialized] = useState(false);
  const [showUnfocusTip, setShowUnfocusTip] = useState(false);

  const [allUnfocusSessions, setAllUnfocusSessions] = useState<
    Record<string, { intention: string; timeLeft: number }>
  >({});

  const [activeFocusSession, setActiveFocusSession] = useState<{
    task: string;
    phase: "focus" | "break";
    timeLeft: number;
    isRunning: boolean;
    breakMin: number;
  } | null>(null);

  useEffect(() => {
    chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
      if (tab?.url) {
        const domain = new URL(tab.url).hostname.replace(/^www\./, "");
        setCurrentDomain(domain);
      }
    });
  }, []);

  // Load toggles from storage when popup opens
  useEffect(() => {
    // Remove legacy snapshot key so content scripts only use per-toggle keys
    chrome.storage.local.remove("distractionToggles");

    chrome.storage.local.get(
      [
        "blurEnabled",
        "commentsHidden",
        "homePageBlurEnabled",
        "shortsBlurEnabled",
        "youMenuBlurEnabled",
        "youBlurEnabled",
        "linkedinBlurHome",
        "linkedinBlurNews",
        "linkedinRemoveBadges",
        "wikipediaLinkPopupEnabled",
        "wikiLinkPopupEnabled",
        "wikipediaMainBlur",
        "gmailBlurEnabled",
        "promotionBlurEnabled",
        "socialBlurEnabled",
        "redditBlurHomeFeed",
        "redditBlurCommunities",
        "redditBlurComments",
        "xBlurHomeFeed",
        "xBlurRecommendations",
        "xBlurReplies",
      ],
      (data) => {
        setBlurEnabled(data.blurEnabled ?? true);
        setHidden(data.commentsHidden ?? true);
        setHomeBlurEnabled(data.homePageBlurEnabled ?? true);
        setShortsBlurEnabled(data.shortsBlurEnabled ?? true);
        setYouBlurEnabled(data.youMenuBlurEnabled ?? data.youBlurEnabled ?? true);
        setLinkedinBlurHome(data.linkedinBlurHome ?? true);
        setLinkedinBlurNews(data.linkedinBlurNews ?? true);
        setLinkedinRemoveBadges(data.linkedinRemoveBadges ?? true);
        setWikipediaLinkPopupEnabled(
          data.wikipediaLinkPopupEnabled ?? data.wikiLinkPopupEnabled ?? true,
        );
        setWikipediaMainBlur(data.wikipediaMainBlur ?? true);
        setGmailBlurEnabled(data.gmailBlurEnabled ?? true);
        setPromotionBlurEnabled(data.promotionBlurEnabled ?? true);
        setSocialBlurEnabled(data.socialBlurEnabled ?? true);
        setRedditBlurHomeFeed(data.redditBlurHomeFeed ?? true);
        setRedditBlurCommunities(data.redditBlurCommunities ?? true);
        setRedditBlurComments(data.redditBlurComments ?? true);
        setXBlurHomeFeed(data.xBlurHomeFeed ?? true);
        setXBlurRecommendations(data.xBlurRecommendations ?? true);
        setXBlurReplies(data.xBlurReplies ?? true);
      },
    );
  }, []);

  useEffect(() => {
    const onChanged = (
      changes: Record<string, chrome.storage.StorageChange>,
      area: chrome.storage.AreaName,
    ) => {
      if (area !== "local") return;
      if (changes.linkedinBlurHome) {
        const v = changes.linkedinBlurHome.newValue;
        setLinkedinBlurHome(v !== undefined ? !!v : true);
      }
      if (changes.linkedinBlurNews) {
        const v = changes.linkedinBlurNews.newValue;
        setLinkedinBlurNews(v !== undefined ? !!v : true);
      }
      if (changes.linkedinRemoveBadges) {
        const v = changes.linkedinRemoveBadges.newValue;
        setLinkedinRemoveBadges(v !== undefined ? !!v : true);
      }
    };
    chrome.storage.onChanged.addListener(onChanged);
    return () => chrome.storage.onChanged.removeListener(onChanged);
  }, []);

  const handleCompleteUnfocusSession = (domain: string) => {
    chrome.storage.local.get("unfocusData", ({ unfocusData }) => {
      if (unfocusData && unfocusData[domain]) {
        delete unfocusData[domain];
        chrome.storage.local.set({ unfocusData }, async () => {
          setAllUnfocusSessions((prev) => {
            const updated = { ...prev };
            delete updated[domain];
            return updated;
          });
          const allTabs = await chrome.tabs.query({});
          allTabs.forEach((tab) => {
            if (tab.id && tab.url && tab.url.includes(domain)) {
              chrome.tabs.sendMessage(tab.id, {
                type: "COMPLETE_UNFOCUS_SESSION",
                payload: { domain },
              });
            }
          });
        });
      }
    });
  };

  const handleCompleteFocusSession = () => {
    chrome.runtime.sendMessage({ action: "resetFocusSession" }, () => {
      setActiveFocusSession(null);
    });
  };

  useEffect(() => {
    const updateSessions = () => {
      chrome.storage.local.get(["unfocusData", "focusSessionState"], (data) => {
        const { unfocusData, focusSessionState } = data;
        const sessions: Record<string, { intention: string; timeLeft: number }> = {};
        const now = Date.now();

        if (unfocusData) {
          Object.entries(unfocusData).forEach(([domain, data]: [string, any]) => {
            const { unfocusStart, unfocusDuration, unfocusIntention } = data;
            const end = unfocusStart + unfocusDuration * 60 * 1000;
            const timeLeft = Math.floor((end - now) / 1000);

            if (timeLeft > 0) {
              sessions[domain] = {
                intention: unfocusIntention,
                timeLeft,
              };
            }
          });
        }

        setAllUnfocusSessions(sessions);

        // Derive active Focus Session display state
        if (focusSessionState && focusSessionState.started) {
          const { task, workDuration, breakDuration, endTime, isRunning, onBreak } =
            focusSessionState;
          const phaseDuration = onBreak ? breakDuration : workDuration;
          const timeLeft = isRunning
            ? Math.max(Math.floor((endTime - now) / 1000), 0)
            : (focusSessionState.timeLeft ?? phaseDuration);
          setActiveFocusSession({
            task: task || "",
            phase: onBreak ? "break" : "focus",
            timeLeft,
            isRunning: !!isRunning,
            breakMin: Math.max(1, Math.round((breakDuration ?? 0) / 60)),
          });
        } else {
          setActiveFocusSession(null);
        }

        setSessionsInitialized(true);
      });
    };

    updateSessions(); // first load
    const interval = setInterval(updateSessions, 1000); // update every second
    return () => clearInterval(interval);
  }, []);

  const handleShortsBlurToggle = async () => {
    const newValue = !shortsBlurEnabled;
    setShortsBlurEnabled(newValue);
    await storageSet({ shortsBlurEnabled: newValue });
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });
    if (tab?.id) {
      chrome.tabs.sendMessage(tab.id, {
        type: "TOGGLE_SHORTS_BLUR",
        payload: newValue,
      });
      chrome.tabs.sendMessage(tab.id, {
        type: "TOGGLE_BLUR",
        payload: newValue,
      });
    }
  };

  const handleBlurToggle = async () => {
    const newValue = !blurEnabled;
    setBlurEnabled(newValue);
    await storageSet({ blurEnabled: newValue });
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });
    if (tab?.id) {
      chrome.tabs.sendMessage(tab.id, {
        type: "TOGGLE_BLUR",
        payload: newValue,
      });
      chrome.tabs.sendMessage(tab.id, {
        type: "TOGGLE_BLUR",
        payload: newValue,
      });
    }
  };

  const handleCommentsToggle = async () => {
    const newValue = !hidden;
    setHidden(newValue);
    await storageSet({ commentsHidden: newValue });

    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });
    if (tab?.id) {
      chrome.tabs.sendMessage(tab.id, {
        type: "TOGGLE_COMMENTS",
        payload: newValue,
      });
    }
  };

  const handleHomeBlurToggle = async () => {
    const newValue = !homeBlurEnabled;
    setHomeBlurEnabled(newValue);
    setBlurEnabled(newValue);
    await storageSet({
      homePageBlurEnabled: newValue,
      blurEnabled: newValue,
    });

    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });
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

  const handleYouBlurToggle = async () => {
    const newValue = !youBlurEnabled;
    setYouBlurEnabled(newValue);
    await storageSet({ youMenuBlurEnabled: newValue });

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) {
      chrome.tabs.sendMessage(tab.id, {
        type: "TOGGLE_YOU_MENU_BLUR",
        payload: newValue,
      });
    }
  };

  const sendLinkedinToggleToActiveTab = async (type: string, payload: boolean) => {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });
    if (!tab?.id || !tab.url?.includes("linkedin.com")) return;
    try {
      await chrome.tabs.sendMessage(tab.id, { type, payload });
    } catch {
      // Content script may not be ready yet; storage listener in linkedin.ts will still apply.
    }
  };

  const handleLinkedinNewsToggle = async () => {
    const newValue = !linkedinBlurNews;
    setLinkedinBlurNews(newValue);
    await storageSet({ linkedinBlurNews: newValue });
    await sendLinkedinToggleToActiveTab("TOGGLE_LINKEDIN_NEWS", newValue);
  };

  const handleLinkedinHomeToggle = async () => {
    const newValue = !linkedinBlurHome;
    setLinkedinBlurHome(newValue);
    await storageSet({ linkedinBlurHome: newValue });
    await sendLinkedinToggleToActiveTab("TOGGLE_LINKEDIN_HOME", newValue);
  };

  const handleLinkedinBadgeToggle = async () => {
    const newValue = !linkedinRemoveBadges;
    setLinkedinRemoveBadges(newValue);
    await storageSet({ linkedinRemoveBadges: newValue });
    await sendLinkedinToggleToActiveTab("TOGGLE_LINKEDIN_BADGES", newValue);
  };

  const handleWikipediaLinkPopupToggle = async () => {
    const newValue = !wikipediaLinkPopupEnabled;
    setWikipediaLinkPopupEnabled(newValue);
    await storageSet({ wikipediaLinkPopupEnabled: newValue });

    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });
    if (tab?.id) {
      await chrome.tabs.sendMessage(tab.id, {
        type: "TOGGLE_WIKI_LINK_POPUP",
        payload: newValue,
      });
    }
  };

  const handleWikipediaMainBlurToggle = async () => {
    const newValue = !wikipediaMainBlur;
    setWikipediaMainBlur(newValue);
    await storageSet({ wikipediaMainBlur: newValue });

    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });
    if (tab?.id) {
      await chrome.tabs.sendMessage(tab.id, {
        type: "TOGGLE_WIKIPEDIA_MAIN",
        payload: newValue,
      });
    }
  };

  const handleGmailBlurToggle = async () => {
    const newValue = !gmailBlurEnabled;
    setGmailBlurEnabled(newValue);
    await storageSet({ gmailBlurEnabled: newValue });

    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });
    if (tab?.id) {
      await chrome.tabs.sendMessage(tab.id, {
        type: "TOGGLE_GMAIL_BLUR",
        payload: newValue,
      });
    }
  };

  const handlePromotionBlurToggle = async () => {
    const newValue = !promotionBlurEnabled;
    setPromotionBlurEnabled(newValue);
    await storageSet({ promotionBlurEnabled: newValue });

    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });
    if (tab?.id) {
      await chrome.tabs.sendMessage(tab.id, {
        type: "TOGGLE_PROMOTION_BLUR",
        payload: newValue,
      });
    }
  };

  const handleSocialBlurToggle = async () => {
    const newValue = !socialBlurEnabled;
    setSocialBlurEnabled(newValue);
    await storageSet({ socialBlurEnabled: newValue });

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) {
      await chrome.tabs.sendMessage(tab.id, {
        type: "TOGGLE_SOCIAL_BLUR",
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

  const hasSessions = !!(activeFocusSession || Object.keys(allUnfocusSessions).length > 0);

  useEffect(() => {
    if (!hasSessions && currentTab === "active") {
      setCurrentTab("timer");
    }
  }, [hasSessions, currentTab]);

  const mainView = (
    <div className="main-view">
      <div className="main-header">
        <img src={focusBearLogoUrl} alt={t("home_title")} className="focus-bear-wordmark" />
        <div className="main-header-end">
          <button
            type="button"
            className="settings-icon-button"
            aria-label={t("settings_title")}
            onClick={() => {
              if (currentDomain && allUnfocusSessions[currentDomain]) {
                setSettingsBlockedMessage(true);
                setTimeout(() => setSettingsBlockedMessage(false), 3000); // hide after 3 sec
              } else {
                setShowSettings(true);
              }
            }}
          >
            <img src={setIcon} alt="" className="settings-icon" />
          </button>
        </div>
      </div>
      {/* Slot collapses to zero height when no session — no gap, no jump.
          Ghost during the brief init window so height is already there
          when a session is found on first load. */}
      <div
        className={`tab-bar-slot${
          sessionsInitialized && !hasSessions ? " tab-bar-slot--collapsed" : ""
        }`}
      >
        <div
          className={`tab-buttons${
            !sessionsInitialized
              ? " tab-buttons--ghost"
              : hasSessions
                ? " tab-buttons--visible"
                : " tab-buttons--ghost"
          }`}
        >
          <button
            className={`tab-button ${currentTab === "timer" ? "active" : ""}`}
            onClick={() => setCurrentTab("timer")}
          >
            <span className="tab-label">Focus Timer</span>
          </button>
          <button
            className={`tab-button ${currentTab === "active" ? "active" : ""}`}
            onClick={() => setCurrentTab("active")}
          >
            <span className="tab-label">Sessions</span>
            <span className="tab-badge">
              {(activeFocusSession ? 1 : 0) + Object.keys(allUnfocusSessions).length}
            </span>
          </button>
        </div>
      </div>
      {/* Tab content — always mounted to avoid remount flash; hidden via CSS */}
      <div className={`focus_session_player${currentTab !== "timer" ? " tab-pane--hidden" : ""}`}>
        <FocusTimer />
      </div>
      <div className={`active-sessions${currentTab !== "active" ? " tab-pane--hidden" : ""}`}>
        <section className="session-section">
          <h3 className="session-section-title">Focus Session</h3>
          {activeFocusSession ? (
            <div className="session-card focus-session-card">
              <div className="session-card-header">
                <span className={`phase-badge phase-${activeFocusSession.phase}`}>
                  {activeFocusSession.phase === "focus" ? "Working" : "On Break"}
                </span>
                {!activeFocusSession.isRunning && (
                  <span className="phase-badge phase-paused">Paused</span>
                )}
              </div>
              {activeFocusSession.task && (
                <div className="session-row">
                  <span className="label">Task:</span>
                  <span className="session-task">{activeFocusSession.task}</span>
                </div>
              )}
              <div className="session-row">
                <span className="label">{t("time_left")}</span>
                <span className="session-time-wrap">
                  <span className="session-time">{formatTime(activeFocusSession.timeLeft)}</span>
                  {activeFocusSession.phase === "focus" && activeFocusSession.breakMin > 0 && (
                    <span className="session-break-hint">{`-> ${activeFocusSession.breakMin} min break`}</span>
                  )}
                </span>
              </div>
              <button className="complete-session-btn" onClick={handleCompleteFocusSession}>
                Complete Session
              </button>
            </div>
          ) : (
            <p className="no-session">No focus sessions running</p>
          )}
        </section>

        <section className="session-section">
          <div className="session-section-head" style={{ justifyContent: "flex-start" }}>
            <h3 className="session-section-title" style={{ marginBottom: 0 }}>
              Unfocus Sessions
            </h3>
            <div className="ses-tip-wrap">
              <button
                className="ses-info-btn"
                aria-label="What is an Unfocus Session?"
                onMouseEnter={() => setShowUnfocusTip(true)}
                onMouseLeave={() => setShowUnfocusTip(false)}
              >
                <Info size={11} strokeWidth={2.5} />
              </button>
              {showUnfocusTip && (
                <div className="ses-tooltip" role="tooltip">
                  <strong>Unfocus Session</strong>
                  <p>A timed allowance to visit a distracting site with intent.</p>
                </div>
              )}
            </div>
          </div>
          {Object.keys(allUnfocusSessions).length > 0 ? (
            <div className="session-list">
              {Object.entries(allUnfocusSessions).map(([domain, session]) => (
                <div key={domain} className="session-card unfocus-session-card">
                  <div className="session-card-header">
                    <strong className="domain">{domain}</strong>
                  </div>
                  <div className="session-row">
                    <span className="label">{t("intention_label")}</span>
                    <span className="session-intention">{session.intention}</span>
                  </div>
                  <div className="session-row">
                    <span className="label">{t("time_left")}</span>
                    <span className="session-time">{formatTime(session.timeLeft)}</span>
                  </div>
                  <button
                    className="complete-session-btn"
                    onClick={() => handleCompleteUnfocusSession(domain)}
                  >
                    Complete Session
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="no-session no-session--left">{t("no_unfocus_session")}</p>
          )}
        </section>
      </div>
      {settingsBlockedMessage && (
        <p className="settings-warning">{t("settings_locked_during_unfocus_session")}</p>
      )}
    </div>
  );

  const settingsView = (
    <div className="settings-view">
      <div className="settings-header">
        <div className="header-brand">
          <img src={settingsBearLogoUrl} alt="" className="header-bear-icon" aria-hidden="true" />
          <h2 className="header-title">{t("settings_title").toLowerCase()}</h2>
        </div>
        <button
          type="button"
          className="settings-icon-button"
          aria-label={t("close_button")}
          onClick={() => setShowSettings(false)}
        >
          <Home aria-hidden="true" size={22} strokeWidth={3} />
        </button>
      </div>
      <div className="tab-buttons settings-tabs">
        <button
          className={`tab-button ${settingsTab === "blurring" ? "active" : ""}`}
          onClick={() => setSettingsTab("blurring")}
        >
          <span className="tab-label">Blurring</span>
        </button>
        <button
          className={`tab-button ${settingsTab === "blocklist" ? "active" : ""}`}
          onClick={() => setSettingsTab("blocklist")}
        >
          <span className="tab-label">Blocklist</span>
        </button>
      </div>
      {settingsTab === "blurring" && (
        <div className="options-container">
          <details className="settings-accordion" open>
            <summary>YouTube</summary>
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
            <label className="option-label">
              <span className="option-text">{t("blur_you_menu")}</span>
              <Toggle checked={youBlurEnabled} onChange={handleYouBlurToggle} />
            </label>
          </details>

          <details className="settings-accordion">
            <summary>LinkedIn</summary>
            <label className="option-label">
              <span className="option-text">{t("blur_linkedin_home")}</span>
              <Toggle checked={linkedinBlurHome} onChange={handleLinkedinHomeToggle} />
            </label>
            <label className="option-label">
              <span className="option-text">{t("remove_badges")}</span>
              <Toggle checked={linkedinRemoveBadges} onChange={handleLinkedinBadgeToggle} />
            </label>
            <label className="option-label">
              <span className="option-text">{t("blur_news")}</span>
              <Toggle checked={linkedinBlurNews} onChange={handleLinkedinNewsToggle} />
            </label>
          </details>

          <details className="settings-accordion">
            <summary>Wikipedia</summary>
            <label className="option-label">
              <span className="option-text">Link Popup</span>
              <Toggle
                checked={wikipediaLinkPopupEnabled}
                onChange={handleWikipediaLinkPopupToggle}
              />
            </label>
            <label className="option-label">
              <span className="option-text">Main Page Blur</span>
              <Toggle checked={wikipediaMainBlur} onChange={handleWikipediaMainBlurToggle} />
            </label>
          </details>

          <details className="settings-accordion">
            <summary>Gmail</summary>
            <label className="option-label">
              <span className="option-text">Blur Gmail</span>
              <Toggle checked={gmailBlurEnabled} onChange={handleGmailBlurToggle} />
            </label>
            <label className="option-label">
              <span className="option-text">Blur Promotions</span>
              <Toggle checked={promotionBlurEnabled} onChange={handlePromotionBlurToggle} />
            </label>
            <label className="option-label">
              <span className="option-text">Blur Social and Updates</span>
              <Toggle checked={socialBlurEnabled} onChange={handleSocialBlurToggle} />
            </label>
          </details>

          <details className="settings-accordion">
            <summary>Reddit</summary>
            <label className="option-label">
              <span className="option-text">Blur Home Feed</span>
              <Toggle
                checked={redditBlurHomeFeed}
                onChange={async () => {
                  const v = !redditBlurHomeFeed;
                  setRedditBlurHomeFeed(v);
                  await storageSet({ redditBlurHomeFeed: v });
                  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
                  if (tab?.id)
                    chrome.tabs.sendMessage(tab.id, {
                      type: "TOGGLE_REDDIT_HOME_FEED",
                      payload: v,
                    });
                }}
              />
            </label>
            <label className="option-label">
              <span className="option-text">Blur Communities</span>
              <Toggle
                checked={redditBlurCommunities}
                onChange={async () => {
                  const v = !redditBlurCommunities;
                  setRedditBlurCommunities(v);
                  await storageSet({ redditBlurCommunities: v });
                  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
                  if (tab?.id)
                    chrome.tabs.sendMessage(tab.id, {
                      type: "TOGGLE_REDDIT_COMMUNITIES",
                      payload: v,
                    });
                }}
              />
            </label>
            <label className="option-label">
              <span className="option-text">Blur Comments</span>
              <Toggle
                checked={redditBlurComments}
                onChange={async () => {
                  const v = !redditBlurComments;
                  setRedditBlurComments(v);
                  await storageSet({ redditBlurComments: v });
                  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
                  if (tab?.id)
                    chrome.tabs.sendMessage(tab.id, {
                      type: "TOGGLE_REDDIT_COMMENTS",
                      payload: v,
                    });
                }}
              />
            </label>
          </details>
        </div>
      )}
      {settingsTab === "blocklist" && (
        <div className="blocklist-tab">
          <BlocklistEditor />
        </div>
      )}
    </div>
  );

  return <div className="popup-container">{showSettings ? settingsView : mainView}</div>;
};

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
