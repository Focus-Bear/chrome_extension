(async () => {
  const containerId = "focus-wikipedia-link-popup";

  // Load user setting from storage
  const { wikipediaLinkPopupEnabled } = await chrome.storage.local.get({
    wikipediaLinkPopupEnabled: true,
  });

  let enabled = wikipediaLinkPopupEnabled;

  // Listen for toggle messages from popup
  chrome.runtime.onMessage.addListener((msg, _s, sendResponse) => {
    if (msg.type === "TOGGLE_WIKI_LINK_POPUP") {
      enabled = !!msg.payload;
      sendResponse({ ok: true });
    }
  });

  // Inject CSS for popup
  function injectIntentionPopupCSS() {
    if (document.getElementById("intentionPopup-css")) return;
    const style = document.createElement("style");
    style.id = "intentionPopup-css";
    style.textContent = `
      .focus-popup {
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background-color: rgba(255, 255, 255, 0.85);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 9999;
        backdrop-filter: blur(4px);
      }

      .focus-popup-box {
        position: relative;
        padding: 30px;
        border-radius: 50px;
        background-color: #FFE4C6;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
        text-align: center;
        max-width: 400px;
        width: 100%;
      }
      .focus-popup h2 {
        font-size: 2rem;
        margin-bottom: 24px;
        color: #663300;
      }
      .focus-popup-logo {
        position: absolute;
        top: 24px;
        left: 24px;
        width: 32px;
        height: auto;
        z-index: 1;
      }
      .focus-popup-button-container {
        display: flex;
        justify-content: center;
        gap: 12px;
        margin-top: 16px;
      }
      .focus-popup-button-container button {
        padding: 8px 20px;
        border-radius: 20px;
        border: none;
        background: #FFB86B;
        color: #222;
        font-weight: bold;
        cursor: pointer;
        transition: background 0.2s;
      }
      .focus-popup-button-container button:hover {
        background: #ffd8a6;
      }
    `;
    document.head.appendChild(style);
  }

  function createPopup(url, onClose, onContinue) {
    injectIntentionPopupCSS();

    // Get extension image URL
    const logoUrl = chrome.runtime.getURL("icons/bearLogo.png");

    // Overlay
    const overlay = document.createElement("div");
    overlay.className = "focus-popup-overlay";
    overlay.onclick = onClose;

    // Popup
    const popup = document.createElement("div");
    popup.className = "focus-popup";
    popup.innerHTML = `
      <div class="focus-popup-box">
        <img src="${logoUrl}" alt="Focus Mode Icon" class="focus-popup-logo" />
        <h2>Are you staying on topic?</h2>
        <p>Do you want to continue to this page?</p>
        <p>${url}</p>
        <div class="focus-popup-button-container">
          <button id="link-continue">Continue</button>
          <button id="link-cancel">Cancel</button>
        </div>
      </div>
    `;

    const container = document.createElement("div");
    container.id = containerId;
    container.appendChild(overlay);
    container.appendChild(popup);

    // Button handlers
    popup.querySelector("#link-continue").onclick = function (e) {
      e.stopPropagation();
      onContinue();
    };
    popup.querySelector("#link-cancel").onclick = function (e) {
      e.stopPropagation();
      onClose();
    };

    return container;
  }

  // Click listener for Wikipedia links
  document.addEventListener("click", function (e) {
    if (!enabled) return; // Check if link popup is enabled
    const link = e.target.closest("a[href^='/wiki/']");
    if (!link) return;

    e.preventDefault();

    // Remove any existing popup
    const existing = document.getElementById(containerId);
    if (existing) existing.remove();

    const popup = createPopup(
      link.href,
      function cleanup() {
        popup.remove();
      },
      function continueNav() {
        popup.remove();
        window.location.href = link.href;
      }
    );

    document.body.appendChild(popup);
  });
})();
