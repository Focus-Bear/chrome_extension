(function () {
  const containerId = "focus-wikipedia-link-popup";

  // Inject intentionPopup CSS if not already present
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
        width: 64px;
        height: 64px;
        margin-bottom: 16px;
      }
      .focus-popup-button-container {
        display: flex;
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

    // Overlay
    const overlay = document.createElement("div");
    overlay.className = "focus-popup-overlay";
    overlay.onclick = onClose;

    // Popup
    const popup = document.createElement("div");
    popup.className = "focus-popup";
    popup.innerHTML = `
      <div class="focus-popup-box">
        <img src="../public/icons/bearLogo.png" alt="Focus Mode Icon" class="focus-popup-logo" />
        <h2>Are you staying on topic?</h2>
        <p>Do you want to continue to this page?</p>
        <p>${url}</p>
        <div class="focus-popup-button-container">
          <button id="link-continue">Continue</button>
          <button id="link-cancel">Cancel</button>
        </div>
      </div>
    `;

    // Container
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

  document.addEventListener("click", function (e) {
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