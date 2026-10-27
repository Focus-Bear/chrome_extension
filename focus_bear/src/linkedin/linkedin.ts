import {
  CARD_BOUNDARY_SELECTOR,
  FEED_SELECTOR,
  LABELLED_COUNT_BADGE_SELECTORS,
  RIGHT_RAIL_CARDS,
  cardKindForHeading,
  isCountBadgeText,
  type RightRailCardKind,
} from "./rightRail.js";

declare const browser: typeof chrome | undefined;

(() => {
  const browserApi: typeof chrome =
    typeof browser !== "undefined" ? (browser as typeof chrome) : chrome;
  const STYLE_ID = "focusbear-linkedin-style";
  const BLUR_CLASS = "focusbear-linkedin-news-blur";
  const HIDE_BADGE_CLASS = "focusbear-hide-badge";
  const NEWS_MARKER = "data-focusbear-news-blur";
  const HOME_MARKER = "data-focusbear-home-blur";
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

  /** What marks a right-rail card: its heading's text node, or a link only that card holds. */
  type CardAnchor = { kind: RightRailCardKind; element: HTMLElement };

  const findHeadingAnchors = (): CardAnchor[] => {
    const anchors: CardAnchor[] = [];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const kind = cardKindForHeading(node.nodeValue || "");
      if (kind && node.parentElement) anchors.push({ kind, element: node.parentElement });
    }
    return anchors;
  };

  const findLinkAnchors = (): CardAnchor[] =>
    RIGHT_RAIL_CARDS.flatMap(({ kind, linkSelector }) =>
      Array.from(document.querySelectorAll<HTMLElement>(linkSelector)).map((element) => ({
        kind,
        element,
      })),
    );

  /** A card grows while it stays clear of the page frame, the feed and the other cards. */
  const canGrowInto = (parent: HTMLElement, kind: RightRailCardKind, anchors: CardAnchor[]) =>
    !parent.matches(CARD_BOUNDARY_SELECTOR) &&
    !parent.matches(FEED_SELECTOR) &&
    !parent.querySelector(FEED_SELECTOR) &&
    !anchors.some((other) => other.kind !== kind && parent.contains(other.element));

  const cardAround = (anchor: CardAnchor, anchors: CardAnchor[]): HTMLElement => {
    let card = anchor.element;
    let parent = card.parentElement;
    while (parent && canGrowInto(parent, anchor.kind, anchors)) {
      card = parent;
      parent = card.parentElement;
    }
    return card;
  };

  /** Find right-rail cards like "LinkedIn News" and "Today's puzzles". */
  const findRightRailCards = (): HTMLElement[] => {
    if (!isHomeFeed() || !document.body) return [];
    const anchors = [...findHeadingAnchors(), ...findLinkAnchors()].filter(
      (anchor) => !anchor.element.closest(FEED_SELECTOR),
    );
    const cards: HTMLElement[] = [];
    anchors.forEach((anchor) => {
      if (cards.some((card) => card.contains(anchor.element))) return;
      cards.push(cardAround(anchor, anchors));
    });
    return cards;
  };

  const clearNewsBlur = () => {
    document.querySelectorAll<HTMLElement>(`[${NEWS_MARKER}="1"]`).forEach((el) => {
      el.classList.remove(BLUR_CLASS);
      el.removeAttribute(NEWS_MARKER);
    });
  };

  const setBlurNews = (enabled: boolean) => {
    if (!enabled) {
      clearNewsBlur();
      return;
    }

    const nodes = findRightRailCards();
    if (nodes.length === 0) return;

    // Clear any stale target before applying new ones (cards can rerender/move).
    clearNewsBlur();
    nodes.forEach((node) => {
      if (!node.classList.contains(BLUR_CLASS)) node.classList.add(BLUR_CLASS);
      if (node.getAttribute(NEWS_MARKER) !== "1") node.setAttribute(NEWS_MARKER, "1");
    });
  };

  // ---------------------------- LinkedIn Home Feed blur ---------------------------- //
  const clearHomeBlur = () => {
    document.querySelectorAll<HTMLElement>(`[${HOME_MARKER}="1"]`).forEach((el) => {
      el.classList.remove(BLUR_CLASS);
      el.removeAttribute(HOME_MARKER);
    });
  };

  const markHomeBlur = (el: HTMLElement) => {
    el.classList.add(BLUR_CLASS);
    el.setAttribute(HOME_MARKER, "1");
  };

  const findHomeFeedBlurTargets = (): HTMLElement[] => {
    if (!isHomeFeed()) return [];

    const col = document.querySelector<HTMLElement>('[data-component-type="LazyColumn"]');
    if (!col) return [];

    const targets = new Set<HTMLElement>();
    const composer = col.children[0] as HTMLElement | undefined;

    const isAfterComposer = (el: HTMLElement) => {
      if (!composer) return true;
      return !!(composer.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING);
    };

    // 1) Direct blocks after "Start a post" (includes Sort by row).
    Array.from(col.children)
      .slice(1)
      .forEach((el) => targets.add(el as HTMLElement));

    // 2) Feed posts often sit in display:contents wrappers — blur those + their children.
    col.querySelectorAll<HTMLElement>('[data-display-contents="true"]').forEach((el) => {
      if (!isAfterComposer(el)) return;
      targets.add(el);
      Array.from(el.children).forEach((child) => {
        if (child instanceof HTMLElement) targets.add(child);
      });
    });

    return [...targets];
  };

  const setBlurHome = (enabled: boolean) => {
    clearHomeBlur();
    if (!enabled) return;

    findHomeFeedBlurTargets().forEach(markHomeBlur);
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
      if (!isCountBadgeText(el.textContent || "")) return false;
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

    document
      .querySelectorAll<HTMLElement>(LABELLED_COUNT_BADGE_SELECTORS.join(","))
      .forEach((badge) => seen.add(badge));

    seen.forEach((node) => {
      node.classList.add(HIDE_BADGE_CLASS);
      node.setAttribute(BADGE_MARKER, "1");
    });
  };

  const applyFromStorage = (done?: () => void) => {
    injectStyles();
    browserApi.storage.local.get(
      { linkedinBlurHome: true, linkedinBlurNews: true, linkedinRemoveBadges: true },
      (res) => {
        try {
          setBlurHome(!!res.linkedinBlurHome);
          setBlurNews(!!res.linkedinBlurNews);
          setRemoveBadges(!!res.linkedinRemoveBadges);
        } catch (e) {
          console.warn("FocusBear: LinkedIn apply failed", e);
        } finally {
          done?.();
        }
      },
    );
  };

  browserApi.runtime.onMessage.addListener((msg, _s, sendResponse) => {
    if (!msg?.type) return;
    injectStyles();
    if (msg.type === "TOGGLE_LINKEDIN_HOME") {
      setBlurHome(!!msg.payload);
      sendResponse({ ok: true });
      return;
    }
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

  browserApi.storage.onChanged.addListener((changes, area) => {
    if (area !== "local") return;
    if (changes.linkedinBlurHome || changes.linkedinBlurNews || changes.linkedinRemoveBadges) {
      scheduleApply();
    }
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
