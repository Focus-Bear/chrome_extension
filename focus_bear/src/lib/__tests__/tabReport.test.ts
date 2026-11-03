import { describe, it, expect } from "vitest";
import {
  buildTabReport,
  isReportableUpdate,
  isNavigableUrl,
  parseNavigateRequest,
  tabStillOn,
  MAX_REPORTED_URL_LENGTH,
} from "../tabReport.js";

describe("buildTabReport", () => {
  it("reports the tab's address, title and ids", () => {
    expect(
      buildTabReport(
        { id: 7, windowId: 3, url: "https://example.com/a", title: "Example", incognito: false },
        "activated",
      ),
    ).toEqual({
      type: "TAB_URL",
      url: "https://example.com/a",
      title: "Example",
      tabId: 7,
      windowId: 3,
      incognito: false,
      reason: "activated",
    });
  });

  it("reports file: block pages too, so the app sees its own block page", () => {
    expect(
      buildTabReport({ id: 1, url: "file:///C:/x/focus-block.html?old_url=a" }, "updated")?.url,
    ).toBe("file:///C:/x/focus-block.html?old_url=a");
  });

  it("marks private windows", () => {
    expect(
      buildTabReport({ id: 1, url: "https://a.com", incognito: true }, "focus")?.incognito,
    ).toBe(true);
  });

  it("skips tabs without an id or address", () => {
    expect(buildTabReport(undefined, "x")).toBeNull();
    expect(buildTabReport({ url: "https://a.com" }, "x")).toBeNull();
    expect(buildTabReport({ id: 1 }, "x")).toBeNull();
    expect(buildTabReport({ id: -1, url: "https://a.com" }, "x")).toBeNull();
  });

  it("skips addresses too long to be a site", () => {
    expect(
      buildTabReport({ id: 1, url: "data:," + "a".repeat(MAX_REPORTED_URL_LENGTH) }, "x"),
    ).toBeNull();
  });
});

describe("isReportableUpdate", () => {
  it("reports the active tab's new address, title or finished load", () => {
    expect(isReportableUpdate({ url: "https://a.com" }, { active: true })).toBe(true);
    expect(isReportableUpdate({ title: "A" }, { active: true })).toBe(true);
    expect(isReportableUpdate({ status: "complete" }, { active: true })).toBe(true);
  });

  it("ignores background tabs and loading noise", () => {
    expect(isReportableUpdate({ url: "https://a.com" }, { active: false })).toBe(false);
    expect(isReportableUpdate({ status: "loading" }, { active: true })).toBe(false);
  });
});

describe("isNavigableUrl", () => {
  it("allows web addresses", () => {
    expect(isNavigableUrl("https://example.com/x?y=1")).toBe(true);
    expect(isNavigableUrl("http://info.cern.ch")).toBe(true);
  });

  it("refuses what Firefox will not open from an extension", () => {
    expect(isNavigableUrl("file:///C:/focus-block.html")).toBe(false);
    expect(isNavigableUrl("about:config")).toBe(false);
    expect(isNavigableUrl("javascript:alert(1)")).toBe(false);
    expect(isNavigableUrl("data:text/html,hi")).toBe(false);
    expect(isNavigableUrl("not a url")).toBe(false);
    expect(isNavigableUrl(42)).toBe(false);
  });
});

describe("parseNavigateRequest", () => {
  const valid = {
    type: "NAVIGATE_TAB",
    tabId: 4,
    url: "https://example.com/",
    expectedUrl: "https://reddit.com/",
    requestId: "r1",
  };

  it("accepts a well-formed request", () => {
    expect(parseNavigateRequest(valid)).toEqual({
      tabId: 4,
      url: "https://example.com/",
      expectedUrl: "https://reddit.com/",
      requestId: "r1",
    });
  });

  it("rejects other messages and bad fields", () => {
    expect(parseNavigateRequest({ ...valid, type: "SESSION_START" })).toBeNull();
    expect(parseNavigateRequest({ ...valid, tabId: "4" })).toBeNull();
    expect(parseNavigateRequest({ ...valid, tabId: 1.5 })).toBeNull();
    expect(parseNavigateRequest({ ...valid, requestId: "" })).toBeNull();
    expect(parseNavigateRequest({ ...valid, url: "file:///C:/x.html" })).toBeNull();
    expect(parseNavigateRequest(null)).toBeNull();
  });
});

describe("tabStillOn", () => {
  it("moves a tab that is still on the page the app decided about", () => {
    expect(tabStillOn("https://reddit.com/", "https://reddit.com/")).toBe(true);
    expect(tabStillOn("https://reddit.com/", undefined)).toBe(true);
  });

  it("leaves a tab the user has since moved on", () => {
    expect(tabStillOn("https://docs.example.com/", "https://reddit.com/")).toBe(false);
  });
});
