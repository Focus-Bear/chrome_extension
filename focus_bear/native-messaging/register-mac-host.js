import { readFileSync, writeFileSync, existsSync, mkdirSync, chmodSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { homedir } from "os";

const __dirname = dirname(fileURLToPath(import.meta.url));

const APP_SUPPORT = join(homedir(), "Library/Application Support");

// macOS native-messaging manifest locations, per browser.
const MANIFEST_DIRS = {
  firefox: join(APP_SUPPORT, "Mozilla/NativeMessagingHosts"),
  chrome: join(APP_SUPPORT, "Google/Chrome/NativeMessagingHosts"),
};

// The generated launcher holds local paths, so it lives outside the repository.
const LAUNCHER_PATH = join(APP_SUPPORT, "com.focusbear.host/host-launcher.sh");

function shellQuote(value) {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

// Browsers start the host without the shell's PATH, so a node installed through
// nvm or Homebrew is not found by "#!/usr/bin/env node". The launcher is the macOS
// counterpart of host-launcher.cmd and calls node by absolute path.
function writeLauncher(hostPath) {
  mkdirSync(dirname(LAUNCHER_PATH), { recursive: true });
  writeFileSync(
    LAUNCHER_PATH,
    `#!/bin/sh\nexec ${shellQuote(process.execPath)} ${shellQuote(hostPath)}\n`,
  );
  chmodSync(LAUNCHER_PATH, 0o755);
  return LAUNCHER_PATH;
}

/**
 * Register the Focus Bear native messaging host on macOS.
 * Unlike Windows (which edits the Registry), macOS reads a manifest JSON
 * from a per-browser directory. The manifest points at a launcher script.
 *
 * chromeExtensionIds: IDs allowed to connect from Chrome. An unpacked build has
 * no fixed ID (see chrome://extensions), so there is no default; without one only
 * Firefox is registered.
 */
export function registerMacNativeHost(chromeExtensionIds = []) {
  if (process.platform !== "darwin") {
    throw new Error("register-mac-host.js is macOS only.");
  }

  const hostPath = join(__dirname, "host.js");

  if (!existsSync(hostPath)) {
    throw new Error(`host.js not found at ${hostPath}`);
  }

  const ids = chromeExtensionIds.filter((id) => /^[a-p]{32}$/.test(id));
  if (ids.length !== chromeExtensionIds.length) {
    throw new Error("Invalid Chrome extension ID given (expected 32 letters a-p).");
  }

  const launcherPath = writeLauncher(hostPath);

  const templatePath = join(__dirname, "com.focusbear.host.template.json");
  const template = JSON.parse(readFileSync(templatePath, "utf-8"));

  const written = [];

  for (const [browser, dir] of Object.entries(MANIFEST_DIRS)) {
    // Firefox uses "allowed_extensions"; Chrome uses "allowed_origins".
    const manifest = { ...template, path: launcherPath };
    if (browser === "chrome") {
      if (ids.length === 0) {
        console.log(
          "Chrome not registered: pass the extension ID from chrome://extensions, e.g. node register-mac-host.js <id>",
        );
        continue;
      }
      delete manifest.allowed_extensions;
      manifest.allowed_origins = ids.map((id) => `chrome-extension://${id}/`);
    }

    mkdirSync(dir, { recursive: true });
    const outputPath = join(dir, "com.focusbear.host.json");
    writeFileSync(outputPath, JSON.stringify(manifest, null, 2));
    console.log(`Registered ${browser} native host: ${outputPath}`);
    written.push(outputPath);
  }

  return written;
}

// Allow running directly: `node register-mac-host.js [chromeExtensionId ...]`
if (fileURLToPath(import.meta.url) === process.argv[1]) {
  registerMacNativeHost(process.argv.slice(2));
}
