# Native Messaging

This is how the extension talks to the Focus Bear app. Browsers won't let an extension talk to an app directly, so there's a small program in the middle (`host.js`) that the browser starts up. It passes messages back and forth.

```
Extension  <-->  host.js  <-->  Focus Bear app
```

## Step 1: Build and load the extension

You'll need [Node.js](https://nodejs.org) installed, since the browser runs `host.js` with it.

```bash
cd focus_bear
npm run build
```

Load `dist` as an unpacked extension in Chrome or Opera GX, or `dist-firefox` in Firefox.

## Step 2: Register the host

On Windows:

```bash
node native-messaging/dev-register.js
```

This sets it up for Firefox, Chrome and Opera GX. It uses the extension ID `incfjmcgahhofcffefmkfigcckmplkhf` by default. If your ID is different (check the extensions page), add it on the end:

```bash
node native-messaging/dev-register.js <your-extension-id>
```

On Mac, run `node native-messaging/register-mac-host.js` instead.

Restart the browser once you're done.

## Step 3: Test it

If you don't have the Focus Bear app running, you can use the fake one:

```bash
node native-messaging/mock-app.js
```

Reload the extension and the mock should say `Host connected` after a few seconds. Then you can type:

- `block youtube.com x.com` to send a new blocklist (this replaces the whole list)
- `start 25 write report` to start a 25 minute session
- `pause`, `resume` or `cancel` to control the session
- `list` to see the current blocklist
- `quit` to stop it

Make sure the real app is closed first, as they both use the same connection.

## Messages

Everything is JSON with a `type` field.

From the extension:

- `PING` with the browser name. The host replies with `PONG`
- `GET_BLOCKLIST`. The app replies with `BLOCKLIST_RESPONSE`, or you get an `ERROR` if the app isn't running
- `GET_WHITELIST` and `WHITELIST_UPDATE`
- `REQUEST_SESSION_START` with `durationSeconds` and `task`
- `REQUEST_SESSION_PAUSE`, `REQUEST_SESSION_RESUME`, `REQUEST_SESSION_CANCEL`

From the app:

- `BLOCKLIST_UPDATE` with the full blocklist in `data`
- `WHITELIST_UPDATE` and `WHITELIST_RESPONSE`
- `SESSION_START` with `durationSeconds` and `intention` (the app's name for the task)
- `SESSION_PAUSE`, `SESSION_RESUME`, `SESSION_CANCEL`

When the host connects to the app, it asks for the blocklist straight away, so the extension still gets it if the browser was opened first. If the app closes, the host keeps trying to reconnect every 2 seconds.

## If something's not working

- **"Specified native messaging host not found"** in the service worker console means the host isn't registered, or the extension ID doesn't match. Run step 2 again with the right ID.
- The host writes a log to `%TEMP%\focusbear-native-host.log` on Windows, which is the first place to look.
- If the mock says the pipe is already in use, the real app or another mock is still running.
