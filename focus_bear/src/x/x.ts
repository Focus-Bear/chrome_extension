(() => {
  const STYLE_ID = "focusbear-x-style";
  const BLUR_CLASS = "focusbear-x-blur";

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
    `;
    document.head.appendChild(el);
  };

  const setBlurHomeFeed = (enabled: boolean) => {
    const selectors = [
      'article',
      '[data-testid="tweet"]',
      '[data-testid="tweetText"]',
    ];
    selectors.forEach((sel) => {
      document.querySelectorAll<HTMLElement>(sel).forEach((el) => {
        if (enabled) el.classList.add(BLUR_CLASS);
        else el.classList.remove(BLUR_CLASS);
      });
    });
  };

  const setBlurRecommendations = (enabled: boolean) => {
    const selectors = [
      '[data-testid="sidebarColumn"]',
    ];
    selectors.forEach((sel) => {
      document.querySelectorAll<HTMLElement>(sel).forEach((el) => {
        if (enabled) el.classList.add(BLUR_CLASS);
        else el.classList.remove(BLUR_CLASS);
      });
    });
  };

  const setBlurReplies = (enabled: boolean) => {
    const selectors = [
      '[data-testid="reply"]',
      '[aria-label="Timeline: Conversation"] article',
    ];
    selectors.forEach((sel) => {
      document.querySelectorAll<HTMLElement>(sel).forEach((el) => {
        if (enabled) el.classList.add(BLUR_CLASS);
        else el.classList.remove(BLUR_CLASS);
      });
    });
  };

  const applyFromStorage = () => {
    injectStyles();
    chrome.storage.local.get(
      {
        xBlurHomeFeed: true,
        xBlurRecommendations: true,
        xBlurReplies: true,
      },
      (res) => {
        setBlurHomeFeed(!!res.xBlurHomeFeed);
        setBlurRecommendations(!!res.xBlurRecommendations);
        setBlurReplies(!!res.xBlurReplies);
      },
    );
  };

  chrome.runtime.onMessage.addListener((msg, _s, sendResponse) => {
    if (!msg?.type) return;
    if (msg.type === "TOGGLE_X_HOME_FEED") {
      setBlurHomeFeed(!!msg.payload);
      sendResponse({ ok: true });
    }
    if (msg.type === "TOGGLE_X_RECOMMENDATIONS") {
      setBlurRecommendations(!!msg.payload);
      sendResponse({ ok: true });
    }
    if (msg.type === "TOGGLE_X_REPLIES") {
      setBlurReplies(!!msg.payload);
      sendResponse({ ok: true });
    }
  });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "local") return;
    if (changes.xBlurHomeFeed || changes.xBlurRecommendations || changes.xBlurReplies) {
      applyFromStorage();
    }
  });

  const start = () => {
    applyFromStorage();
    if (document.body) {
      new MutationObserver((muts) => {
        if (muts.some((m) => m.addedNodes.length > 0)) applyFromStorage();
      }).observe(document.body, { childList: true, subtree: true });
    }
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
})();
