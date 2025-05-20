chrome.runtime.onInstalled.addListener(() => {
    console.log('Extension installed')
})

// Enable blur features by default 
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({
    blurEnabled: true,
    commentsHidden: true,
    homePageBlurEnabled: true,
  });
});