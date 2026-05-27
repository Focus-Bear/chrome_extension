# P000395SE Completion of Focus Bear Chrome Extension

**Focus Bear** is a Chrome extension designed to help users minimise distractions and stay focused by blocking access to distracting websites. After the completion of a focus session a break timer runs. You can also add website URL's to a block list to limit ditractions and can toggle off distracting popup's in popular websites like LinkedIn and Youtube to blur the news feed section for example. 

## GitHub URL

<https://github.com/Focus-Bear/chrome_extension>

## Deloyment URL

- Not deployed yet

## Technologies

- **React 19** with **TypeScript** 
- **HTML / CSS**
- **Vite 6** (build and dev server)
- **Chrome Extension Manifest V3** 
- **Radix UI Themes** and **Lucide React** 
- **Oxlint** and **Oxfmt** 

## Changelog

### Version 1.0.0 • 15 June 2025

#### 🚀 New Features

- A floating popup, to capture users intention and time allocation on YouTube and LinkedIn
- A popup to view active focus sessions and a settings page to toggle blur features
- Spanish language support that mirrors Chrome's language settings

- Toggle to blur YouTube homepage recommendations and chips bar
- Toggle to blur YouTube shorts
- Toggle to blur YouTube comments

- Toggle to blur LinkedIn homepage feed
- Toggle to blur LinkedIn notifications and trending news
- Toggle to blur LinkedIn job recommendations
- Toggle to blur LinkedIn connection recommendations

#### 🛠 Improvements

- Styling follows Focus Bear branding and colour scheme
- Settings are global and saved across different tabs
- Settings are saved on page reload
- If there is an active focus session, settings page cannot be accessed
- If a focus session is expected to be 10+ mins, 15+ characters of reasoning is required, other than 5 chracters
- Active session cards in popup are scrollable

#### 🐞 Bug Fixes

- Shorts section on YouTube homepage not blurred despite toggle being enabled in FocusBear extension
- Subscription section on YouTube homepage not blurred despite toggle being enabled in FocusBear extension
- Home Page blur not working after navigating from Shorts or Subscriptions page and refreshing

#### ❗ Known Issues

- LinkedIn toggles also affects YouTube subscription blurring
- Intention popup css being injected improperly on all LinkedIn pages

### Version 1.1.0 • 2 Nov 2025

#### 🚀 New Features

- Pomodoro Timer added to popup from original extension

- Toggle to blur YouTube you menu

- Toggle to remove LinkedIn notification badges

- Toggle to add Wikipedia link popups
- Toggle to blur Wikipedia main page

- Toggle to blur Gmail
- Toggle to blur Gmail promotions
- Toggle to blur Gmail social and updates

- Blocklist accessible through settings
- Site entry text box trims urls and adds to blocklist
- Blocked domains displayed in popup
- Blocked domains are blurred in active hours
- Remove option for each domain in list
- Options to set and save active hours for blocklist
- Popup when attempting to access blocked domains

#### 🛠 Improvements

- Various new themed messages added to intention popup

### Version 1.2.0 • 4th April 2026

#### 🚀 New Features

- Settings button now on top heading bar
- Can now drag the focus session length and break tie you want or select pre determined time values like 5, 10, 30 min sessions and breaks 

#### 🛠 Improvements

- Refresh of UI: styling, colours, alignment, layout
- Removal of relaxed list section
- Using accordian to hide distract toggles
- High contrast background and text for readability

#### 🐞 Bug Fixes

- Blurring of distracting websites completly not working before but now it's mostly working in LinkedIn, Youtube and Reddit
- Fixed intention popup displaying different UI based on website like LinkedIn or Youtube

#### ❗ Known Issues

- Distraction blurring on certain websites still a bit inconsistent or not implemented e.g. Gmail
- More UI and functional tests could be added to ensure it's working as expected

## Getting Started

These instructions will help you get a local copy of the project up and running for development/testing.

**Clone the repository**: git clone <https://github.com/Focus-Bear/chrome_extension>

### How to run

1. Navigate to directory (after cloning, from the repo root)
   - cd focus_bear

2. Install dependencies
   - npm install

3. Build the extension (generates a `dist/` folder)
   - npm run build

4. Load the extension in Chrome
   - Open Chrome and go to chrome://extensions/
   - Turn on **Developer mode**
   - Click **Load unpacked**
   - Select the `focus_bear/dist` folder (not `src/` or the repo root)

5. After code changes, click **Reload** on the extension card and refresh any tabs you’re testing

### Formatting

1. Navigate to directory
   - cd focus_bear

2. Install dependencies (if you haven’t already)
   - npm install

3. Run Oxfmt
   - npm run fmt

### Linting

To lint the project using Oxlint:

1. Navigate to directory
   - cd focus_bear

2. Install dependencies (if you haven’t already)
   - npm install

3. Run Oxlint
   - npm run lint

### Troubleshooting

If you’re running into issues like missing build files or unexpected behaviour, try the following:

- Check that `dist/` exists and has a `manifest.json` inside it
- You loaded **`focus_bear/dist`** in chrome://extensions/ (not the whole repo)
- Developer mode is on
- You ran `npm run build` from inside `focus_bear`
- If it still acts weird, from `focus_bear` try:
  1. rm -rf dist
  2. npm run build
  3. Reload the extension in Chrome

## Project Structure

```text
chrome_extension/               # Git repo root (this README lives here)
└── focus_bear/                 # Extension app — run npm commands here
    ├── public/
    │   ├── _locales/           # en, es language strings
    │   ├── icons/
    │   ├── fonts/
    │   ├── manifest.json
    │   ├── blocked.html        # Page shown when blocklist blocks a site
    │   └── blocked.js
    │
    ├── src/
    │   ├── components/         # Focus timer UI (FocusTimer.tsx, etc.)
    │   ├── context/            # Intention popup / unfocus helpers
    │   ├── styles/             # popup.css, intentionPopup.css, etc.
    │   ├── youtube/
    │   ├── linkedin/
    │   ├── gmail/
    │   ├── wikipedia/
    │   ├── reddit/
    │   ├── background.ts       # Service worker (focus sessions, blocklist, alarms)
    │   ├── blocklist.ts
    │   ├── content.ts          # Injects unfocus intention popup on supported sites
    │   ├── popup.html
    │   ├── popup.tsx           # Main extension popup
    │   └── intentionPopup.tsx  # Floating unfocus popup (built as floatingPopup.js)
    │
    ├── package.json
    ├── package-lock.json
    ├── tsconfig.json
    ├── .oxfmtrc.json
    ├── .oxlintrc.json
    └── vite.config.ts
```

## License

- N/A
