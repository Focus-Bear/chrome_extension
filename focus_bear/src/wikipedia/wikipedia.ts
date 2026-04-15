(() => {
  console.log("Wikipedia blur script injected at", location.href);

  const BlurSection =
    "filter:blur(8px)!important; pointer-events:none!important; user-select:none!important;";

  // Blur Main Page Articles
  const toggleMainPage = (on: boolean) => {
    document
      .querySelectorAll<HTMLElement>(
        "div#bodyContent.vector-body.ve-init-mw-desktopArticleTarget-targetContainer",
      )
      .forEach((sec) => {
        if (
          /From today's featured article/i.test(sec.innerText) ||
          /Current events/i.test(sec.innerText)
        ) {
          sec.style.cssText = on ? BlurSection : "";
        }
      });
  };

  // Stored setting on load
  chrome.storage.local.get({ wikipediaMainBlur: true }, ({ wikipediaMainBlur }) => {
    toggleMainPage(wikipediaMainBlur);
  });

  // Listen for settings toggle
  chrome.runtime.onMessage.addListener((msg, _s, sendResponse) => {
    if (msg.type === "TOGGLE_WIKIPEDIA_MAIN") {
      toggleMainPage(!!msg.payload);
      sendResponse({ ok: true });
    }
  });
})();
