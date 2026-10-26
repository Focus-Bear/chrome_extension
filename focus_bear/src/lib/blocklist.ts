/**
 * The list to store for a BLOCKLIST_UPDATE / BLOCKLIST_RESPONSE. Every app (Mac, Windows, Linux)
 * sends its complete current list, so it replaces the stored one; merging kept removed sites
 * blocked forever. A payload that is not a list returns null so the caller ignores it instead of
 * wiping the user's blocklist.
 */
export function blocklistFromUpdate(data: unknown): string[] | null {
  if (!Array.isArray(data)) return null;
  return data.filter((entry): entry is string => typeof entry === "string");
}

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
