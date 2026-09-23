import { registerFirefoxNativeHost } from "./register-firefox-host.js";
import { dirname } from "path";
import { fileURLToPath } from "url";

// DEV ONLY, will remove later.
const installDir = dirname(fileURLToPath(import.meta.url));
registerFirefoxNativeHost(installDir);