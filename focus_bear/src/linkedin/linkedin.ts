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

  const findRailCardsByHeading = (headings: string[], evidenceTerms: string[]) => {
    if (!isHomeFeed()) return [] as HTMLElement[];

    // Text-first targeting in right rail; then walk up to nearest card-like ancestor.
    const baseNodes = Array.from(
      document.querySelectorAll<HTMLElement>("div, section, aside"),
    ).filter((el) => {
      const text = (el.textContent || "").toLowerCase();
      return headings.some((heading) => text.includes(heading));
    });
    if (baseNodes.length === 0) return [] as HTMLElement[];

    const candidates: HTMLElement[] = [];
    baseNodes.forEach((node) => {
      // Walk up to a card-like ancestor and keep the first good match for this text node.
      let current: HTMLElement | null = node;
      for (let i = 0; i < 8 && current; i += 1) {
        const text = (current.textContent || "").toLowerCase();
        if (
          isLikelyNewsCard(current) &&
          evidenceTerms.some((term) => text.includes(term))
        ) {
          candidates.push(current);
          break;
        }
        current = current.parentElement;
      }
    });

    if (candidates.length === 0) return [] as HTMLElement[];

    // De-dupe by element identity and sort to keep output stable.
    const unique = Array.from(new Set(candidates));
    return unique.sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top);
  };

  /** Find right-rail modules blurred by "Blur News": LinkedIn News + Today's puzzles. */
  const findNewsTargets = (): HTMLElement[] => {
    const newsCards = findRailCardsByHeading(
      ["linkedin news"],
      ["linkedin news", "top stories", "show more news"],
    );
    const puzzleCards = findRailCardsByHeading(
      ["today's puzzles", "todays puzzles"],
      ["today's puzzles", "todays puzzles", "patches #", "zip #", "mini sudoku #", "tango #"],
    );
    return Array.from(new Set([...newsCards, ...puzzleCards]));
  };

  const clearNewsBlur = () => {
    document.querySelectorAll<HTMLElement>(`[${NEWS_MARKER}="1"]`).forEach((el) => {
      el.classList.remove(BLUR_CLASS);
      el.removeAttribute(NEWS_MARKER);
    });
  };

  const setBlurNews = (enabled: boolean) => {
    const current = Array.from(
      document.querySelectorAll<HTMLElement>(`[${NEWS_MARKER}="1"]`),
    );
    if (!enabled) {
      if (current.length > 0) clearNewsBlur();
      return;
    }

    const targets = findNewsTargets();
    if (targets.length === 0) {
      // Avoid stale blur when LinkedIn re-renders or route changes.
      if (current.length > 0) clearNewsBlur();
      return;
    }

    const targetSet = new Set(targets);
    current.forEach((node) => {
      if (!targetSet.has(node)) {
        node.classList.remove(BLUR_CLASS);
        node.removeAttribute(NEWS_MARKER);
      }
    });

    targets.forEach((node) => {
      if (!node.classList.contains(BLUR_CLASS)) node.classList.add(BLUR_CLASS);
      if (node.getAttribute(NEWS_MARKER) !== "1") node.setAttribute(NEWS_MARKER, "1");
    });
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
