console.log("Content script injected");

const COMMENT_BLUR_ID = 'focus-bear-comment-blur-style';
const selectorsToHide = [
  '#comments',
  'ytd-item-section-renderer[static-comments-header]',
  '#continuations',      
  '.sidebar',
  // 'ytd-watch-next-secondary-results-renderer'
];

// Inject floatingPopup if not already present
if (!document.getElementById("intention-popup-script")) {
  const script = document.createElement("script");
  script.src = chrome.runtime.getURL("floatingPopup.js");
  script.id = "intention-popup-script";
  script.type = "module";
  document.body.appendChild(script);
}

let focusTimer: ReturnType<typeof setTimeout> | null = null;
let isBlurEnabled = true;

window.addEventListener("message", (event) => {
  if (event.source !== window) return;

  // Save intention (sent from popup to content)
  if (event.data.type === "SAVE_INTENTION") {
    const intention = event.data.payload;
    const customEvent = new CustomEvent("intention-saved", { detail: intention });
    window.dispatchEvent(customEvent);
  }

  // Start timer and dispatch event when finished
  if (event.data.type === "START_FOCUS_TIMER") {
    const durationInMinutes = event.data.payload;

    if (focusTimer) clearTimeout(focusTimer);

    console.log(`Starting focus timer for ${durationInMinutes} minutes.`);
    focusTimer = setTimeout(() => {
      console.log("Focus timer ended. Dispatching SHOW_POPUP event.");
      window.dispatchEvent(new CustomEvent("show-popup-again"));
    }, durationInMinutes * 60 * 1000);
  }
});

for (const selector of selectorsToHide) {
  const el = document.querySelector(selector);
  if (el) el.remove();
}

const blurShortsMenu = () => {
  const shorts = Array.from(document.querySelectorAll("ytd-guide-entry-renderer"))
    .find(el => el.textContent?.trim().toLowerCase() === "shorts") as HTMLElement | undefined;

  if (shorts) {
    shorts.style.filter = "blur(6px)";
    shorts.style.pointerEvents = "none";
    shorts.style.userSelect = "none";
  }
};
const unblurShortsMenu = () => {
  const shorts = Array.from(document.querySelectorAll("ytd-guide-entry-renderer"))
    .find(el => el.textContent?.trim().toLowerCase() === "shorts") as HTMLElement | undefined;

  if (shorts) {
    shorts.style.filter = "none";
    shorts.style.pointerEvents = "auto";
    shorts.style.userSelect = "auto";
  }
};

const isShortsPage = () => {
  return window.location.pathname.startsWith("/shorts/");
};

const blurShortsPage = () => {
  const shortsRoot = document.querySelector("ytd-reel-video-renderer, #shorts-container, .reel-video-renderer") as HTMLElement | null;
  if (shortsRoot) {
    shortsRoot.style.filter = "blur(8px)";
    shortsRoot.style.pointerEvents = "none";
    shortsRoot.style.userSelect = "none";
  }
};

const unblurShortsPage = () => {
  const shortsRoot = document.querySelector("ytd-reel-video-renderer, #shorts-container, .reel-video-renderer") as HTMLElement | null;
  if (shortsRoot) {
    shortsRoot.style.filter = "none";
    shortsRoot.style.pointerEvents = "auto";
    shortsRoot.style.userSelect = "auto";
  }
};

const blurShortsShelf = () => {
  const possibleShortsBlocks = document.querySelectorAll(`
    ytd-rich-section-renderer,
    ytd-reel-shelf-renderer,
    ytd-grid-video-renderer,
    ytd-video-renderer
  `);

  possibleShortsBlocks.forEach((block) => {
    const text = block.textContent?.toLowerCase() ?? "";

    if (text.includes("#shorts") || text.includes("shorts")) {
      const el = block as HTMLElement;
      el.style.filter = "blur(6px)";
      el.style.pointerEvents = "none";
      el.style.userSelect = "none";
    }
  });
};
const unblurShortsShelf = () => {
  const possibleShortsBlocks = document.querySelectorAll(`
    ytd-rich-section-renderer,
    ytd-reel-shelf-renderer,
    ytd-grid-video-renderer,
    ytd-video-renderer
  `);

  possibleShortsBlocks.forEach((block) => {
    const text = block.textContent?.toLowerCase() ?? "";

    if (text.includes("#shorts") || text.includes("shorts")) {
      const el = block as HTMLElement;
      el.style.filter = "none";
      el.style.pointerEvents = "auto";
      el.style.userSelect = "auto";
    }
  });
};



const applyBlurToSections = () => {
  const sections = document.querySelectorAll("ytd-guide-section-renderer");
  sections.forEach((section, index) => {
    if ([1, 2, 3].includes(index)) {
      const el = section as HTMLElement;
      el.style.filter = "blur(6px)";
      el.style.pointerEvents = "none";
      el.style.userSelect = "none";
    }
  });
};


const blurChipsBar = () => {
  const chips = document.querySelector("ytd-feed-filter-chip-bar-renderer") as HTMLElement | null;
  if (chips) {
    const height = chips.offsetHeight;

    chips.style.filter = "blur(6px)";
    chips.style.pointerEvents = "none";
    chips.style.userSelect = "none";
    chips.style.height = `${height}px`;
    chips.style.position = "relative";
    chips.style.overflow = "hidden";
    chips.style.display = "block";
    chips.style.boxSizing = "border-box";
  }
};

const removeBlur = () => {
  document.querySelectorAll("ytd-guide-section-renderer").forEach((el) => {
    const elem = el as HTMLElement;
    elem.style.filter = "";
    elem.style.pointerEvents = "";
    elem.style.userSelect = "";
  });

  const chips = document.querySelector("ytd-feed-filter-chip-bar-renderer") as HTMLElement | null;
  if (chips) {
    chips.style.filter = "";
    chips.style.pointerEvents = "";
    chips.style.userSelect = "";
    chips.style.height = "";
    chips.style.position = "";
    chips.style.overflow = "";
    chips.style.display = "";
    chips.style.boxSizing = "";
  }
};

const applyBlurImmediately = () => {
  applyBlurToSections();
  blurChipsBar();
  blurShortsMenu();
  blurShortsShelf();
  if (isShortsPage()) {
    blurShortsPage();
  }
};


const sidebarObserver = new MutationObserver(() => {
  if (isBlurEnabled) applyBlurToSections();
});
const chipsObserver = new MutationObserver(() => {
  if (isBlurEnabled) blurChipsBar();
});
const shortsmenuObserver = new MutationObserver(() => {
  chrome.storage.local.get({ shortsBlurEnabled: true }, ({ shortsBlurEnabled }) => {
    if (shortsBlurEnabled) blurShortsMenu();
    else unblurShortsMenu();
  });
});
const shortspageObserver = new MutationObserver(() => {
  chrome.storage.local.get({ shortsBlurEnabled: true }, ({ shortsBlurEnabled }) => {
    if (isShortsPage()) {
      if (shortsBlurEnabled) blurShortsPage();
      else unblurShortsPage();
    }
  });
});
const shortsshelfObserver = new MutationObserver(() => {
  chrome.storage.local.get({ shortsBlurEnabled: true }, ({ shortsBlurEnabled }) => {
    if (shortsBlurEnabled) blurShortsShelf();
    else unblurShortsShelf();
  });
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const { type, payload } = message;

  if (type === "TOGGLE_BLUR") {
    isBlurEnabled = payload;
    chrome.storage.local.set({ blurEnabled: isBlurEnabled });

    if (isBlurEnabled) {
      applyBlurImmediately();
      sidebarObserver.observe(document.body, { childList: true, subtree: true });
      chipsObserver.observe(document.body, { childList: true, subtree: true }); 
    } else {
      removeBlur();
      sidebarObserver.disconnect();
      chipsObserver.disconnect();
    }
  }
});

chrome.storage.local.get({ blurEnabled: true }, ({ blurEnabled }) => {
  isBlurEnabled = blurEnabled;

  if (isBlurEnabled) {
    applyBlurImmediately();
  }
  sidebarObserver.observe(document.body, { childList: true, subtree: true });
  chipsObserver.observe(document.body, { childList: true, subtree: true });
  shortsmenuObserver.observe(document.body, { childList: true, subtree: true });
  shortsshelfObserver.observe(document.body, { childList: true, subtree: true });
  shortspageObserver.observe(document.body, { childList: true, subtree: true });
});

// Blur comments
function applyCommentBlur() {
  if (document.getElementById(COMMENT_BLUR_ID)) return;
  const style = document.createElement('style');
  style.id = COMMENT_BLUR_ID;
  style.textContent = selectorsToHide
    .map(sel => `
      ${sel} {
        filter: blur(6px) !important;
        pointer-events: none !important;
        user-select: none !important;
      }
    `)
    .join('\n');
  document.head.appendChild(style);
}

function removeCommentBlur() {
  const style = document.getElementById(COMMENT_BLUR_ID);
  if (style) style.remove();
}

// on page load, read storage and blur if needed
const commentsObserver = new MutationObserver(() => {
  chrome.storage.local.get('commentsHidden', ({ commentsHidden }) => {
    if (commentsHidden) applyCommentBlur();
  });
});
commentsObserver.observe(document.body, { childList: true, subtree: true });

// listen for your popup toggle
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.action === 'toggleComments') {
    chrome.storage.local.get({ commentsHidden: false }, ({ commentsHidden }) => {
      const nowHidden = !commentsHidden;
      if (nowHidden) applyCommentBlur();
      else removeCommentBlur();
      chrome.storage.local.set({ commentsHidden: nowHidden }, () => {
        sendResponse({ status: nowHidden ? 'hidden' : 'shown' });
      });
    });
    return true;
  }
});

function applyShortsToggle(shouldBlur: boolean) {
  if (shouldBlur) {
    blurShortsMenu();
    if (isShortsPage()) blurShortsPage();
    blurShortsShelf();
  } else {
    unblurShortsMenu();
    if (isShortsPage()) unblurShortsPage();
    unblurShortsShelf();
  }
}
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'TOGGLE_SHORTS_BLUR') {
    const blurShorts = message.payload;
    chrome.storage.local.set({ shortsBlurEnabled: blurShorts });
    applyShortsToggle(blurShorts);
  }
});


let lastUrl = location.href;
const observeUrlChanges = () => {
  const observer = new MutationObserver(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;

      if (isShortsPage() && isBlurEnabled) {
        blurShortsPage();
      }
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });
};
observeUrlChanges();