import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { homedir } from "os";

const __dirname = dirname(fileURLToPath(import.meta.url));

// macOS native-messaging manifest locations, per browser.
const MANIFEST_DIRS = {
  firefox: join(
    homedir(),
    "Library/Application Support/Mozilla/NativeMessagingHosts",
  ),
  chrome: join(
    homedir(),
    "Library/Application Support/Google/Chrome/NativeMessagingHosts",
  ),
};

/**
 * Register the Focus Bear native messaging host on macOS.
 * Unlike Windows (which edits the Registry), macOS reads a manifest JSON
 * from a per-browser directory. The manifest points directly at host.js.
 */
export function registerMacNativeHost() {
  const hostPath = join(__dirname, "host.js");

  if (!existsSync(hostPath)) {
    throw new Error(`host.js not found at ${hostPath}`);
  }

  const templatePath = join(__dirname, "com.focusbear.host.template.json");
  const template = JSON.parse(readFileSync(templatePath, "utf-8"));

  const written = [];

  for (const [browser, dir] of Object.entries(MANIFEST_DIRS)) {
    // Firefox uses "allowed_extensions"; Chrome uses "allowed_origins".
    const manifest = { ...template, path: hostPath };
    if (browser === "chrome") {
      delete manifest.allowed_extensions;
      manifest.allowed_origins = ["chrome-extension://REPLACE_WITH_EXTENSION_ID/"];
    }

    mkdirSync(dir, { recursive: true });
    const outputPath = join(dir, "com.focusbear.host.json");
    writeFileSync(outputPath, JSON.stringify(manifest, null, 2));
    console.log(`Registered ${browser} native host: ${outputPath}`);
    written.push(outputPath);
  }

  return written;
}

// Allow running directly: `node register-mac-host.js`
if (import.meta.url === `file://${process.argv[1]}`) {
  registerMacNativeHost();
}
