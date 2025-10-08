// Define message interface safely
interface BlurToggleMessage {
  type: string;
  payload?: unknown;
}

// Immediately invoked function expression (IIFE)
(() => {
  console.log("Gmail blur script injected at", location.href);

  const GMAIL_BLUR_STYLE_ID = "focus-bear-gmail-blur-style";
  //Declaring blur style 
  const GMAIL_PROMO_STYLE_ID = "focus-bear-gmail-promo-style";
  let originalTitle = document.title;

  

  //  Blur Tab Title 
  const blurTitle = (): void => {
    originalTitle = document.title;
    document.title = document.title.replace(/\(\d+\)/, "(••)");
  };

  const restoreTitle = (): void => {
    document.title = originalTitle;
  };

  //  Blur Sidebar Unread Counts 
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

  const removePromotionBlur = (): void => {
  document.getElementById(GMAIL_PROMO_STYLE_ID)?.remove();
};


  // this line of code should blur the promotions tab 
 //  Blur Promotions tab (top category chip)
const applyPromotionBlur = (): void => {
  if (document.getElementById(GMAIL_PROMO_STYLE_ID)) return;

  const style = document.createElement("style");
  style.id = GMAIL_PROMO_STYLE_ID;
  style.textContent = `
    /* Top category chip for Promotions (and everything inside it) */
    [role="tab"][aria-label*="Promotions"],
    [role="tab"][aria-label*="Promotions"] *,

    /* Fallbacks: links that navigate to Promotions */
    a[href*="#category/promotions"],
    a[aria-label*="Promotions"],
    a[title*="Promotions"] {
      filter: blur(6px) !important;
      pointer-events: none !important;
      user-select: none !important;
    }
  `;
  document.head.appendChild(style);
};

  // Debounce Helper 
  const debounce = <T extends (...args: any[]) => void>(
    fn: T,
    delay = 100
  ): (() => void) => {
    let timer: number;
    return () => {
      clearTimeout(timer);
      timer = window.setTimeout(fn, delay);
    };
  };

  // Mutation Observer 
  const observer = new MutationObserver(
    debounce(() => {
chrome.storage.local.get(
  { gmailBlurEnabled: true, promotionBlurEnabled: true },
  (res: { gmailBlurEnabled: boolean; promotionBlurEnabled: boolean }) => {
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
  }
);
    }, 150)
  );

  observer.observe(document.body, { childList: true, subtree: true });

  // Listen for toggle from popup 
  chrome.runtime.onMessage.addListener(
    (
      message: BlurToggleMessage,
      _sender,
      _sendResponse
    ): void => {
      if (message.type === "TOGGLE_GMAIL_BLUR") {
        const shouldBlur = Boolean(message.payload);
        chrome.storage.local.set({ gmailBlurEnabled: shouldBlur });
        if (shouldBlur) {
          blurTitle();
          applySidebarBlur();
          applyPromotionBlur();
        } else {
          removeSidebarBlur();
          removePromotionBlur(); 
        }
        
      }
      else if (message.type === "TOGGLE_PROMOTION_BLUR") {
        const shouldBlur = Boolean(message.payload);
        chrome.storage.local.set({ promotionBlurEnabled: shouldBlur });
      if (shouldBlur) {
        applyPromotionBlur();
    } else {
        removePromotionBlur();
  }
}

    }
  );

  // On load 
chrome.storage.local.get(
  { gmailBlurEnabled: true, promotionBlurEnabled: true },
  (res: { gmailBlurEnabled: boolean; promotionBlurEnabled: boolean }) => {
    if (res.gmailBlurEnabled) {
      blurTitle();
      applySidebarBlur();
    }
    if (res.promotionBlurEnabled) {
      applyPromotionBlur();
    }
  }
);


})();
