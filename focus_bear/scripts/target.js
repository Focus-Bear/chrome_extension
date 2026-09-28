// Defines the browser build targets, including each browser's manifest overrides and output directory.
export const targets = [
  { name: "chrome", overrideFile: "chrome.json", outDir: "dist" },
  { name: "firefox", overrideFile: "firefox.json", outDir: "dist-firefox" },
];
