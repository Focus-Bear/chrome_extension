import { readFileSync, writeFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { execFileSync } from "child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Get the directory containing this script so the manifest template can be located.
export function registerFirefoxNativeHost(installDir) {
    const launcherPath = join(installDir, "host-launcher.cmd");

    if (!existsSync(launcherPath)) {
        throw new Error(`host-launcher.cmd not found at ${launcherPath}`);
    }

    // Load the native messaging manifest template used for Firefox. 
    const templatePath = join(__dirname, "com.focusbear.host.template.json");
    const template = JSON.parse(readFileSync(templatePath, "utf-8"));

    const manifest = { ...template, path: launcherPath };

    // Write the completed manifest into the installation directory.
    const outputPath = join(installDir, "com.focusbear.host.json");
    writeFileSync(outputPath, JSON.stringify(manifest, null, 2));

    // Register the manifest path in th ecurrent user's Windows Registery. 
    execFileSync("reg", [
        "add",
        "HKCU\\Software\\Mozilla\\NativeMessagingHosts\\com.focusbear.host",
        "/ve",
        "/t", "REG_SZ",
        "/d", outputPath,
        "/f",
    ]);

    console.log(`Registered FireFox native host: ${outputPath}`);
    return outputPath;
}