const browserApi = chrome;

(() => {
  const STYLE_ID = "focusbear-reddit-style";
  const BLUR_CLASS = "focusbear-reddit-blur";

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

  const isPostPage = () => window.location.pathname.includes("/comments/");

  // Blur the home feed posts and ads (only on feed, not post pages)
  const setBlurHomeFeed = (enabled: boolean) => {
    if (isPostPage()) return;
    const selectors = [
      "shreddit-post",
      '[data-testid="post-container"]',
      ".Post",
      "shreddit-ad-post",
      "[data-adclicklocation]",
      '[data-testid="ad-post"]',
    ];
    selectors.forEach((sel) => {
      document.querySelectorAll<HTMLElement>(sel).forEach((el) => {
        if (enabled) el.classList.add(BLUR_CLASS);
        else el.classList.remove(BLUR_CLASS);
      });
    });
  };

  // Blur recommended/popular communities in sidebar
  const setBlurCommunities = (enabled: boolean) => {
    const selectors = [
      '[aria-label="Communities"]',
      "aside",
      '[data-testid="subreddit-sidebar"]',
      "shreddit-communities-list",
      "shreddit-recommended-communities-widget",
    ];
    selectors.forEach((sel) => {
      document.querySelectorAll<HTMLElement>(sel).forEach((el) => {
        if (enabled) el.classList.add(BLUR_CLASS);
        else el.classList.remove(BLUR_CLASS);
      });
    });
  };

  // Blur comments section (only on post pages)
  const setBlurComments = (enabled: boolean) => {
    if (!isPostPage()) return;
    const selectors = ["shreddit-comment-tree", '[data-testid="comment"]', ".Comment"];
    selectors.forEach((sel) => {
      document.querySelectorAll<HTMLElement>(sel).forEach((el) => {
        if (enabled) el.classList.add(BLUR_CLASS);
        else el.classList.remove(BLUR_CLASS);
      });
    });
  };

  const applyFromStorage = () => {
    injectStyles();
    browserApi.storage.local.get(
      {
        redditBlurHomeFeed: true,
        redditBlurCommunities: true,
        redditBlurComments: true,
      },
      (res) => {
        setBlurHomeFeed(!!res.redditBlurHomeFeed);
        setBlurCommunities(!!res.redditBlurCommunities);
        setBlurComments(!!res.redditBlurComments);
      },
    );
  };

  browserApi.runtime.onMessage.addListener((msg, _s, sendResponse) => {
    if (!msg?.type) return;
    if (msg.type === "TOGGLE_REDDIT_HOME_FEED") {
      setBlurHomeFeed(!!msg.payload);
      sendResponse({ ok: true });
    }
    if (msg.type === "TOGGLE_REDDIT_COMMUNITIES") {
      setBlurCommunities(!!msg.payload);
      sendResponse({ ok: true });
    }
    if (msg.type === "TOGGLE_REDDIT_COMMENTS") {
      setBlurComments(!!msg.payload);
      sendResponse({ ok: true });
    }
  });

  browserApi.storage.onChanged.addListener((changes, area) => {
    if (area !== "local") return;
    if (changes.redditBlurHomeFeed || changes.redditBlurCommunities || changes.redditBlurComments) {
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
