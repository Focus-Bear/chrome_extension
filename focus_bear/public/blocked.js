(function () {
  // Show the blocked domain (passed in via the `?d=` query param) inside the chip.
  const params = new URLSearchParams(window.location.search);
  const domain = params.get("d") || "";
  const domainEl = document.getElementById("domain");
  if (domainEl) domainEl.textContent = domain;

  // Back button should go back to the previous page if there is one, otherwise it should close the tab or window.
  const backBtn = document.getElementById("back");
  if (backBtn) {
    backBtn.addEventListener("click", () => {
      if (window.history.length > 1) {
        window.history.back();
        return;
      }
      try {
        chrome.tabs.getCurrent((tab) => {
          if (tab && typeof tab.id === "number") {
            chrome.tabs.remove(tab.id);
          } else {
            window.close();
          }
        });
      } catch {
        window.close();
      }
    });
  }
})();
