import React, { useState, useEffect, useRef } from "react";
import ReactDOM from "react-dom/client";
import "./styles/popup.css";
import iconUrl from "../public/icons/bearLogo.png";
import setIcon from "../public/icons/settingsIcon.png";

import "@radix-ui/themes/styles.css";
import FocusTimer from "./components/FocusTimer";

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
  const [relaxlist, setRelaxlist] = useState<string[]>([]);
  const [newSite, setNewSite] = useState("");
  const [inFocusSession, setInFocusSession] = useState(false);
  const [innerTab, setInnerTab] = useState<"blocklist" | "relaxlist">("blocklist");
  const loadedOnce = useRef(false);

  const computeInFocusSession = (state: any) => {
    return !!(state && state.started === true && state.onBreak !== true);
  };

  useEffect(() => {
    if (loadedOnce.current) return;
    chrome.storage.local.get(["blocklist", "relaxlist", "focusSessionState"], (data) => {
      if (data.blocklist) setBlocklist(data.blocklist);
      if (data.relaxlist) setRelaxlist(data.relaxlist);
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
      if (changes.relaxlist) {
        setRelaxlist(changes.relaxlist.newValue || []);
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

    if (relaxlist.includes(site)) {
      const updatedRelax = relaxlist.filter((s) => s !== site);
      setRelaxlist(updatedRelax);
      chrome.storage.local.set({ relaxlist: updatedRelax });
    }
  };

  const toggleRelaxlist = (site: string) => {
    let updatedRelax: string[];
    if (relaxlist.includes(site)) {
      updatedRelax = relaxlist.filter((s) => s !== site);
    } else {
      updatedRelax = [...relaxlist, site];
    }
    setRelaxlist(updatedRelax);
    chrome.storage.local.set({ relaxlist: updatedRelax });
  };

  return (
    <div className="blocklist-editor">
      <div className="tab-buttons">
        <button
          className={`tab-button ${innerTab === "blocklist" ? "active" : ""}`}
          onClick={() => setInnerTab("blocklist")}
        >
          <span className="tab-label">Blocklist</span>
        </button>
        <button
          className={`tab-button ${innerTab === "relaxlist" ? "active" : ""}`}
          onClick={() => setInnerTab("relaxlist")}
        >
          <span className="tab-label">Relaxlist</span>
        </button>
      </div>

      {innerTab === "blocklist" && (
        <>
          <p className="blocklist-instructions">
            Enter a site to block during your Focus Sessions:
          </p>
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
                <div className="site-actions">
                  <button
                    className={relaxlist.includes(site) ? "active" : ""}
                    onClick={() => toggleRelaxlist(site)}
                  >
                    {relaxlist.includes(site) ? "Relax ✓" : "Add to Relax"}
                  </button>
                  <button onClick={() => removeSite(site)} disabled={inFocusSession}>
                    Remove
                  </button>
                </div>
              </li>
            ))}
          </ul>

          {inFocusSession && (
            <p className="settings-warning">Blocklist is locked during a Focus Session</p>
          )}
        </>
      )}

      {innerTab === "relaxlist" && (
        <>
          <p className="blocklist-instructions">These websites are accessible during your breaks</p>
          <ul className="site-list">
            {relaxlist.length === 0 && <li>No sites in Relaxlist</li>}
            {relaxlist.map((site) => (
              <li key={site} className="site-card">
                <span>{site}</span>
                <button
                  className="remove-button"
                  onClick={() => toggleRelaxlist(site)}
                  disabled={inFocusSession}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        </>
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

  const [currentTab, setCurrentTab] = useState<"timer" | "active" | "blocklist">("timer");

  const [allUnfocusSessions, setAllUnfocusSessions] = useState<
    Record<string, { intention: string; timeLeft: number }>
  >({});

  const [activeFocusSession, setActiveFocusSession] = useState<{
    task: string;
    phase: "focus" | "break";
    timeLeft: number;
    isRunning: boolean;
  } | null>(null);

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
        "youMenuBlurEnabled",
        "linkedinBlurHome",
        "linkedinBlurNews",
        "linkedinRemoveBadges",
        "wikiLinkPopupEnabled",
        "wikipediaMainBlur",
        "gmailBlurEnabled",
        "promotionBlurEnabled",
        "socialBlurEnabled",
      ],
      ({
        blurEnabled,
        commentsHidden,
        homePageBlurEnabled,
        shortsBlurEnabled,
        youMenuBlurEnabled,
        linkedinBlurHome,
        linkedinBlurNews,
        linkedinRemoveBadges,
        wikiLinkPopupEnabled,
        wikipediaMainBlur,
        gmailBlurEnabled,
        promotionBlurEnabled,
        socialBlurEnabled,
      }) => {
        setBlurEnabled(blurEnabled ?? true);
        setHidden(commentsHidden ?? true);
        setHomeBlurEnabled(homePageBlurEnabled ?? true);
        setShortsBlurEnabled(shortsBlurEnabled ?? true);
        setYouBlurEnabled(youMenuBlurEnabled ?? true);
        setLinkedinBlurHome(linkedinBlurHome ?? true);
        setLinkedinBlurNews(linkedinBlurNews ?? true);
        setLinkedinRemoveBadges(linkedinRemoveBadges ?? true);
        chrome.storage.local.set({ linkedinBlurJobs: false });
        setWikipediaLinkPopupEnabled(wikiLinkPopupEnabled ?? true);
        setWikipediaMainBlur(wikipediaMainBlur ?? true);
        setGmailBlurEnabled(gmailBlurEnabled ?? true);
        setPromotionBlurEnabled(promotionBlurEnabled ?? true);
        setSocialBlurEnabled(socialBlurEnabled ?? true);
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

  // Live session timer update
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
    chrome.storage.local.get({ youMenuBlurEnabled: true }, ({ youMenuBlurEnabled }) => {
      setYouBlurEnabled(youMenuBlurEnabled);
    });
    chrome.storage.local.get(
      { wikipediaLinkPopupEnabled: true },
      ({ wikipediaLinkPopupEnabled }) => {
        setWikipediaLinkPopupEnabled(wikipediaLinkPopupEnabled);
      },
    );
    chrome.storage.local.get({ wikipediaMainBlur: true }, ({ wikipediaMainBlur }) => {
      setWikipediaMainBlur(wikipediaMainBlur);
    });
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
          });
        } else {
          setActiveFocusSession(null);
        }
      });
    };

    updateSessions(); // first load
    const interval = setInterval(updateSessions, 1000); // update every second
    return () => clearInterval(interval);
  }, []);

  const handleShortsBlurToggle = async () => {
    const newValue = !shortsBlurEnabled;
    setShortsBlurEnabled(newValue);
    chrome.storage.local.set({ shortsBlurEnabled: newValue });
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

  const handleHomeBlurToggle = async () => {
    const newValue = !homeBlurEnabled;
    setHomeBlurEnabled(newValue);
    setBlurEnabled(newValue);
    chrome.storage.local.set({
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
    await chrome.storage.local.set({ youBlurEnabled: newValue });

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
    await chrome.storage.local.set({ linkedinBlurNews: newValue });
    await sendLinkedinToggleToActiveTab("TOGGLE_LINKEDIN_NEWS", newValue);
  };

  const handleLinkedinHomeToggle = async () => {
    const newValue = !linkedinBlurHome;
    setLinkedinBlurHome(newValue);
    await chrome.storage.local.set({ linkedinBlurHome: newValue });
    await sendLinkedinToggleToActiveTab("TOGGLE_LINKEDIN_HOME", newValue);
  };

  const handleLinkedinBadgeToggle = async () => {
    const newValue = !linkedinRemoveBadges;
    setLinkedinRemoveBadges(newValue);
    await chrome.storage.local.set({ linkedinRemoveBadges: newValue });
    await sendLinkedinToggleToActiveTab("TOGGLE_LINKEDIN_BADGES", newValue);
  };

  const handleWikipediaLinkPopupToggle = async () => {
    const newValue = !wikipediaLinkPopupEnabled;
    setWikipediaLinkPopupEnabled(newValue);
    await chrome.storage.local.set({ wikipediaLinkPopupEnabled: newValue });

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
    await chrome.storage.local.set({ wikipediaMainBlur: newValue });

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
    await chrome.storage.local.set({ gmailBlurEnabled: newValue });

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
    await chrome.storage.local.set({ promotionBlurEnabled: newValue });

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
    await chrome.storage.local.set({ socialBlurEnabled: newValue });

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

  const mainView = (
    <div className="main-view">
      <div className="main-header">
        <img src={iconUrl} alt="Focus Mode Icon" className="focus-logo" />
        <h1 className="popup-title">{t("home_title")}</h1>
      </div>
      {/* Tab buttons */}
      <div className="tab-buttons">
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
          {(activeFocusSession ? 1 : 0) + Object.keys(allUnfocusSessions).length > 0 && (
            <span className="tab-badge">
              {(activeFocusSession ? 1 : 0) + Object.keys(allUnfocusSessions).length}
            </span>
          )}
        </button>
        <button
          className={`tab-button ${currentTab === "blocklist" ? "active" : ""}`}
          onClick={() => setCurrentTab("blocklist")}
        >
          <span className="tab-label">Blocklist</span>
        </button>
      </div>
      {/* Tab content */}
      {currentTab === "timer" && (
        <div className="focus_session_player" style={{ backgroundColor: "#fffcf6" }}>
          <FocusTimer />
        </div>
      )}
      {currentTab === "blocklist" && (
        <div className="blocklist-tab">
          <BlocklistEditor />
        </div>
      )}
      {currentTab === "active" && (
        <div className="active-sessions">
          <section className="session-section">
            <h3 className="session-section-title">Focus Session</h3>
            {activeFocusSession ? (
              <div className="session-card focus-session-card">
                <div className="session-card-header">
                  <span className={`phase-badge phase-${activeFocusSession.phase}`}>
                    {activeFocusSession.phase === "focus" ? "Focusing" : "On Break"}
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
                  <span className="session-time">{formatTime(activeFocusSession.timeLeft)}</span>
                </div>
                <button className="complete-session-btn" onClick={handleCompleteFocusSession}>
                  ✓ Complete Session
                </button>
              </div>
            ) : (
              <p className="no-session">No focus sessions running</p>
            )}
          </section>

          <section className="session-section">
            <h3 className="session-section-title">Unfocus Sessions</h3>
            {Object.keys(allUnfocusSessions).length > 0 ? (
              <div className="session-list">
                {Object.entries(allUnfocusSessions).map(([domain, session]) => (
                  <div key={domain} className="session-card unfocus-session-card">
                    <div className="session-card-header">
                      <strong className="domain">{domain}</strong>
                    </div>
                    <div className="session-row">
                      <span className="label">{t("time_left")}</span>
                      <span className="session-time">{formatTime(session.timeLeft)}</span>
                    </div>
                    <div className="session-row">
                      <span className="label">{t("intention_label")}</span>
                      <span className="session-intention">{session.intention}</span>
                    </div>
                    <button
                      className="complete-session-btn"
                      onClick={() => handleCompleteUnfocusSession(domain)}
                    >
                      ✓ Complete Session
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="no-session">{t("no_unfocus_session")}</p>
            )}
          </section>
        </div>
      )}
      <img
        src={setIcon}
        alt="Settings Icon"
        className="settings-icon"
        onClick={() => {
          if (currentDomain && allUnfocusSessions[currentDomain]) {
            setSettingsBlockedMessage(true);
            setTimeout(() => setSettingsBlockedMessage(false), 3000); // hide after 3 sec
          } else {
            setShowSettings(true);
          }
        }}
      />
      {settingsBlockedMessage && (
        <p className="settings-warning">{t("settings_locked_during_unfocus_session")}</p>
      )}
    </div>
  );

  const settingsView = (
    <div className="settings-view">
      <div className="settings-header">
        <img src={iconUrl} alt="Focus Mode Icon" className="focus-logo" />
        <h2 className="settings-title">{t("settings_title")}</h2>
      </div>
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

        <label className="option-label">
          <span className="option-text">{t("blur_you_menu")}</span>
          <Toggle checked={youBlurEnabled} onChange={handleYouBlurToggle} />
        </label>

        <h3 className="settings-label">LinkedIn</h3>
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
        <h3 className="settings-label">Wikipedia</h3>
        <label className="option-label">
          <span className="option-text">Link Popup</span>
          <Toggle checked={wikipediaLinkPopupEnabled} onChange={handleWikipediaLinkPopupToggle} />
        </label>
        <label className="option-label">
          <span className="option-text">Main Page Blur</span>
          <Toggle checked={wikipediaMainBlur} onChange={handleWikipediaMainBlurToggle} />
        </label>
        <h3 className="settings-label">Gmail</h3>
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
      </div>
      <div className="settings-action-row">
        <button
          className="close-button settings-action-button"
          onClick={() => setShowSettings(false)}
        >
          {t("close_button")}
        </button>
      </div>
    </div>
  );

  return <div className="popup-container">{showSettings ? settingsView : mainView}</div>;
};

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
