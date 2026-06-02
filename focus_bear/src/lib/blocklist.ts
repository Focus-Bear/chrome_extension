/** Check whether a URL's hostname matches any entry in the blocklist. */
export function urlIsBlocklisted(
  url: string,
  blocklist: string[] | undefined,
): { blocked: boolean; host: string } {
  if (!blocklist || blocklist.length === 0) return { blocked: false, host: "" };
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return { blocked: false, host: parsed.hostname };
    }
    const host = parsed.hostname;
    const blocked = blocklist.some((site) => site && host.includes(site));
    return { blocked, host };
  } catch {
    return { blocked: false, host: "" };
  }
}

/** Build the redirect URL for a blocked site. blockedPage is chrome.runtime.getURL("blocked.html"). */
export function buildBlockedUrl(blockedPage: string, host: string): string {
  return blockedPage + "?d=" + encodeURIComponent(host);
}
