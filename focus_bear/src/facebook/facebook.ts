const domain = window.location.hostname;
if (domain.includes("facebook.com")) {
  const BlurSection =
    "filter:blur(8px)!important; pointer-events:none!important; user-select:none!important;";
  const hideFacebookDistractions = () => {
    const blurSelectors = [
      '[data-pagelet="FeedUnit"]',
      '[data-pagelet="Stories"]',
      '[data-pagelet="RightRail"]',
      '[data-pagelet="GroupsLeftColumn"]',
      "video[playsinline]",
    ];
    blurSelectors.forEach((selector) => {
      document.querySelectorAll<HTMLElement>(selector).forEach((el) => {
        el.style.cssText = BlurSection;
      });
    });
  };
  hideFacebookDistractions();
  const observer = new MutationObserver(hideFacebookDistractions);
  observer.observe(document.body, { childList: true, subtree: true });
}
