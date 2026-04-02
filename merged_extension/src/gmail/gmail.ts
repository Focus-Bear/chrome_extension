// Define message interface safely
interface BlurToggleMessage {
  type: string;
  payload?: unknown;
}

// Immediately invoked function expression (IIFE)
(() => {
  console.log("Gmail blur script injected at", location.href);

  const GMAIL_BLUR_STYLE_ID = "focus-bear-gmail-blur-style";
  const GMAIL_PROMO_STYLE_ID = "focus-bear-gmail-promo-style";
  const GMAIL_SOCIAL_STYLE_ID = "focus-bear-gmail-social-style";
  let originalTitle = document.title;

  // HELPER: Detect which Gmail tab (Primary/Social/Updates/etc)
  const getCurrentGmailCategory = (): string | null => {
    const activeTab = document.querySelector('[role="tab"][aria-selected="true"]');
    if (!activeTab) return null;

    const label = activeTab.getAttribute("aria-label")?.toLowerCase() || "";
    if (label.includes("social")) return "social";
    if (label.includes("updates")) return "updates";
    if (label.includes("promotions")) return "promotions";
    if (label.includes("primary")) return "primary";
    return null;
  };

  // Title + Sidebar Blur
  const blurTitle = (): void => {
    originalTitle = document.title;
    document.title = document.title.replace(/\(\d+\)/, "(••)");
  };

  const restoreTitle = (): void => {
    document.title = originalTitle;
  };

  const applySidebarBlur = (): void => {
    if (document.getElementById(GMAIL_BLUR_STYLE_ID)) return;

    const style = document.createElement("style");
    style.id = GMAIL_BLUR_STYLE_ID;
    style.textContent = `
      .bsU, .bsO,
      .XU.aH8[jsname="DW2nlb"] {
        filter: blur(6px) !important;
        pointer-events: none !important;
        user-select: none !important;
      }
    `;
    document.head.appendChild(style);
  };

  const removeSidebarBlur = (): void => {
    document.getElementById(GMAIL_BLUR_STYLE_ID)?.remove();
    restoreTitle();
  };

  // Promotions Blur
  const applyPromotionBlur = (): void => {
    if (document.getElementById(GMAIL_PROMO_STYLE_ID)) return;

    const style = document.createElement("style");
    style.id = GMAIL_PROMO_STYLE_ID;
    style.textContent = `
      [role="tab"][aria-label*="Promotions" i],
      [role="tab"][aria-label*="Promotions" i] *,
      a[href*="#category/promotions" i],
      a[aria-label*="Promotions" i],
      a[title*="Promotions" i] {
        filter: blur(6px) !important;
        pointer-events: none !important;
        user-select: none !important;
      }
    `;
    document.head.appendChild(style);
  };

  const removePromotionBlur = (): void => {
    document.getElementById(GMAIL_PROMO_STYLE_ID)?.remove();
  };

  // Social/Updates Blur
  let socialObserver: MutationObserver | null = null;
  let socialFallbackInterval: number | null = null;

  const removeSocialBlur = (): void => {
    document.getElementById(GMAIL_SOCIAL_STYLE_ID)?.remove();

    document.querySelectorAll(".focusbear-social-blurred").forEach((el) => {
      const e = el as HTMLElement;
      e.style.filter = "";
      e.style.pointerEvents = "";
      e.style.userSelect = "";
      e.classList.remove("focusbear-social-blurred");
    });

    if (socialObserver) {
      socialObserver.disconnect();
      socialObserver = null;
    }
    if (socialFallbackInterval) {
      clearInterval(socialFallbackInterval);
      socialFallbackInterval = null;
    }
  };

  const applySocialBlur = (): void => {
    // Check current Gmail category
    const currentTab = getCurrentGmailCategory();
    if (currentTab !== "social" && currentTab !== "updates") {
      removeSocialBlur();
      return;
    }

    if (!document.getElementById(GMAIL_SOCIAL_STYLE_ID)) {
      const style = document.createElement("style");
      style.id = GMAIL_SOCIAL_STYLE_ID;
      style.textContent = `
        .focusbear-social-blurred {
          transition: filter 0.2s ease !important;
        }
      `;
      document.head.appendChild(style);
    }

    const findSocialContainer = (): HTMLElement | null => {
      let panel = document.querySelector(
        '[role="tabpanel"][aria-label*="Social" i]',
      ) as HTMLElement | null;
      if (panel) return panel;
      return document.querySelector('div[role="main"]') as HTMLElement | null;
    };

    const rowIsLinkedIn = (row: Element): boolean => {
      const rowEl = row as HTMLElement;
      const senderSelectors = [".yP", ".zF", ".yW .yP", ".yX .yP", ".bq4 .yP"];
      for (const sel of senderSelectors) {
        const s = row.querySelector(sel);
        if (s && s.textContent) {
          const t = s.textContent.trim().toLowerCase();
          if (t.includes("linkedin") || t.includes("linkedin.com")) return true;
        }
      }
      const emailAttrEl = row.querySelector("[email]");
      if (emailAttrEl) {
        const v = (emailAttrEl.getAttribute("email") || "").toLowerCase();
        if (v.includes("linkedin.com") || v.includes("linkedin")) return true;
      }
      const bigText = (rowEl.innerText || rowEl.textContent || "").toLowerCase();
      return bigText.includes("linkedin.com") || bigText.includes("linkedin");
    };

    const blurNonLinkedInEmails = (): void => {
      const container = findSocialContainer();
      if (!container) return;
      const rows = Array.from(container.querySelectorAll(".zA"));
      rows.forEach((row) => {
        const el = row as HTMLElement;
        const rect = el.getBoundingClientRect();
        if (rect.width === 0 && rect.height === 0) return;

        const isLinkedIn = rowIsLinkedIn(row);
        if (!isLinkedIn) {
          el.style.filter = "blur(6px)";
          el.style.pointerEvents = "none";
          el.style.userSelect = "none";
          el.classList.add("focusbear-social-blurred");
        } else {
          el.style.filter = "none";
          el.style.pointerEvents = "auto";
          el.style.userSelect = "auto";
          el.classList.remove("focusbear-social-blurred");
        }
      });
    };

    blurNonLinkedInEmails();

    const container = findSocialContainer();
    if (container) {
      if (socialObserver) {
        socialObserver.disconnect();
        socialObserver = null;
      }

      socialObserver = new MutationObserver(() => {
        setTimeout(() => {
          try {
            blurNonLinkedInEmails();
          } catch {}
        }, 50);
      });
      socialObserver.observe(container, { childList: true, subtree: true });
    }

    if (socialFallbackInterval) clearInterval(socialFallbackInterval);
    socialFallbackInterval = window.setInterval(() => {
      try {
        blurNonLinkedInEmails();
      } catch {}
    }, 1000);
  };

  // Debounce + Observer
  const debounce = <T extends (...args: any[]) => void>(fn: T, delay = 100): (() => void) => {
    let timer: number;
    return () => {
      clearTimeout(timer);
      timer = window.setTimeout(fn, delay);
    };
  };

  const observer = new MutationObserver(
    debounce(() => {
      chrome.storage.local.get(
        { gmailBlurEnabled: true, promotionBlurEnabled: true, socialBlurEnabled: true },
        (res) => {
          if (res.gmailBlurEnabled) {
            blurTitle();
            applySidebarBlur();
          } else {
            removeSidebarBlur();
          }

          if (res.promotionBlurEnabled) {
            applyPromotionBlur();
          } else {
            removePromotionBlur();
          }

          const currentTab = getCurrentGmailCategory();
          if (res.socialBlurEnabled && (currentTab === "social" || currentTab === "updates")) {
            applySocialBlur();
          } else {
            removeSocialBlur();
          }
        },
      );
    }, 150),
  );

  observer.observe(document.body, { childList: true, subtree: true });

  // Reapply on tab click
  document.addEventListener("click", (e) => {
    const target = e.target as HTMLElement;
    if (target.closest('[role="tab"]')) {
      setTimeout(() => {
        const currentTab = getCurrentGmailCategory();
        chrome.storage.local.get({ socialBlurEnabled: true }, (res) => {
          if (res.socialBlurEnabled && (currentTab === "social" || currentTab === "updates")) {
            applySocialBlur();
          } else {
            removeSocialBlur();
          }
        });
      }, 500);
    }
  });

  // Chrome Message Listener
  chrome.runtime.onMessage.addListener((message: BlurToggleMessage) => {
    if (message.type === "TOGGLE_GMAIL_BLUR") {
      const shouldBlur = Boolean(message.payload);
      chrome.storage.local.set({ gmailBlurEnabled: shouldBlur });
      if (shouldBlur) {
        blurTitle();
        applySidebarBlur();
      } else {
        removeSidebarBlur();
      }
    } else if (message.type === "TOGGLE_PROMOTION_BLUR") {
      const shouldBlur = Boolean(message.payload);
      chrome.storage.local.set({ promotionBlurEnabled: shouldBlur });
      if (shouldBlur) {
        applyPromotionBlur();
      } else {
        removePromotionBlur();
      }
    } else if (message.type === "TOGGLE_SOCIAL_BLUR") {
      const shouldBlur = Boolean(message.payload);
      chrome.storage.local.set({ socialBlurEnabled: shouldBlur });
      const currentTab = getCurrentGmailCategory();
      if (shouldBlur && (currentTab === "social" || currentTab === "updates")) {
        applySocialBlur();
      } else {
        removeSocialBlur();
      }
    }
  });

  // On Initial Load
  chrome.storage.local.get(
    { gmailBlurEnabled: true, promotionBlurEnabled: true, socialBlurEnabled: true },
    (res) => {
      if (res.gmailBlurEnabled) {
        blurTitle();
        applySidebarBlur();
      }
      if (res.promotionBlurEnabled) {
        applyPromotionBlur();
      }
      const currentTab = getCurrentGmailCategory();
      if (res.socialBlurEnabled && (currentTab === "social" || currentTab === "updates")) {
        applySocialBlur();
      }
    },
  );
})();
