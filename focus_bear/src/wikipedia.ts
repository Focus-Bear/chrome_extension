const domain = window.location.hostname;

if (domain.includes("wikipedia.org")) {
  const addConfirmToLinks = () => {
    document.querySelectorAll<HTMLAnchorElement>("#mw-content-text a[href]").forEach(link => {
      if (link.dataset.focusbear) return;
      link.dataset.focusbear = "true";
      link.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        const href = link.href;
        const confirmed = window.confirm(
          `Do you really need to follow this link?\n\n${href}\n\nClick OK to continue or Cancel to stay focused.`
        );
        if (confirmed) {
          window.location.href = href;
        }
      });
    });
  };

  addConfirmToLinks();
  const observer = new MutationObserver(addConfirmToLinks);
  observer.observe(document.body, { childList: true, subtree: true });
}
