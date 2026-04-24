type ActiveHours = { start: number; end: number };
let temporaryUnblurUntil: number | null = null;
let popupShownThisSession = false;

function applyGlobalBlur(showPopup: boolean = true) {
  Array.from(document.body.children).forEach((child) => {
    if (child.id !== "intention-popup") {
      (child as HTMLElement).style.filter = "blur(8px)";
      (child as HTMLElement).style.pointerEvents = "none";
    }
  });
  document.body.style.overflow = "hidden";

  if (showPopup && !popupShownThisSession) {
    showBlocklistPopup();
    popupShownThisSession = true;
  }
}

function removeGlobalBlur() {
  Array.from(document.body.children).forEach((child) => {
    (child as HTMLElement).style.filter = "";
    (child as HTMLElement).style.pointerEvents = "";
  });
  document.body.style.overflow = "";
  removeBlocklistPopup();
}

async function checkBlocklist(blocklist: string[], relaxlist: string[], hours: ActiveHours) {
  const domain = window.location.hostname;
  const now = new Date();
  const currentHour = now.getHours();

  const inActiveHours =
    hours.start <= hours.end
      ? currentHour >= hours.start && currentHour < hours.end
      : currentHour >= hours.start || currentHour < hours.end;

  const isBlocked = blocklist.some((site) => domain.includes(site));
  const isRelaxed = relaxlist.some((site) => domain.includes(site));

  const { focusSessionState } = await chrome.storage.local.get("focusSessionState");
  const onBreak = focusSessionState?.onBreak === true;

  // If on relaxlist, don't blur during Focus Session breaks
  if (isRelaxed && onBreak) {
    removeGlobalBlur();
    return;
  }

  // still inside a temporary unblur period?
  if (temporaryUnblurUntil && Date.now() < temporaryUnblurUntil) {
    return; // keep unblurred
  }

  if (inActiveHours && isBlocked) {
    // first blur: show popup
    applyGlobalBlur(true);
  } else {
    removeGlobalBlur();
  }
}

function runCheck() {
  chrome.storage.local.get(
    ["blocklist", "relaxlist", "activeHours"],
    (data: { blocklist?: string[]; relaxlist?: string[]; activeHours?: ActiveHours }) => {
      checkBlocklist(
        data.blocklist || [],
        data.relaxlist || [],
        data.activeHours || { start: 0, end: 24 },
      );
    },
  );
}

// run once
runCheck();

// listen for Focus Session timer changes
chrome.storage.onChanged.addListener(async (changes, areaName) => {
  if (areaName !== "local") return;

  let shouldRerun = false;

  // Rerun if Focus Session state changes
  if (changes.focusSessionState) shouldRerun = true;

  // Also rerun if blocklist, relaxlist, or activeHours change
  if (changes.blocklist || changes.relaxlist || changes.activeHours) shouldRerun = true;

  if (shouldRerun) {
    const { blocklist, relaxlist, activeHours } = await chrome.storage.local.get([
      "blocklist",
      "relaxlist",
      "activeHours",
    ]);

    // Run the check and instantly update blur/unblur
    await checkBlocklist(blocklist || [], relaxlist || [], activeHours || { start: 0, end: 24 });
  }
});

// listen for changes
chrome.storage.onChanged.addListener(() => runCheck());

// Blocklist Popup
function showBlocklistPopup() {
  if (document.getElementById("blocklist-popup")) return;

  const overlay = document.createElement("div");
  overlay.id = "blocklist-popup";
  overlay.style.position = "fixed";
  overlay.style.top = "0";
  overlay.style.left = "0";
  overlay.style.width = "100vw";
  overlay.style.height = "100vh";
  overlay.style.background = "rgba(255, 255, 255, 0.6)";
  overlay.style.display = "flex";
  overlay.style.flexDirection = "column";
  overlay.style.alignItems = "center";
  overlay.style.justifyContent = "center";
  overlay.style.zIndex = "999999";
  overlay.style.fontFamily = "sans-serif";
  overlay.style.textAlign = "center";

  overlay.innerHTML = `
    <div style="background: #ffffffff; padding: 20px; border-radius: 12px; max-width: 320px;">
      <h2>Do you really want to use this site?</h2>
      <p>Choose how long to unblur:</p>
      <div style="margin-top: 10px;">
        <button data-time="30">30s</button>
        <button data-time="60">1m</button>
        <button data-time="120">2m</button>
        <button data-time="cancel">Cancel</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  overlay.querySelectorAll("button").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const target = e.target as HTMLButtonElement;
      const time = target.getAttribute("data-time");

      if (time === "cancel") {
        removeBlocklistPopup(); // keep blurred
        return;
      }

      const seconds = parseInt(time || "0", 10);
      allowTemporaryAccess(seconds);
    });
  });
}

function removeBlocklistPopup() {
  const overlay = document.getElementById("blocklist-popup");
  if (overlay) overlay.remove();
}

function allowTemporaryAccess(seconds: number) {
  const expiry = Date.now() + seconds * 1000;
  temporaryUnblurUntil = expiry;
  removeGlobalBlur(); // unblur

  setTimeout(() => {
    runCheck(); // when timer ends, check again
  }, seconds * 1000);
}
