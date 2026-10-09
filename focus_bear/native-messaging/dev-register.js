import { registerFirefoxNativeHost } from "./register-firefox-host.js";
import { registerChromeNativeHost, DEV_EXTENSION_ID } from "./register-chrome-host.js";
import { dirname } from "path";
import { fileURLToPath } from "url";

// DEV ONLY, should be removed in the future.
// Usage: node dev-register.js [chromeExtensionId ...]
const installDir = dirname(fileURLToPath(import.meta.url));
const chromeIds = process.argv.slice(2);

registerFirefoxNativeHost(installDir);
registerChromeNativeHost(installDir, chromeIds.length ? chromeIds : [DEV_EXTENSION_ID]);
