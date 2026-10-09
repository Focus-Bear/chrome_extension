import { readFileSync, writeFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { execFileSync } from "child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Extension ID used when the unpacked dev build is loaded. Replace with the
// published Chrome Web Store ID for production.
export const DEV_EXTENSION_ID = "incfjmcgahhofcffefmkfigcckmplkhf";

// Opera and Opera GX are Chromium-based and look up hosts under Chrome's
// registry location, so one key is expected to cover both.
const REGISTRY_KEY = "HKCU\\Software\\Google\\Chrome\\NativeMessagingHosts\\com.focusbear.host";

// Register the native messaging host for Chrome and Opera GX on Windows.
export function registerChromeNativeHost(installDir, extensionIds = [DEV_EXTENSION_ID]) {
  if (process.platform !== "win32") {
    throw new Error("register-chrome-host.js is Windows only; use register-mac-host.js on macOS.");
  }

  const launcherPath = join(installDir, "host-launcher.cmd");

  if (!existsSync(launcherPath)) {
    throw new Error(`host-launcher.cmd not found at ${launcherPath}`);
  }

  const ids = extensionIds.filter((id) => /^[a-p]{32}$/.test(id));
  if (ids.length === 0) {
    throw new Error("No valid Chrome extension ID given (expected 32 letters a-p).");
  }

  // Chrome uses "allowed_origins" with full extension URLs, unlike Firefox's "allowed_extensions".
  const templatePath = join(__dirname, "com.focusbear.host.chrome.template.json");
  const template = JSON.parse(readFileSync(templatePath, "utf-8"));

  const manifest = {
    ...template,
    path: launcherPath,
    allowed_origins: ids.map((id) => `chrome-extension://${id}/`),
  };

  // Separate file from the Firefox manifest, since the allowed fields differ.
  const outputPath = join(installDir, "com.focusbear.host.chrome.json");
  writeFileSync(outputPath, JSON.stringify(manifest, null, 2));

  // Point Chrome (and Opera GX) at the manifest via the current user's registry.
  execFileSync("reg", ["add", REGISTRY_KEY, "/ve", "/t", "REG_SZ", "/d", outputPath, "/f"]);

  console.log(`Registered Chrome/Opera GX native host: ${outputPath}`);
  console.log(`Allowed extension IDs: ${ids.join(", ")}`);
  return outputPath;
}
