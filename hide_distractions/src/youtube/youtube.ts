(() => {
  console.log("YouTube blur script injected at", location.href);

  const COMMENT_BLUR_ID = "focus-bear-comment-blur-style";
  const selectorsToHide = [
    "#comments",
    "ytd-item-section-renderer[static-comments-header]",
    "#continuations",
    ".sidebar",
    // 'ytd-watch-next-secondary-results-renderer'
  ];

  for (const selector of selectorsToHide) {
    const el = document.querySelector(selector);
    if (el) el.remove();
  }

  const blurTopSubscriptionsMenu = () => {
    const subLink = Array.from(
      document.querySelectorAll("ytd-guide-entry-renderer")
    ).find((el) => el.textContent?.trim().toLowerCase() === "subscriptions") as
      | HTMLElement
      | undefined;

    if (subLink) {
      subLink.style.filter = "blur(6px)";
      subLink.style.pointerEvents = "none";
      subLink.style.userSelect = "none";
      subLink.style.background = "transparent"; // Removes hover highlight
    }
  };

  const unblurTopSubscriptionsMenu = () => {
    const subLink = Array.from(
      document.querySelectorAll("ytd-guide-entry-renderer")
    ).find((el) => el.textContent?.trim().toLowerCase() === "subscriptions") as
      | HTMLElement
      | undefined;

    if (subLink) {
      subLink.style.filter = "none";
      subLink.style.pointerEvents = "auto";
      subLink.style.userSelect = "auto";
      subLink.style.background = ""; // Reset background
    }
  };

  const blurLeftIconSubscriptions = () => {
    const miniSub = Array.from(
      document.querySelectorAll("ytd-mini-guide-entry-renderer")
    ).find(
      (el) => el.getAttribute("aria-label")?.toLowerCase() === "subscriptions"
    ) as HTMLElement | undefined;

    if (miniSub) {
      miniSub.style.filter = "blur(6px)";
      miniSub.style.pointerEvents = "none";
      miniSub.style.userSelect = "none";
      miniSub.style.background = "transparent";
    } else {
      console.log("[DEBUG] Mini Subscriptions not found");
    }
  };

  const unblurLeftIconSubscriptions = () => {
    const miniSub = Array.from(
      document.querySelectorAll("ytd-mini-guide-entry-renderer")
    ).find(
      (el) => el.getAttribute("aria-label")?.toLowerCase() === "subscriptions"
    ) as HTMLElement | undefined;

    if (miniSub) {
      miniSub.style.filter = "";
      miniSub.style.pointerEvents = "";
      miniSub.style.userSelect = "";
      miniSub.style.background = "";
    }
  };

  const blurShortsMenu = () => {
    const shorts = Array.from(
      document.querySelectorAll("ytd-guide-entry-renderer")
    ).find((el) => el.textContent?.trim().toLowerCase() === "shorts") as
      | HTMLElement
      | undefined;

    if (shorts) {
      shorts.style.filter = "blur(6px)";
      shorts.style.pointerEvents = "none";
      shorts.style.userSelect = "none";
    }
  };
  const unblurShortsMenu = () => {
    const shorts = Array.from(
      document.querySelectorAll("ytd-guide-entry-renderer")
    ).find((el) => el.textContent?.trim().toLowerCase() === "shorts") as
      | HTMLElement
      | undefined;

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
    const shortsRoot = document.querySelector(
      "ytd-reel-video-renderer, #shorts-container, .reel-video-renderer"
    ) as HTMLElement | null;
    if (shortsRoot) {
      shortsRoot.style.filter = "blur(8px)";
      shortsRoot.style.pointerEvents = "none";
      shortsRoot.style.userSelect = "none";
    }
  };

  const unblurShortsPage = () => {
    const shortsRoot = document.querySelector(
      "ytd-reel-video-renderer, #shorts-container, .reel-video-renderer"
    ) as HTMLElement | null;
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

  const blurMiniSidebarShorts = () => {
    const miniShorts = Array.from(
      document.querySelectorAll("ytd-mini-guide-entry-renderer")
    ).find((el) =>
      el.getAttribute("aria-label")?.toLowerCase().includes("shorts")
    ) as HTMLElement | undefined;

    if (miniShorts) {
      miniShorts.style.filter = "blur(6px)";
      miniShorts.style.pointerEvents = "none";
      miniShorts.style.userSelect = "none";
      miniShorts.style.background = "transparent";
    }
  };

  const unblurMiniSidebarShorts = () => {
    const miniShorts = Array.from(
      document.querySelectorAll("ytd-mini-guide-entry-renderer")
    ).find((el) =>
      el.getAttribute("aria-label")?.toLowerCase().includes("shorts")
    ) as HTMLElement | undefined;

    if (miniShorts) {
      miniShorts.style.filter = "";
      miniShorts.style.pointerEvents = "";
      miniShorts.style.userSelect = "";
      miniShorts.style.background = "";
    }
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
    blurTopSubscriptionsMenu();
    blurLeftIconSubscriptions();
  };

  const blurChipsBar = () => {
    const chips = document.querySelector(
      "ytd-feed-filter-chip-bar-renderer"
    ) as HTMLElement | null;
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

    const chips = document.querySelector(
      "ytd-feed-filter-chip-bar-renderer"
    ) as HTMLElement | null;
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
    unblurTopSubscriptionsMenu();
    unblurLeftIconSubscriptions();
  };

  const applyBlurImmediately = () => {
    applyBlurToSections();
    blurChipsBar();
    blurShortsMenu();
    blurShortsShelf();
    if (isShortsPage()) {
      blurShortsPage();
    }
    blurMiniSidebarShorts();
    blurTopSubscriptionsMenu();
    blurLeftIconSubscriptions();
  };

  const sidebarObserver = new MutationObserver(() => {
    chrome.storage.local.get({ blurEnabled: true }, ({ blurEnabled }) => {
      if (blurEnabled) applyBlurToSections();
      else removeBlur(); // optional cleanup
    });
  });

  const chipsObserver = new MutationObserver(() => {
    chrome.storage.local.get({ blurEnabled: true }, ({ blurEnabled }) => {
      if (blurEnabled) blurChipsBar();
      else removeBlur(); // if such a function exists
    });
  });
  const shortsmenuObserver = new MutationObserver(() => {
    chrome.storage.local.get(
      { shortsBlurEnabled: true },
      ({ shortsBlurEnabled }) => {
        if (shortsBlurEnabled) blurShortsMenu();
        else unblurShortsMenu();
      }
    );
  });
  const subscriptionsMenuObserver = new MutationObserver(() => {
    if (isBlurEnabled) {
      blurTopSubscriptionsMenu();
    } else {
      unblurTopSubscriptionsMenu();
    }
  });

  const miniGuideObserver = new MutationObserver(() => {
    setTimeout(() => {
      if (isBlurEnabled) {
        blurLeftIconSubscriptions();
      } else {
        unblurLeftIconSubscriptions();
      }
    }, 100); // ⏱ small delay ensures the DOM element is ready
  });

  const shortspageObserver = new MutationObserver(() => {
    chrome.storage.local.get(
      { shortsBlurEnabled: true },
      ({ shortsBlurEnabled }) => {
        if (isShortsPage()) {
          if (shortsBlurEnabled) blurShortsPage();
          else unblurShortsPage();
        }
      }
    );
  });
  const shortsshelfObserver = new MutationObserver(() => {
    chrome.storage.local.get(
      { shortsBlurEnabled: true },
      ({ shortsBlurEnabled }) => {
        if (shortsBlurEnabled) blurShortsShelf();
        else unblurShortsShelf();
      }
    );
  });
  const shortsMiniSidebarObserver = new MutationObserver(() => {
    chrome.storage.local.get(
      { shortsBlurEnabled: true },
      ({ shortsBlurEnabled }) => {
        if (shortsBlurEnabled) blurMiniSidebarShorts();
        else unblurMiniSidebarShorts();
      }
    );
  });

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    const { type, payload } = message;

    if (type === "TOGGLE_BLUR") {
      isBlurEnabled = payload;
      chrome.storage.local.set({ blurEnabled: isBlurEnabled });

      if (isBlurEnabled) {
        applyBlurImmediately();
        sidebarObserver.observe(document.body, {
          childList: true,
          subtree: true,
        });
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
    shortsshelfObserver.observe(document.body, {
      childList: true,
      subtree: true,
    });
    shortspageObserver.observe(document.body, { childList: true, subtree: true });
    shortsMiniSidebarObserver.observe(document.body, {
    childList: true,
    subtree: true,
    });
    subscriptionsMenuObserver.observe(document.body, {
      childList: true,
      subtree: true,
    });
    miniGuideObserver.observe(document.body, { childList: true, subtree: true });
  });

  // Blur comments
  function applyCommentBlur() {
    if (document.getElementById(COMMENT_BLUR_ID)) return;
    const style = document.createElement("style");
    style.id = COMMENT_BLUR_ID;
    style.textContent = selectorsToHide
      .map(
        (sel) => `
        ${sel} {
          filter: blur(6px) !important;
          pointer-events: none !important;
          user-select: none !important;
        }
      `
      )
      .join("\n");
    document.head.appendChild(style);
  }

  function removeCommentBlur() {
    const style = document.getElementById(COMMENT_BLUR_ID);
    if (style) style.remove();
  }

  // on page load, read storage and blur if needed
  const commentsObserver = new MutationObserver(() => {
    chrome.storage.local.get("commentsHidden", ({ commentsHidden }) => {
      if (commentsHidden) applyCommentBlur();
    });
  });
  commentsObserver.observe(document.body, { childList: true, subtree: true });

  // listen for your popup toggle
  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg.action === "toggleComments") {
      chrome.storage.local.get(
        { commentsHidden: false },
        ({ commentsHidden }) => {
          const nowHidden = !commentsHidden;
          if (nowHidden) applyCommentBlur();
          else removeCommentBlur();
          chrome.storage.local.set({ commentsHidden: nowHidden }, () => {
            sendResponse({ status: nowHidden ? "hidden" : "shown" });
          });
        }
      );
      return true;
    }
  });

  function applyShortsToggle(shouldBlur: boolean) {
    if (shouldBlur) {
      blurShortsMenu();
      if (isShortsPage()) blurShortsPage();
      blurShortsShelf();
      blurMiniSidebarShorts();
    } else {
      unblurShortsMenu();
      if (isShortsPage()) unblurShortsPage();
      unblurShortsShelf();
      unblurMiniSidebarShorts();
    }
  }
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "TOGGLE_SHORTS_BLUR") {
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

        // Check if we're on the home page
        if (window.location.pathname === '/' || window.location.pathname === '/feed/subscriptions') {
          chrome.storage.local.get(['homePageBlurEnabled'], ({ homePageBlurEnabled }) => {
            if (homePageBlurEnabled) {
              // Apply home page specific blur
              const homePageElements = document.querySelectorAll('#contents, ytd-rich-grid-renderer');
              homePageElements.forEach(element => {
                if (element instanceof HTMLElement) {
                  element.style.filter = 'blur(10px)';
                  element.style.pointerEvents = 'none';
                  element.style.userSelect = 'none';
                }
              });
              
              // Also blur the chips bar on home page
              blurChipsBar();
            }
          });
        }

        if (isShortsPage() && isBlurEnabled) {
          blurShortsPage();
        }
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });
  };

  // Create a separate observer for dynamic content on home page
  const homePageContentObserver = new MutationObserver(() => {
    if (window.location.pathname === '/' || window.location.pathname === '/feed/subscriptions') {
      chrome.storage.local.get(['homePageBlurEnabled'], ({ homePageBlurEnabled }) => {
        if (homePageBlurEnabled) {
          const homePageElements = document.querySelectorAll('#contents, ytd-rich-grid-renderer');
          homePageElements.forEach(element => {
            if (element instanceof HTMLElement && !element.style.filter) {
              element.style.filter = 'blur(10px)';
              element.style.pointerEvents = 'none';
              element.style.userSelect = 'none';
            }
          });
        }
      });
    }
  });

  // Start observing home page content changes
  homePageContentObserver.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
  });

  // Add this to your existing chrome.runtime.onMessage listener
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "TOGGLE_HOME_PAGE_BLUR") {
      const shouldBlur = message.payload;
      if (window.location.pathname === '/' || window.location.pathname === '/feed/subscriptions') {
        const homePageElements = document.querySelectorAll('#contents, ytd-rich-grid-renderer');
        homePageElements.forEach(element => {
          if (element instanceof HTMLElement) {
            element.style.filter = shouldBlur ? 'blur(10px)' : 'none';
            element.style.pointerEvents = shouldBlur ? 'none' : 'auto';
            element.style.userSelect = shouldBlur ? 'none' : 'auto';
          }
        });
        
        if (shouldBlur) {
          blurChipsBar();
        } else {
          const chips = document.querySelector('ytd-feed-filter-chip-bar-renderer') as HTMLElement | null;
          if (chips) {
            chips.style.filter = '';
            chips.style.pointerEvents = '';
            chips.style.userSelect = '';
          }
        }
      }
    }
  });

  // -------------------------
  // ----- HomePage Blur -----
  // -------------------------
  let isHomePageBlurEnabled = true;

  const blurRecommendedVideos = () => {
    // Target home page video grid
    const homeVideoGrid = document.querySelector('ytd-rich-grid-renderer #contents.ytd-rich-grid-renderer') as HTMLElement | null;
    const homeVideoItems = document.querySelectorAll('ytd-rich-item-renderer') as NodeListOf<HTMLElement>;
    
    // Target video page recommendations (right sidebar)
    const videoPageRecommendations = document.querySelector('ytd-watch-next-secondary-results-renderer') as HTMLElement | null;
    const recommendedVideoItems = document.querySelectorAll('ytd-compact-video-renderer, ytd-compact-radio-renderer') as NodeListOf<HTMLElement>;
    
    // Target related videos below the current video
    const relatedVideos = document.querySelector('#related') as HTMLElement | null;
    const belowVideoItems = document.querySelectorAll('ytd-watch-next-secondary-results-renderer ytd-item-section-renderer') as NodeListOf<HTMLElement>;
    
    // Target videos after Shorts section
    const shortsSection = document.querySelector('ytd-reel-shelf-renderer') as HTMLElement | null;
    const afterShortsVideos = document.querySelectorAll('ytd-rich-section-renderer, ytd-shelf-renderer') as NodeListOf<HTMLElement>;
    const videoShelves = document.querySelectorAll('ytd-video-renderer, ytd-rich-item-renderer') as NodeListOf<HTMLElement>;
    
    // Target right side recommended videos in video page
    const rightSideVideos = document.querySelectorAll('ytd-watch-next-secondary-results-renderer ytd-compact-video-renderer, ytd-watch-next-secondary-results-renderer ytd-compact-playlist-renderer') as NodeListOf<HTMLElement>;
    const rightSideContainer = document.querySelector('ytd-watch-next-secondary-results-renderer #items') as HTMLElement | null;
    
    // Blur home page videos if they exist
    if (homeVideoGrid) {
      homeVideoGrid.style.filter = "blur(25px)";
      homeVideoGrid.style.opacity = "0.8";
      
      homeVideoItems.forEach(item => {
        item.style.pointerEvents = "none";
        item.style.userSelect = "none";
      });
    }

    // Blur video page recommendations if they exist
    if (videoPageRecommendations) {
      videoPageRecommendations.style.filter = "blur(25px)";
      videoPageRecommendations.style.opacity = "0.8";
      
      recommendedVideoItems.forEach(item => {
        item.style.pointerEvents = "none";
        item.style.userSelect = "none";
      });
    }

    // Blur related videos below current video
    if (relatedVideos) {
      relatedVideos.style.filter = "blur(25px)";
      relatedVideos.style.opacity = "0.8";
      
      belowVideoItems.forEach(item => {
        item.style.pointerEvents = "none";
        item.style.userSelect = "none";
      });
    }

    // Blur videos that appear after Shorts
    if (shortsSection) {
      // Find and blur all video sections after Shorts
      afterShortsVideos.forEach(section => {
        if (section.compareDocumentPosition(shortsSection) === Node.DOCUMENT_POSITION_PRECEDING) {
          section.style.filter = "blur(25px)";
          section.style.opacity = "0.8";
          section.style.pointerEvents = "none";
          section.style.userSelect = "none";
        }
      });

      // Blur individual video items
      videoShelves.forEach(video => {
        if (video.compareDocumentPosition(shortsSection) === Node.DOCUMENT_POSITION_PRECEDING) {
          video.style.filter = "blur(25px)";
          video.style.opacity = "0.8";
          video.style.pointerEvents = "none";
          video.style.userSelect = "none";
        }
      });
    }

    // Blur right side recommended videos
    if (rightSideContainer) {
      rightSideContainer.style.filter = "blur(25px)";
      rightSideContainer.style.opacity = "0.8";
      
      rightSideVideos.forEach(video => {
        video.style.pointerEvents = "none";
        video.style.userSelect = "none";
        // Add additional styles to ensure thumbnails are blurred
        const thumbnail = video.querySelector('ytd-thumbnail') as HTMLElement;
        if (thumbnail) {
          thumbnail.style.filter = "blur(25px)";
          thumbnail.style.opacity = "0.8";
        }
      });
    }
  };

  const removeRecommendedBlur = () => {
    // Clear home page blur
    const homeVideoGrid = document.querySelector('ytd-rich-grid-renderer #contents.ytd-rich-grid-renderer') as HTMLElement | null;
    const homeVideoItems = document.querySelectorAll('ytd-rich-item-renderer') as NodeListOf<HTMLElement>;
    
    // Clear video page recommendations blur
    const videoPageRecommendations = document.querySelector('ytd-watch-next-secondary-results-renderer') as HTMLElement | null;
    const recommendedVideoItems = document.querySelectorAll('ytd-compact-video-renderer, ytd-compact-radio-renderer') as NodeListOf<HTMLElement>;
    
    // Clear related videos blur
    const relatedVideos = document.querySelector('#related') as HTMLElement | null;
    const belowVideoItems = document.querySelectorAll('ytd-watch-next-secondary-results-renderer ytd-item-section-renderer') as NodeListOf<HTMLElement>;
    
    // Clear blur from videos after Shorts
    const afterShortsVideos = document.querySelectorAll('ytd-rich-section-renderer, ytd-shelf-renderer') as NodeListOf<HTMLElement>;
    const videoShelves = document.querySelectorAll('ytd-video-renderer, ytd-rich-item-renderer') as NodeListOf<HTMLElement>;
    
    // Clear right side recommended videos blur
    const rightSideVideos = document.querySelectorAll('ytd-watch-next-secondary-results-renderer ytd-compact-video-renderer, ytd-watch-next-secondary-results-renderer ytd-compact-playlist-renderer') as NodeListOf<HTMLElement>;
    const rightSideContainer = document.querySelector('ytd-watch-next-secondary-results-renderer #items') as HTMLElement | null;
    
    if (homeVideoGrid) {
      homeVideoGrid.style.filter = "";
      homeVideoGrid.style.opacity = "";
      
      homeVideoItems.forEach(item => {
        item.style.pointerEvents = "";
        item.style.userSelect = "";
      });
    }

    if (videoPageRecommendations) {
      videoPageRecommendations.style.filter = "";
      videoPageRecommendations.style.opacity = "";
      
      recommendedVideoItems.forEach(item => {
        item.style.pointerEvents = "";
        item.style.userSelect = "";
      });
    }

    if (relatedVideos) {
      relatedVideos.style.filter = "";
      relatedVideos.style.opacity = "";
      
      belowVideoItems.forEach(item => {
        item.style.pointerEvents = "";
        item.style.userSelect = "";
      });
    }

    afterShortsVideos.forEach(section => {
      section.style.filter = "";
      section.style.opacity = "";
      section.style.pointerEvents = "";
      section.style.userSelect = "";
    });

    videoShelves.forEach(video => {
      video.style.filter = "";
      video.style.opacity = "";
      video.style.pointerEvents = "";
      video.style.userSelect = "";
    });

    if (rightSideContainer) {
      rightSideContainer.style.filter = "";
      rightSideContainer.style.opacity = "";
      
      rightSideVideos.forEach(video => {
        video.style.pointerEvents = "";
        video.style.userSelect = "";
        // Clear thumbnail blur
        const thumbnail = video.querySelector('ytd-thumbnail') as HTMLElement;
        if (thumbnail) {
          thumbnail.style.filter = "";
          thumbnail.style.opacity = "";
        }
      });
    }
  };

  // Update the observer to be more specific
  const recommendationsObserver = new MutationObserver((mutations) => {
    if (isHomePageBlurEnabled) {
      // Check if the mutation includes video content
      const hasVideoContent = mutations.some(mutation => {
        const target = mutation.target as Element;
        return target && target.querySelector?.(
          'ytd-rich-section-renderer, ytd-shelf-renderer, ytd-video-renderer, ytd-rich-item-renderer'
        );
      });

      if (hasVideoContent) {
        blurRecommendedVideos();
      }
    }
  });

  // Message handler setup
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    const { type, payload } = message;

    if (type === "TOGGLE_HOME_PAGE_BLUR") {
      isHomePageBlurEnabled = payload;
      chrome.storage.local.set({ homePageBlurEnabled: isHomePageBlurEnabled });

      if (isHomePageBlurEnabled) {
        blurRecommendedVideos();
        recommendationsObserver.observe(document.body, { 
          childList: true, 
          subtree: true,
          attributes: true 
        });
      } else {
        removeRecommendedBlur();
        recommendationsObserver.disconnect();
      }
    }
  });

  // Initialize on page load
  chrome.storage.local.get({ homePageBlurEnabled: true }, ({ homePageBlurEnabled }) => {
    isHomePageBlurEnabled = homePageBlurEnabled;
    
    if (homePageBlurEnabled) {
      blurRecommendedVideos();
      recommendationsObserver.observe(document.body, { 
        childList: true, 
        subtree: true,
        attributes: true 
      });
    }
  });

})();