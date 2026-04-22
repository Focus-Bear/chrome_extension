(() => {
  const STYLE_ID = "focusbear-linkedin-style";
  const BLUR_CLASS = "focusbear-linkedin-news-blur";
  const HIDE_BADGE_CLASS = "focusbear-hide-badge";
  const NEWS_MARKER = "data-focusbear-news-blur";
  const BADGE_MARKER = "data-focusbear-badge-hidden";

  const injectStyles = () => {
    if (document.getElementById(STYLE_ID)) return;
    const el = document.createElement("style");
    el.id = STYLE_ID;
    el.textContent = `
      .${BLUR_CLASS} {
        filter: blur(8px) !important;
        pointer-events: none !important;
        user-select: none !important;
        transition: filter 120ms linear !important;
      }
      .${HIDE_BADGE_CLASS} {
        display: none !important;
      }
    `;
    document.head.appendChild(el);
  };

  const isHomeFeed = () => window.location.pathname.startsWith("/feed");

  const isLikelyNewsCard = (el: HTMLElement) => {
    const rect = el.getBoundingClientRect();
    const rightSide = rect.left > window.innerWidth * 0.5;
    const cardLikeSize =
      rect.width >= 220 && rect.width <= 450 && rect.height >= 180 && rect.height <= 1200;
    return rightSide && cardLikeSize;
  };

  /** Find only the LinkedIn News card in the right rail (not the whole page/sidebar). */
  const findNewsContainer = (): HTMLElement | null => {
    if (!isHomeFeed()) return null;

    // Text-first targeting: find nodes whose own textContent contains "LinkedIn News".
    const baseNodes = Array.from(
      document.querySelectorAll<HTMLElement>("div, section, aside"),
    ).filter((el) => (el.textContent || "").includes("LinkedIn News"));
    if (baseNodes.length === 0) return null;

    const candidates: HTMLElement[] = [];
    baseNodes.forEach((node) => {
      // Walk up to a card-like ancestor and keep the first good match.
      let current: HTMLElement | null = node;
      for (let i = 0; i < 6 && current; i += 1) {
        const text = (current.textContent || "").toLowerCase();
        if (
          isLikelyNewsCard(current) &&
          (text.includes("top stories") ||
            text.includes("show more news") ||
            text.includes("today's puzzles"))
        ) {
          candidates.push(current);
          break;
        }
        current = current.parentElement;
      }
    });

    if (candidates.length === 0) return null;
    return candidates.sort(
      (a, b) => a.clientWidth * a.clientHeight - b.clientWidth * b.clientHeight,
    )[0];
  };

  const clearNewsBlur = () => {
    document.querySelectorAll<HTMLElement>(`[${NEWS_MARKER}="1"]`).forEach((el) => {
      el.classList.remove(BLUR_CLASS);
      el.removeAttribute(NEWS_MARKER);
    });
  };

  const setBlurNews = (enabled: boolean) => {
    const current = document.querySelector<HTMLElement>(`[${NEWS_MARKER}="1"]`);
    if (!enabled) {
      if (current) clearNewsBlur();
      return;
    }

    const node = findNewsContainer();
    if (!node) return;

    // Keep blur stable: only switch DOM state if target changed.
    if (current && current !== node) {
      current.classList.remove(BLUR_CLASS);
      current.removeAttribute(NEWS_MARKER);
    }
    if (!node.classList.contains(BLUR_CLASS)) node.classList.add(BLUR_CLASS);
    if (node.getAttribute(NEWS_MARKER) !== "1") node.setAttribute(NEWS_MARKER, "1");
  };

  const clearBadges = () => {
    document.querySelectorAll<HTMLElement>(`[${BADGE_MARKER}="1"]`).forEach((el) => {
      el.classList.remove(HIDE_BADGE_CLASS);
      el.removeAttribute(BADGE_MARKER);
    });
  };

  /** Hide count bubbles on top nav links; keep icons visible (matches "Remove Badges"). */
  const setRemoveBadges = (enabled: boolean) => {
    clearBadges();
    if (!enabled) return;

    const seen = new Set<HTMLElement>();
    const navItemLabels = ["my network", "jobs", "messaging", "notifications"];

    const navCandidates = Array.from(
      document.querySelectorAll<HTMLElement>("a[aria-label], button[aria-label]"),
    ).filter((el) => {
      const label = (el.getAttribute("aria-label") || "").toLowerCase();
      return navItemLabels.some((prefix) => label.startsWith(prefix));
    });

    const isBadgeBubble = (el: HTMLElement) => {
      const text = (el.textContent || "").trim();
      if (!/^\d+$/.test(text)) return false;
      const rect = el.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return false;
      // Keep this strict so we never hide icons/containers.
      if (rect.width > 42 || rect.height > 32) return false;
      if (el.childElementCount > 1) return false;
      return true;
    };

    const collectBadgeCandidates = (root: HTMLElement) => {
      const selectors = [
        "[aria-label*='unread' i]",
        "[data-test-notification-badge]",
        ".notification-badge",
        ".global-nav__primary-link-notif-badge",
        ".global-nav__primary-link-notification-badge",
        "span",
        "div",
      ];
      selectors.forEach((selector) => {
        root.querySelectorAll<HTMLElement>(selector).forEach((el) => {
          if (isBadgeBubble(el)) seen.add(el);
        });
      });
    };

    navCandidates.forEach((item) => {
      collectBadgeCandidates(item);
      // Search one level up for the tiny badge that may be sibling of icon span.
      const itemContainer = item.closest<HTMLElement>("li, nav");
      if (itemContainer) collectBadgeCandidates(itemContainer);
    });

    seen.forEach((node) => {
      node.classList.add(HIDE_BADGE_CLASS);
      node.setAttribute(BADGE_MARKER, "1");
    });
  };

  const applyFromStorage = (done?: () => void) => {
    injectStyles();
    chrome.storage.local.get({ linkedinBlurNews: true, linkedinRemoveBadges: true }, (res) => {
      try {
        setBlurNews(!!res.linkedinBlurNews);
        setRemoveBadges(!!res.linkedinRemoveBadges);
      } catch (e) {
        console.warn("FocusBear: LinkedIn apply failed", e);
      } finally {
        done?.();
      }
    });
  };

  chrome.runtime.onMessage.addListener((msg, _s, sendResponse) => {
    if (!msg?.type) return;
    if (msg.type === "TOGGLE_LINKEDIN_NEWS") {
      setBlurNews(!!msg.payload);
      sendResponse({ ok: true });
      return;
    }
    if (msg.type === "TOGGLE_LINKEDIN_BADGES") {
      setRemoveBadges(!!msg.payload);
      sendResponse({ ok: true });
      return;
    }
  });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "local") return;
    if (changes.linkedinBlurNews || changes.linkedinRemoveBadges) scheduleApply();
  });

  let scheduled = false;
  let scheduleTimer: number | null = null;
  const scheduleApply = () => {
    if (scheduled) return;
    scheduled = true;
    if (scheduleTimer) window.clearTimeout(scheduleTimer);
    scheduleTimer = window.setTimeout(
      () =>
        applyFromStorage(() => {
          scheduled = false;
          scheduleTimer = null;
        }),
      150,
    );
  };

  const patchHistory = () => {
    type M = typeof history.pushState;
    const wrap = (orig: M) =>
      function (this: History, ...args: Parameters<M>): ReturnType<M> {
        const ret = orig.apply(this, args);
        window.dispatchEvent(new Event("focusbear-linkedin-route"));
        return ret;
      };
    try {
      history.pushState = wrap(history.pushState);
      history.replaceState = wrap(history.replaceState);
    } catch {
      /* ignore */
    }
  };

  const start = () => {
    applyFromStorage(() => {
      scheduled = false;
    });
    if (document.body) {
      new MutationObserver((muts) => {
        if (muts.some((m) => m.addedNodes.length > 0)) scheduleApply();
      }).observe(document.body, { childList: true, subtree: true });
    }
    patchHistory();
    window.addEventListener("focusbear-linkedin-route", scheduleApply);
    window.addEventListener("popstate", scheduleApply);
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
})();

// This section of code for blurring linkedIn news section helped with cursor + removing badge notifications
