# P000395SE & P000444SE Focus Bear Extension

**Focus Bear** is a extension (Manifest V3) that helps users stay focused by blocking distracting websites, running Pomodoro-style focus sessions, website blocking, and reducing visual noise on sites like YouTube, LinkedIn, Gmail, Reddit, and Wikipedia.

Built as a capstone project extending the [Focus Bear](https://www.focusbear.io/) productivity app ecosystem.

## GitHub URL

<https://github.com/Focus-Bear/chrome_extension>

---

## Extension Overview

### Focus Sessions

- Start a Pomodoro-style timer with a configurable work duration and break duration
- Set durations via a draggable circular slider or preset values (5, 10, 30 min)
- Pause, resume, and reset an active session
- Break timer starts automatically after the work phase ends
- Desktop notifications fire when each phase completes
- Settings are locked and inaccessible while a focus session is active

### Blocklist

- Add and remove websites from a personal blocklist
- During an active focus session, any matching site is immediately redirected to a blocked page
- Blocking applies to all open tabs, not just newly opened ones
- Blocked domains are listed in the popup for quick reference
- Active hours can be configured to limit when blocking is enforced

### Unfocus / Intention Popup

- A floating popup appears on YouTube and LinkedIn before the page loads
- Captures the user's intention and how long they plan to spend
- Sessions under 10 minutes require 5+ characters of reasoning; 10+ minute sessions require 15+
- Scrollable session cards in the popup show any currently active unfocus timers

### Distraction Blurring

Each toggle is saved globally and persists across tabs and reloads.

| Site            | What can be blurred or hidden                                                                                     |
| --------------- | ----------------------------------------------------------------------------------------------------------------- |
| **YouTube**     | Homepage recommendations, chips bar, Shorts, comments, You menu                                                   |
| **LinkedIn**    | Homepage feed, notifications, trending news, job recommendations, connection recommendations, notification badges |
| **Gmail**       | Inbox, Promotions tab, Social and Updates tabs                                                                    |
| **Wikipedia**   | Main page content; link preview popups on hover                                                                   |
| **Reddit**      | Distracting feed content (via content script)                                                                     |
| **X / Twitter** | Distracting feed content (via content script)                                                                     |

### General

- Spanish language support (mirrors Chrome's language setting)
- UI follows Focus Bear branding and colour scheme
- All settings persist via `chrome.storage.local`

### Desktop App Connection

- The extension connects to the Focus Bear desktop app through native messaging
- The app's blocklist and focus sessions sync to the extension automatically
- The shared native messaging host supports Windows, macOS, and Linux
- Browser builds are provided for Chrome and Firefox, with Chromium-based browser support including Opera GX, where the browser's native messaging configuration is supported
- See [native-messaging/README.md](focus_bear/native-messaging/README.md) for setup, testing and the message list

### Known Limitations

- Distraction blurring on Gmail and some LinkedIn pages can be inconsistent depending on page load timing
- LinkedIn toggles can affect YouTube subscription blurring due to shared content script logic

---

## Architecture
The Focus Bear extension uses a shared application codebase with browser-specific manifest configuration. This keeps the focus timer, blocklist, intention popup and distraction-blurring features in one implementation while allowing Chrome / Chromium-based browsers and Firefox to use their required extension settings.

### Browser build targets
- `src/` contains the shared extension logic and UI
- `src/lib/browserApi.ts` provides a browser API compatibility layer so shared code can use the appropriate `browser` or `chrome` extension API.
- `manifests/base.json` defines common extension settings, permissions and content scripts.
- `manifests/chrome.json` and `manifests/firefox.json` define browser-specific overrides, including native messaging permissions and background configuration.
- `scripts/build-manifests.js` combines the base manifest with each browser override. `npm run build` generates the Chrome/Chromium build in `dist/` and the Firefox build in `dist-firefox/`.

Opera GX and other Chromium-based browsers, and use the Chromium build, subject to each browser's native messaging registration and compatibility requirements.

### Native messaging architecture
The extension does not communicate directly with the desktop application's internal APIs. Instead, it opens a native messaging connection to the registered host `com.focusbear.host`, which relays messages between the browser and the desktop app over a local IPC socket.

```
┌──────────────────────────────────────────┐
│          Focus Bear Extension            │
└────────────────────┬─────────────────────┘
                     │
                     │ Browser native messaging
                     │ (length-prefixed JSON)
                     ▼
┌──────────────────────────────────────────┐
│           Native Messaging Host          │
│             com.focusbear.host           │
│                 (host.js)                │
└────────────────────┬─────────────────────┘
                     │
                     │ Local socket
                     │ (newline-delimited JSON)
                     ▼
┌──────────────────────────────────────────┐
│       Focus Bear Desktop Application     │
└──────────────────────────────────────────┘
```
**Main Components:**
- **Extension background context (`src/background.ts`):** Opens a long-lived native messaging port, sends a `PING` handshake and requests the current blocklist. It handles incoming blocklist and session updates and sends session actions from the extension to the desktop app.
- **Native messaging host (`native-messaging/host.js`):** A Node.js process launched by the browser. It reads and writes the browser's length-prefixed JSON protocol, forwards messages to the desktop application's local socket, and logs diagnostics to a temporary log file. Browser native messaging messages are limited to 1 MB.
- **Host registration and launcher scripts (`native-messaging/`):** Register the host manifest for each browser and the operating system, and launch `host.js` using the appropriate Node.js executable.
- **Desktop application:** Listens on the local socket and handles any relayed requests and state updates. The extension and app can push or request the blocklist, and focus-session information.

### Operating System differences

| Operating System     | Local app connection                      | Native host registration |
| -------------------- | ----------------------------------------- | ------------------------ |
| Windows              | Named pipe: `\\.\pipe\focusbear`          | Windows registry entries point to native host manifest, launcher uses `host-launcher.cmd`  |
| macOS                | Unix domain socket: `/tmp/focusbear.sock` | Per-browser native messaging manifest files and a shell launcher are written under the user's Library/Application Support directory.|
| Linux                | Unix domain socket: `/tmp/focusbear.sock` | Per-browser native messaging manifest files and a shell launcher are written under the user's home configuration directories.  |

Chrome and other Chromium-based browsers use `allowed_origins` in the host manifest, while Firefox uses `allowed_extensions`. The registered manifest must allow the ID of the extension build being loaded. On Linux and macOS, the registration script can accept a Chrome extension ID to register Chromium-based browsers, while Firefox can be registered without that ID. For more detailed information, visit the operating system's desktop application repository.  

## Technologies

| Tool                           | Purpose                        |
| ------------------------------ | ------------------------------ |
| React 19 + TypeScript          | UI components and popup logic  |
| Vite 6                         | Build tooling and dev server   |
| Chrome Extension Manifest V3   | Extension platform             |
| Radix UI Themes + Lucide React | UI component library and icons |
| Oxlint                         | Linting                        |
| Oxfmt                          | Code formatting                |
| Vitest                         | Unit testing                   |

---

## Testing

Unit tests cover the core business logic in `src/lib/` — the pure functions that have no Chrome API dependency.

```bash
cd focus_bear
npm test
```

**What is tested (38 tests across 3 files):**

| File                | Functions covered                                                                                                 |
| ------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `focus.test.ts`     | `isFocusActive`, `buildFocusSessionState`, `computeTimeLeft`, `buildResumedSessionState`, pause→resume round trip |
| `blocklist.test.ts` | `urlIsBlocklisted`, `buildBlockedUrl`                                                                             |
| `unfocus.test.ts`   | `computeUnfocusEndTime`, `isUnfocusSessionActive`                                                                 |

Chrome API wiring (alarms, storage, message handlers) is not unit tested — that would require a Chrome API mock layer and is out of scope for this project.

---

## CI Pipeline

Every pull request to `main` triggers three parallel jobs defined in `.github/workflows/pipeline.yml`:

| Job      | Tool   | What it checks              |
| -------- | ------ | --------------------------- |
| `oxlint` | Oxlint | Code quality and lint rules |
| `oxfmt`  | Oxfmt  | Consistent code formatting  |
| `test`   | Vitest | All unit tests pass         |

All three must pass before a PR can be merged.

---

## Getting Started

### Prerequisites

- Node.js 24+
- Chrome (or any Chromium-based browser)

### Install and build

```bash
# From repo root
cd focus_bear
npm install
npm run build
```

### Load in Chrome

1. Open `chrome://extensions/`
2. Enable **Developer mode**
3. Click **Load unpacked**
4. Select the `focus_bear/dist` folder

### Load in Firefox

1. Open `about:debugging#/runtime/this-firefox`
2. Click **Load a temporary extension**
3. Load the `manifest.json` within the `/firefox-dist` folder

After any code changes: run `npm run build` again, then click **Reload** on the extension card and refresh any tabs you're testing.

### Other commands

```bash
npm run fmt        # Format code with Oxfmt
npm run fmt:check  # Check formatting (used in CI)
npm run lint       # Lint with Oxlint
npm test           # Run unit tests
```

### Troubleshooting

- Confirm `dist/` exists and contains a `manifest.json`
- Make sure you loaded `focus_bear/dist`, not the repo root or `src/`
- Developer mode must be on in Chrome
- If behaviour is unexpected after changes, do a clean rebuild:

```bash
rm -rf dist
npm run build
```

Then reload the extension in Chrome.

---

## Project Structure

```text
chrome_extension/                     # Git repo root (this README lives here)
└── focus_bear/                       # Extension source — run npm commands from here
    ├── manifests/              
    |   ├── base.json                 # Common permissions and extension configuration
    |   ├── chrome.json               # Chrome/Chromium overrides, including nativeMessaging
    |   ├── firefox.json              # Firefox overrides, including nativeMessaging
    ├── scripts/
    |   ├── build-manifests.js        # Generates browser-specific manifests and build folders
    |   ├── target.js                 # Declares Chrome and Firefox build targets
    ├── native-messaging/       
    |   ├── host.js                   # Relays messages between browser and desktop app
    |   ├── dev-register.js           # Registers development host on Windows
    |   ├── register-mac-host.js      # Registers host on macOS
    |   ├── register-linux-host.js    # Registers host on Linux
    |   ├── README.md                 # Setup guide
    ├── public/
    │   ├── _locales/                 # en, es language strings
    │   ├── icons/
    │   ├── fonts/
    │   ├── manifest.json
    │   ├── blocked.html              # Page shown when a blocked site is accessed
    │   └── blocked.js
    │
    ├── src/
    │   ├── components/               # Reusable UI (FocusTimer, CircularSlider, etc.)
    │   ├── context/                  # Intention popup context and unfocus timer helpers
    │   ├── styles/
    │   ├── lib/                      # Pure business logic (no Chrome API deps)
    │   │   ├── focus.ts              # Session state helpers
    │   │   ├── blocklist.ts          # URL matching and redirect URL builders
    │   │   ├── unfocus.ts            # Unfocus session timing
    │   │   └── __tests__/            # Vitest unit tests
    │   ├── youtube/
    │   ├── linkedin/
    │   ├── gmail/
    │   ├── wikipedia/
    │   ├── reddit/
    │   ├── x/
    │   ├── background.ts             # Service worker — sessions, alarms, blocklist enforcement
    │   ├── blocklist.ts              # Content script — per-page blocklist check
    │   ├── content.ts                # Injects unfocus intention popup on supported sites
    │   ├── popup.html
    │   ├── popup.tsx                 # Main extension popup
    │   └── intentionPopup.tsx        # Floating unfocus popup
    │
    ├── vitest.config.ts
    ├── vite.config.ts
    ├── tsconfig.json
    ├── package.json
    ├── .oxfmtrc.json
    └── .oxlintrc.json
```

---

## Release Notes

### v1.1 (current)

**Focus Bear v1.1** brings together timed focus sessions, site blocking, and distraction controls in one popup. Uplifted UI to be more intuitive for the user and match existing styling for focus bear.

**What's new**
- Pomodoro-style focus timer with configurable work and break durations, pause/resume, and desktop notifications
- Personal blocklist that redirects distracting sites during active focus sessions
- Intention popup on when opening new websites — set why you're visiting and how long you'll stay
- Distraction blurring for YouTube, LinkedIn, Gmail, Wikipedia, Reddit, and X
- Spanish language support via Chrome's locale settings

**Known issues**
- Gmail and some LinkedIn blur toggles can be inconsistent depending on page load timing

---

## Changelog

### 22/10/2026

### Unified Extension Update - Browser Compatibility and Native Messaging
- Shared browser codebase with separate Chrome/Chromium and Firefox manifest builds
- Native messaging connection between the extension and Focus Bear desktop app on Windows, macOS and Linux
- Automatic blocklist syncrhonisation and focus-session state updates between the extension and desktop app
- Host registration scripts and platform-specific launcher for Windows, macOS and Linux
- Expanded browser support to Chromium-based browsers

### [1.1] — 12/6/2026

#### Added
- Focus session timer with Chrome alarms for work/break phase transitions (`background.ts`, `FocusTimer.tsx`)
- Blocklist redirect to `blocked.html` during active focus sessions
- Unfocus / intention popup functionality (`content.ts`, `intentionPopup.tsx`)
- Blurring scripts for YouTube, LinkedIn, Gmail, Wikipedia, Reddit, and X
- Unit tests for core logic in `src/lib/` (38 tests via Vitest)
- CI pipeline: Oxlint, Oxfmt, and Vitest jobs on every PR
- Fully uplift UI on all pages
- Added accordian UI in burring settings to save space

#### Fixed
- Toggle settings now persist correctly across tabs and reloads
- LinkedIn distraction blurring reliability improvements
- YouTube comment toggle clickability

#### Known limitations
- Gmail blur timing inconsistencies on slow page loads
- Extend testing to cover more complex use cases like multiple focus/unfocus sessions
- As DOM elements are naturally updated on YouTube or LinkedIn it can break existing blurring

### [1.0] — 05/03/2026

#### Added
- Initial Manifest V3 extension scaffold (React 19, TypeScript, Vite 6)
- Extension popup with Focus Bear branding
- Basic YouTube distraction blurring (homepage, Shorts, comments)
- `chrome.storage.local` for settings persistence

---

## License

N/A
