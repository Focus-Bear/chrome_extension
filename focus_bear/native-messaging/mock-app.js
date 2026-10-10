#!/usr/bin/env node

/**
 * DEV ONLY: mock of the Focus Bear desktop app's side of native messaging.
 * Listens on the same pipe/socket host.js connects to, so the full
 * extension <-> host <-> app chain can be tested without the real app.
 *
 * Usage: node mock-app.js   then type "help" for commands.
 */

import { createServer, createConnection } from "net";
import { existsSync, unlinkSync } from "fs";
import { createInterface } from "readline";

const SOCKET_PATH = process.platform === "win32" ? "\\\\.\\pipe\\focusbear" : "/tmp/focusbear.sock";

let blocklist = ["youtube.com", "reddit.com"];
const clients = new Set();

function send(socket, message) {
  socket.write(JSON.stringify(message) + "\n");
}

function broadcast(message) {
  if (clients.size === 0) {
    console.log("No host connected - is the extension loaded and registered?");
    return;
  }
  clients.forEach((socket) => send(socket, message));
  console.log(`-> sent ${message.type}`);
}

function handleMessage(socket, message) {
  console.log(`<- received ${JSON.stringify(message)}`);

  switch (message.type) {
    case "GET_BLOCKLIST":
      send(socket, { type: "BLOCKLIST_RESPONSE", data: blocklist });
      console.log(`-> sent BLOCKLIST_RESPONSE (${blocklist.length} entries)`);
      break;
    case "GET_WHITELIST":
      send(socket, { type: "WHITELIST_RESPONSE", data: [] });
      break;
    default:
      // NATIVE_HOST_CONNECTED, PING, WHITELIST_UPDATE, REQUEST_SESSION_* are logged only.
      break;
  }
}

const server = createServer((socket) => {
  clients.add(socket);
  console.log("Host connected");

  let buffer = "";
  socket.on("data", (data) => {
    buffer += data.toString();
    const lines = buffer.split("\n");
    buffer = lines.pop();
    lines
      .filter((line) => line.trim())
      .forEach((line) => {
        try {
          handleMessage(socket, JSON.parse(line));
        } catch (error) {
          console.log(`Bad message: ${line} (${error.message})`);
        }
      });
  });

  socket.on("close", () => {
    clients.delete(socket);
    console.log("Host disconnected");
  });
  socket.on("error", (error) => console.log(`Socket error: ${error.message}`));
});

function inUse() {
  console.log(`${SOCKET_PATH} is already in use - close the real Focus Bear app or other mock.`);
  process.exit(1);
}

server.on("error", (error) => {
  if (error.code === "EADDRINUSE") inUse();
  console.log(`Server error: ${error.message}`);
  process.exit(1);
});

function start() {
  server.listen(SOCKET_PATH, () => {
    console.log(`Mock Focus Bear app listening on ${SOCKET_PATH}`);
    console.log('Type "help" for commands.');
  });
}

if (process.platform === "win32" || !existsSync(SOCKET_PATH)) {
  start();
} else {
  // A Unix socket file exists: only remove it if nothing is listening (stale from a crash).
  const probe = createConnection(SOCKET_PATH);
  probe.on("connect", () => {
    probe.destroy();
    inUse();
  });
  probe.on("error", () => {
    unlinkSync(SOCKET_PATH);
    start();
  });
}

const HELP = `Commands:
  block <site> [site ...]   replace the blocklist and push BLOCKLIST_UPDATE
  start <minutes> [task]    push SESSION_START
  pause | resume | cancel   push SESSION_PAUSE / SESSION_RESUME / SESSION_CANCEL
  list                      show the current blocklist
  quit                      stop the mock`;

createInterface({ input: process.stdin }).on("line", (input) => {
  const [command, ...args] = input.trim().split(/\s+/);

  switch (command) {
    case "block":
      blocklist = args.filter(Boolean);
      broadcast({ type: "BLOCKLIST_UPDATE", data: blocklist });
      break;
    case "start": {
      const minutes = Number(args[0]) || 25;
      broadcast({
        type: "SESSION_START",
        durationSeconds: minutes * 60,
        intention: args.slice(1).join(" "),
      });
      break;
    }
    case "pause":
    case "resume":
    case "cancel":
      broadcast({ type: `SESSION_${command.toUpperCase()}` });
      break;
    case "list":
      console.log(blocklist);
      break;
    case "quit":
      clients.forEach((socket) => socket.destroy());
      server.close();
      process.exit(0);
      break;
    case "":
      break;
    default:
      console.log(HELP);
  }
});
