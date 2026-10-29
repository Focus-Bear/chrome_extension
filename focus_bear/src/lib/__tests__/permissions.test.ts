import { describe, expect, it } from "vitest";
import {
  findPermissionProblems,
  isCoveredBy,
  loadBuiltManifests,
  loadJustifications,
} from "../../../scripts/check-permissions.js";

describe("permission justifications (ST4S BE3)", () => {
  it("justifies everything the real Chrome and Firefox manifests request, and nothing more", () => {
    expect(findPermissionProblems(loadBuiltManifests(), loadJustifications())).toEqual([]);
  });

  it("no longer requests the unused activeTab and scripting permissions", () => {
    for (const manifest of loadBuiltManifests()) {
      expect(manifest.permissions).not.toContain("activeTab");
      expect(manifest.permissions).not.toContain("scripting");
    }
  });

  it("flags a newly requested permission without a justification", () => {
    const manifest = {
      permissions: ["storage", "history"],
      host_permissions: [],
      content_scripts: [],
    };
    const justifications = { permissions: { storage: "Saves settings." } };

    expect(findPermissionProblems([manifest], justifications)).toEqual([
      'permissions: "history" is requested but has no justification',
    ]);
  });

  it("flags a justification left behind after a permission is dropped", () => {
    const manifest = {
      permissions: [],
      host_permissions: [],
      content_scripts: [{ matches: ["<all_urls>"] }],
    };
    const justifications = {
      permissions: { tabs: "Reads tab addresses." },
      content_script_matches: { "<all_urls>": "Blocklist." },
    };

    expect(findPermissionProblems([manifest], justifications)).toEqual([
      'permissions: "tabs" is justified but no manifest requests it',
    ]);
  });

  it("treats a content-script match inside a host permission as already justified", () => {
    expect(isCoveredBy("https://www.youtube.com/*", "*://*.youtube.com/*")).toBe(true);
    expect(isCoveredBy("*://mail.google.com/*", "*://mail.google.com/*")).toBe(true);
    expect(isCoveredBy("<all_urls>", "*://*.youtube.com/*")).toBe(false);
    expect(isCoveredBy("https://evil-youtube.com/*", "*://*.youtube.com/*")).toBe(false);
  });
});
