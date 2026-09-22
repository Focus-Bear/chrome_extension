declare const browser: typeof chrome | undefined;
export const browserApi: typeof chrome =
  typeof browser !== "undefined" ? (browser as typeof chrome) : chrome;
