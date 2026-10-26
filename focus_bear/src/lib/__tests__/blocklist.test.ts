import { describe, it, expect } from "vitest";
import { urlIsBlocklisted, buildBlockedUrl, blocklistFromUpdate } from "../blocklist.js";

// ─── urlIsBlocklisted ─────────────────────────────────────────────────────────

describe("urlIsBlocklisted", () => {
  it("blocks an exact hostname match", () => {
    expect(urlIsBlocklisted("https://reddit.com/r/all", ["reddit.com"])).toEqual({
      blocked: true,
      host: "reddit.com",
    });
  });

  it("blocks a subdomain when the parent domain is listed", () => {
    expect(urlIsBlocklisted("https://www.reddit.com/r/all", ["reddit.com"])).toEqual({
      blocked: true,
      host: "www.reddit.com",
    });
  });

  it("returns blocked=false for a non-matching URL", () => {
    expect(urlIsBlocklisted("https://github.com", ["reddit.com", "twitter.com"])).toEqual({
      blocked: false,
      host: "github.com",
    });
  });

  it("returns blocked=false for an empty blocklist", () => {
    expect(urlIsBlocklisted("https://reddit.com", [])).toEqual({ blocked: false, host: "" });
  });

  it("returns blocked=false for an undefined blocklist", () => {
    expect(urlIsBlocklisted("https://reddit.com", undefined)).toEqual({ blocked: false, host: "" });
  });

  it("does not block non-http protocols (e.g. chrome-extension://)", () => {
    expect(urlIsBlocklisted("chrome-extension://abc123/popup.html", ["abc123"])).toEqual({
      blocked: false,
      host: "abc123",
    });
  });

  it("returns blocked=false for a malformed URL", () => {
    expect(urlIsBlocklisted("not-a-url", ["reddit.com"])).toEqual({ blocked: false, host: "" });
  });

  it("skips empty-string entries in the blocklist", () => {
    expect(urlIsBlocklisted("https://reddit.com", ["", "reddit.com"])).toEqual({
      blocked: true,
      host: "reddit.com",
    });
  });

  it("blocks the first match when multiple entries match", () => {
    const result = urlIsBlocklisted("https://youtube.com/shorts", ["reddit.com", "youtube.com"]);
    expect(result.blocked).toBe(true);
    expect(result.host).toBe("youtube.com");
  });

  // Matching uses host.includes(site), so short entries match any host that contains them.
  // This is intentional current behaviour — a test pins it so any future change to stricter
  // (e.g. exact-domain) matching is a deliberate decision, not an accidental regression.
  it("substring match: a short entry matches any host that contains it", () => {
    expect(urlIsBlocklisted("https://youtube.com", ["you"])).toEqual({
      blocked: true,
      host: "youtube.com",
    });
  });
});

// ─── buildBlockedUrl ──────────────────────────────────────────────────────────

describe("buildBlockedUrl", () => {
  const BASE = "chrome-extension://abc123/blocked.html";

  it("appends the host as a query param", () => {
    expect(buildBlockedUrl(BASE, "reddit.com")).toBe(`${BASE}?d=reddit.com`);
  });

  it("URL-encodes special characters in the host", () => {
    expect(buildBlockedUrl(BASE, "some site.com")).toBe(`${BASE}?d=some%20site.com`);
  });

  it("URL-encodes a hostname with slashes", () => {
    expect(buildBlockedUrl(BASE, "bad/host")).toBe(`${BASE}?d=bad%2Fhost`);
  });
});

// ─── blocklistFromUpdate ──────────────────────────────────────────────────────

describe("blocklistFromUpdate", () => {
  it("replaces the list, so a site removed in the app is no longer blocked", () => {
    const before = blocklistFromUpdate(["reddit.com", "youtube.com"]);
    expect(urlIsBlocklisted("https://www.youtube.com/", before ?? []).blocked).toBe(true);

    const after = blocklistFromUpdate(["reddit.com"]);
    expect(after).toEqual(["reddit.com"]);
    expect(urlIsBlocklisted("https://www.youtube.com/", after ?? []).blocked).toBe(false);
    expect(urlIsBlocklisted("https://www.reddit.com/", after ?? []).blocked).toBe(true);
  });

  it("returns an empty list when the app clears every site", () => {
    expect(blocklistFromUpdate([])).toEqual([]);
  });

  it("returns null for a malformed payload so the stored list is kept", () => {
    expect(blocklistFromUpdate(undefined)).toBeNull();
    expect(blocklistFromUpdate("reddit.com")).toBeNull();
  });

  it("drops entries that are not strings", () => {
    expect(blocklistFromUpdate(["reddit.com", 42, null])).toEqual(["reddit.com"]);
  });
});
