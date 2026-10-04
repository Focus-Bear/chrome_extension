#!/usr/bin/env node

/**
 * Native Messaging Host for Focus Bear
 * Connects to Electron app via Unix socket for bidirectional communication
 */

import { appendFileSync } from "fs";
import { createConnection } from "net";
import { tmpdir } from "os";
import { join } from "path";

const SOCKET_PATH = "\\\\.\\pipe\\focusbear";

let appSocket = null;
let isConnectedToApp = false;
let cachedBrowserId = null;
let pendingBlocklistCallback = null;
let pendingBlocklistTimeout = null;

// Native messaging uses length-prefixed JSON messages
// Browsers reject (and disconnect) host messages larger than 1 MB.
const MAX_MESSAGE_BYTES = 1024 * 1024;

function sendMessage(message) {
  let buffer = Buffer.from(JSON.stringify(message));
  if (buffer.length > MAX_MESSAGE_BYTES) {
    log(`Message ${message.type} is ${buffer.length} bytes, over the 1 MB limit; not sent`);
    buffer = Buffer.from(
      JSON.stringify({ type: "ERROR", error: `${message.type} exceeded 1 MB message limit` }),
    );
  }
  const header = Buffer.alloc(4);
  header.writeUInt32LE(buffer.length, 0);

  process.stdout.write(header);
  process.stdout.write(buffer);
}

function readMessage(callback) {
  let buffer = Buffer.alloc(0);

  process.stdin.on("data", (chunk) => {
    buffer = Buffer.concat([buffer, chunk]);

    while (buffer.length >= 4) {
      const msgLen = buffer.readUInt32LE(0);
      if (buffer.length < 4 + msgLen) break;
      try {
        callback(JSON.parse(buffer.slice(4, 4 + msgLen).toString("utf8")));
      } catch (error) {
        log(`Error parsing stdin message: ${error.message}`);
      }
      buffer = buffer.slice(4 + msgLen);
    }
  });
}

// Log to a file since stdout is used for messaging
function log(message) {
  // os.tmpdir() resolves to %TEMP% on Windows; "/tmp" does not exist there.
  const logPath = join(tmpdir(), "focusbear-native-host.log");
  const timestamp = new Date().toISOString();
  try {
    appendFileSync(logPath, `[${timestamp}] ${message}\n`);
  } catch {
    // Never let logging crash the host; stdout is reserved for the browser.
  }
}

// Connect to Electron app via Unix socket
function connectToApp() {
  log("Attempting to connect to Electron app socket...");

  appSocket = createConnection(SOCKET_PATH);
  // Decode as UTF-8 across chunk boundaries so multi-byte characters are never split.
  appSocket.setEncoding("utf8");

  appSocket.on("connect", () => {
    log("Connected to Electron app via socket");
    isConnectedToApp = true;

    // Send initial handshake — include cached browser ID if known (covers reconnects)
    appSocket.write(
      JSON.stringify({ type: "NATIVE_HOST_CONNECTED", browser: cachedBrowserId }) + "\n",
    );
  });

  // Large messages (e.g. long blocklists) arrive split across several chunks,
  // so buffer until a full newline-terminated message is available.
  let socketBuffer = "";

  appSocket.on("data", (data) => {
    socketBuffer += data;
    const parts = socketBuffer.split("\n");
    socketBuffer = parts.pop();
    const lines = parts.filter((line) => line.trim());

    lines.forEach((line) => {
      try {
        const message = JSON.parse(line);
        log(`Received from app: ${JSON.stringify(message)}`);

        if (message.type === "BLOCKLIST_UPDATE") {
          log(`Forwarding blocklist update to extension (${message.data.length} entries)`);
          sendMessage({
            type: "BLOCKLIST_UPDATE",
            data: message.data,
            timestamp: Date.now(),
          });
        } else if (message.type === "WHITELIST_UPDATE") {
          log(`Forwarding whitelist update to extension (${message.data.length} entries)`);
          sendMessage({
            type: "WHITELIST_UPDATE",
            data: message.data,
            timestamp: Date.now(),
          });
        } else if (message.type === "WHITELIST_RESPONSE") {
          log(`Forwarding whitelist response to extension (${message.data.length} entries)`);
          sendMessage({
            type: "WHITELIST_RESPONSE",
            data: message.data,
            timestamp: Date.now(),
          });
        } else if (message.type === "BLOCKLIST_RESPONSE") {
          if (pendingBlocklistCallback) {
            const cb = pendingBlocklistCallback;
            pendingBlocklistCallback = null;
            clearTimeout(pendingBlocklistTimeout);
            pendingBlocklistTimeout = null;
            cb(null, message.data);
          }
        }
      } catch (error) {
        log(`Error parsing socket message: ${error.message}`);
      }
    });
  });

  appSocket.on("error", (error) => {
    log(`Socket error: ${error.message}`);
    isConnectedToApp = false;
  });

  appSocket.on("close", () => {
    log("Socket connection closed. Will retry...");
    isConnectedToApp = false;
    appSocket = null;

    // Retry connection after 2 seconds
    setTimeout(connectToApp, 2000);
  });
}

// Request blocklist from app via socket
function requestBlocklist(callback) {
  if (!isConnectedToApp || !appSocket) {
    log("Not connected to app, cannot retrieve blocklist");
    callback(new Error("Not connected to app"), []);
    return;
  }

  if (pendingBlocklistCallback) {
    callback(new Error("Request already pending"), []);
    return;
  }

  log("Requesting blocklist from app via socket...");
  pendingBlocklistCallback = callback;
  pendingBlocklistTimeout = setTimeout(() => {
    log("Blocklist request timed out");
    pendingBlocklistCallback = null;
    pendingBlocklistTimeout = null;
    callback(new Error("Timeout"), []);
  }, 5000);

  appSocket.write(JSON.stringify({ type: "GET_BLOCKLIST" }) + "\n");
}

log("Native messaging host started");

// When extension is disabled/removed, Firefox closes stdin — exit cleanly so
// Electron's socket close handler detects the disconnection immediately.
process.stdin.on("end", () => {
  log("stdin closed (extension disconnected), exiting");
  if (appSocket) appSocket.end();
  process.exit(0);
});

// Connect to Electron app
connectToApp();

// Handle messages from the extension
readMessage((message) => {
  log(`Received from extension: ${JSON.stringify(message)}`);

  switch (message.type) {
    case "GET_BLOCKLIST":
      requestBlocklist((error, blocklist) => {
        if (error) {
          log(`Error getting blocklist: ${error.message}`);
          sendMessage({
            type: "ERROR",
            error: error.message,
          });
        } else {
          log(`Sending blocklist to extension: ${blocklist.length} entries`);
          sendMessage({
            type: "BLOCKLIST_RESPONSE",
            data: blocklist,
            timestamp: Date.now(),
          });
        }
      });
      break;

    case "PING":
      log("Received ping, sending pong");
      if (message.browser) cachedBrowserId = message.browser;
      sendMessage({
        type: "PONG",
        timestamp: Date.now(),
        connectedToApp: isConnectedToApp,
      });
      if (isConnectedToApp && appSocket) {
        appSocket.write(
          JSON.stringify({
            type: "PING",
            browser: cachedBrowserId || "unknown",
            timestamp: Date.now(),
          }) + "\n",
        );
      }
      break;

    case "GET_WHITELIST":
      log("Forwarding GET_WHITELIST to app");
      if (isConnectedToApp && appSocket) {
        appSocket.write(JSON.stringify({ type: "GET_WHITELIST" }) + "\n");
      } else {
        log("Not connected to app, sending empty whitelist response");
        sendMessage({ type: "WHITELIST_RESPONSE", data: [] });
      }
      break;

    case "WHITELIST_UPDATE":
      log(`Forwarding whitelist update to app (${message.data.length} entries)`);
      if (isConnectedToApp && appSocket) {
        appSocket.write(
          JSON.stringify({
            type: "WHITELIST_UPDATE",
            data: message.data,
            timestamp: Date.now(),
          }) + "\n",
        );
      } else {
        log("Not connected to app, whitelist update not forwarded");
      }
      break;

    default:
      log(`Unknown message type: ${message.type}`);
      sendMessage({
        type: "ERROR",
        error: `Unknown message type: ${message.type}`,
      });
  }
});

// Handle process termination
process.on("SIGTERM", () => {
  log("Received SIGTERM, closing socket and exiting");
  if (appSocket) {
    appSocket.end();
  }
  process.exit(0);
});

process.on("SIGINT", () => {
  log("Received SIGINT, closing socket and exiting");
  if (appSocket) {
    appSocket.end();
  }
  process.exit(0);
});

log("Native host ready, waiting for messages");
