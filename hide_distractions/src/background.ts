// background.ts

/**
 * Fires on a real install or version-upgrade.
 * (only when you first load or bump the version field in manifest.json)
 */
chrome.runtime.onInstalled.addListener((details) => {
  console.log("🔄 onInstalled:", details.reason);
  resetDefaults();
});

/**
 * Fires whenever the service worker comes alive,
 * including when you hit “Reload” in chrome://extensions.
 */
chrome.runtime.onStartup.addListener(() => {
  console.log("🔄 onStartup");
  resetDefaults();
});

/**
 * Bring _all_ your flags back to true (or your chosen defaults).
 */
function resetDefaults() {
  chrome.storage.local.set({
    showIntentionPopup:     true,   // ← the magic “first-run” gate
    blurEnabled:            true,
    commentsHidden:         true,
    homePageBlurEnabled:    true,
    shortsBlurEnabled:      true,
  }, () => console.log("✅ Defaults reset on install/startup"));
}
