// Tab reporting for the desktop app (protocol version 2).
//
// The desktop app decides what to block with its own rules (focus sessions, blocking schedules,
// super-distracting sites, the AI check). On Windows it could only read Firefox's address through
// the accessibility tree, which breaks with Firefox's language and version. With these messages
// the extension tells the app which page is in front, and the app can send the tab somewhere else
// (an unblocked page, or back to where it was). Pure functions so they can be unit tested.

/** Sent with PING so the app knows this build can report tabs and take NAVIGATE_TAB. */
export const TAB_PROTOCOL_VERSION = 2;
export const TAB_CAPABILITIES = ["tab_url", "navigate_tab"];

/** Longest address the app is sent; longer ones are data: URLs and the like, never a site. */
export const MAX_REPORTED_URL_LENGTH = 16384;

export interface TabLike {
  id?: number;
  windowId?: number;
  url?: string;
  title?: string;
  incognito?: boolean;
  active?: boolean;
}

export interface TabUrlMessage {
  type: "TAB_URL";
  url: string;
  title: string;
  tabId: number;
  windowId: number;
  incognito: boolean;
  reason: string;
}

/** The TAB_URL message for the tab in front, or null when there is nothing to report. */
export function buildTabReport(tab: TabLike | undefined, reason: string): TabUrlMessage | null {
  if (!tab || tab.id === undefined || tab.id < 0 || !tab.url) return null;
  if (tab.url.length > MAX_REPORTED_URL_LENGTH) return null;
  return {
    type: "TAB_URL",
    url: tab.url,
    title: tab.title ?? "",
    tabId: tab.id,
    windowId: tab.windowId ?? -1,
    incognito: !!tab.incognito,
    reason,
  };
}

/** Whether a tab update is worth reporting: only the active tab, when its address or title changed or it loaded. */
export function isReportableUpdate(
  changeInfo: { url?: string; title?: string; status?: string },
  tab: TabLike,
): boolean {
  if (!tab.active) return false;
  return !!changeInfo.url || !!changeInfo.title || changeInfo.status === "complete";
}

/**
 * Addresses an extension may open with tabs.update. Firefox refuses file:, data:, javascript:,
 * about: (other than about:blank) and its privileged pages, so the app keeps opening those itself.
 */
export function isNavigableUrl(url: unknown): url is string {
  if (typeof url !== "string" || url.length === 0 || url.length > MAX_REPORTED_URL_LENGTH)
    return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export interface NavigateRequest {
  tabId: number;
  url: string;
  expectedUrl?: string;
  requestId: string;
}

/** A NAVIGATE_TAB message from the app, checked; null when it is malformed. */
export function parseNavigateRequest(message: any): NavigateRequest | null {
  if (!message || message.type !== "NAVIGATE_TAB") return null;
  if (typeof message.tabId !== "number" || !Number.isInteger(message.tabId) || message.tabId < 0)
    return null;
  if (typeof message.requestId !== "string" || message.requestId.length === 0) return null;
  if (!isNavigableUrl(message.url)) return null;
  const expectedUrl = typeof message.expectedUrl === "string" ? message.expectedUrl : undefined;
  return { tabId: message.tabId, url: message.url, expectedUrl, requestId: message.requestId };
}

/**
 * Only move a tab that is still on the page the app decided about: if the user has moved on in
 * the meantime, the app's decision is about a page that is no longer there.
 */
export function tabStillOn(tabUrl: string | undefined, expectedUrl: string | undefined): boolean {
  if (!expectedUrl) return true;
  return tabUrl === expectedUrl;
}
