# P000395SE Focus Bear Chrome Extension

**Focus Bear** is a Chrome extension (Manifest V3) that helps users stay focused by blocking distracting websites, running Pomodoro-style focus sessions, and reducing visual noise on sites like YouTube, LinkedIn, Gmail, Reddit, and Wikipedia.

**Focus Bear** is a Chrome extension designed to help users minimise distractions and stay focused by blocking access to distracting websites. After the completion of a focus session a break timer runs. You can also add website URL's to a block list to limit ditractions and can toggle off distracting popup's in popular websites like LinkedIn and Youtube to blur the news feed section for example.

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

### Known Limitations

- Distraction blurring on Gmail and some LinkedIn pages can be inconsistent depending on page load timing
- LinkedIn toggles can affect YouTube subscription blurring due to shared content script logic

---

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

Every pull request to `main` triggers three parallel jobs defined in `.github/workflows/lint.yml`:

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
chrome_extension/               # Git repo root (this README lives here)
└── focus_bear/                 # Extension source — run npm commands from here
    ├── public/
    │   ├── _locales/           # en, es language strings
    │   ├── icons/
    │   ├── fonts/
    │   ├── manifest.json
    │   ├── blocked.html        # Page shown when a blocked site is accessed
    │   └── blocked.js
    │
    ├── src/
    │   ├── components/         # Reusable UI (FocusTimer, CircularSlider, etc.)
    │   ├── context/            # Intention popup context and unfocus timer helpers
    │   ├── styles/
    │   ├── lib/                # Pure business logic (no Chrome API deps)
    │   │   ├── focus.ts        # Session state helpers
    │   │   ├── blocklist.ts    # URL matching and redirect URL builders
    │   │   ├── unfocus.ts      # Unfocus session timing
    │   │   └── __tests__/      # Vitest unit tests
    │   ├── youtube/
    │   ├── linkedin/
    │   ├── gmail/
    │   ├── wikipedia/
    │   ├── reddit/
    │   ├── x/
    │   ├── background.ts       # Service worker — sessions, alarms, blocklist enforcement
    │   ├── blocklist.ts        # Content script — per-page blocklist check
    │   ├── content.ts          # Injects unfocus intention popup on supported sites
    │   ├── popup.html
    │   ├── popup.tsx           # Main extension popup
    │   └── intentionPopup.tsx  # Floating unfocus popup
    │
    ├── vitest.config.ts
    ├── vite.config.ts
    ├── tsconfig.json
    ├── package.json
    ├── .oxfmtrc.json
    └── .oxlintrc.json
```

---

## License

N/A
