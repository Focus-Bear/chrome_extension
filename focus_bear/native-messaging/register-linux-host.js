import { readFileSync, writeFileSync, existsSync, mkdirSync, chmodSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { homedir } from "os";

const __dirname = dirname(fileURLToPath(import.meta.url));

const HOME = homedir();

// Linux native-messaging manifest locations, per browser. Firefox is listed twice because the
// snap build reads from its own directory.
const FIREFOX_DIRS = [
  join(HOME, ".mozilla/native-messaging-hosts"),
  join(HOME, "snap/firefox/common/.mozilla/native-messaging-hosts"),
];

const CHROMIUM_DIRS = [
  join(HOME, ".config/google-chrome/NativeMessagingHosts"),
  join(HOME, ".config/chromium/NativeMessagingHosts"),
  join(HOME, ".config/BraveSoftware/Brave-Browser/NativeMessagingHosts"),
  join(HOME, ".config/opera/NativeMessagingHosts"),
];

// The generated launcher holds local paths, so it lives outside the repository.
const LAUNCHER_PATH = join(HOME, ".local/share/com.focusbear.host/host-launcher.sh");

function shellQuote(value) {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

// Browsers start the host without the shell's PATH, so a node installed through
// nvm is not found by "#!/usr/bin/env node". The launcher is the Linux
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

function writeManifest(dir, manifest) {
  mkdirSync(dir, { recursive: true });
  const outputPath = join(dir, "com.focusbear.host.json");
  writeFileSync(outputPath, JSON.stringify(manifest, null, 2));
  return outputPath;
}

/**
 * Register the Focus Bear native messaging host on Linux.
 * Like macOS (and unlike Windows, which edits the Registry), Linux reads a manifest JSON from a
 * per-browser directory. The manifest points at a launcher script.
 *
 * chromeExtensionIds: IDs allowed to connect to Chromium-based browsers. Without one, only
 * Firefox is registered.
 */
export function registerLinuxNativeHost(chromeExtensionIds = []) {
  if (process.platform !== "linux") {
    throw new Error("register-linux-host.js is Linux only!");
  }

  const hostPath = join(__dirname, "host.js");

  if (!existsSync(hostPath)) {
    throw new Error(`host.js not found at ${hostPath}`);
  }

  const ids = chromeExtensionIds.filter((id) => /^[a-p]{32}$/.test(id));
  if (ids.length !== chromeExtensionIds.length) {
    throw new Error("Invalid Chrome extension ID given (expected 32 letters a-p). ");
  }

  const launcherPath = writeLauncher(hostPath);

  const templatePath = join(__dirname, "com.focusbear.host.template.json");
  const template = JSON.parse(readFileSync(templatePath, "utf-8"));

  const written = [];

  // Firefox uses "allowed_extensions"
  for (const dir of FIREFOX_DIRS) {
    const outputPath = writeManifest(dir, { ...template, path: launcherPath });
    console.log(`Registered firefox native host: ${outputPath}`);
    written.push(outputPath);
  }

  // Chromium-based browsers use "allowed_origins" with full extension URLs
  if (ids.length === 0) {
    console.log("Chrome not registered: pass the extension ID from chrome://extensions.");
    return written;
  }
  const chromeManifest = { ...template, path: launcherPath };
  delete chromeManifest.allowed_extensions;
  chromeManifest.allowed_origins = ids.map((id) => `chrome-extension://${id}/`);

  for (const dir of CHROMIUM_DIRS) {
    const outputPath = writeManifest(dir, chromeManifest);
    console.log(`Registered chromium-based native host: ${outputPath}`);
    written.push(outputPath);
  }

  return written;
}

// Allow running directly through: `node register-linux-host.js [chromeExtensionId ...]`
if (fileURLToPath(import.meta.url) === process.argv[1]) {
  registerLinuxNativeHost(process.argv.slice(2));
}
