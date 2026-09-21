import { readFileSync, writeFileSync, mkdirSync, cpSync, existsSync, rmSync} from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { targets } from "./target.js";

// Resolve the paths to the project directories.
const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const manifestsDir = resolve(root, "manifests");
const primaryDistDir = resolve(root, "dist");

if (!existsSync(primaryDistDir)) {
    throw new Error ("dist/ not found - run 'vite build' before this script.");
}

// Read and parse the base manifest file.
const base = JSON.parse(readFileSync(resolve(manifestsDir, "base.json"), "utf-8"));

// Build each target's browser specific manifest, and write it to the target output directory.
for (const target of targets) {
    const overrides = JSON.parse(readFileSync(resolve(manifestsDir, target.overrideFile), "utf-8"),);
    const manifest = {...base, ...overrides};
    const outDir = resolve(root, target.outDir);

    if (target.outDir !== "dist") {
        if (existsSync(outDir)) rmSync(outDir, {recursive: true, force: true});
        mkdirSync(outDir, {recursive: true});
        cpSync(primaryDistDir, outDir, {recursive: true});
    }

    writeFileSync(resolve(outDir, "manifest.json"), JSON.stringify(manifest, null, 2));
    console.log(`manifest.json written to ${target.outDir} (${target.name})`);
}