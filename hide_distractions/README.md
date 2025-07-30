# P000280SE Completion of Focus Bear Chrome Extension

**Focus Bear** is a Chrome extension designed to help users minimise distractions and stay focused by blocking access and areas of chosen websites.

## GitHub URL

<https://github.com/Focus-Bear/chrome_extension>

## Deloyment URL

- N/A

## Technologies

- **React/JavaScript**
- **HTML/CSS**
- **TypeScript**
- **Vite**

## Changelog

### Unreleased

- N/A

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

## Getting Started

These instructions will help you get a local copy of the project up and running for development/testing.

**Clone the repository**: git clone <https://github.com/Kiran-K4/chrome_extension>

### How to run

1. Navigate to directory
    - cd focus-bear-extension/hide_distractions

2. Install dependencies
    - npm install

3. Build the extension (Generates dist/ folder and contents)
    - npm run build

4. Load the extension in Chrome
    - Open Chrome and navigate to chrome://extensions/
    - Enable Developer Mode toggle
    - Press “Load unpacked”
    - Select the generated dist/ folder

### Troubleshooting

If you’re running into issues like missing build files or unexpected behaviour, try the following steps:

- The dist/ folder exists and contains a manifest.json
- You are loading the correct folder in chrome://extensions/
- You have enabled Developer Mode toggle
- If these are not the issue try:
    1. rm -rf dist
    2. npm run build
    3. ls dist/

## Project Structure

```text
hide_distractions/
│
├── public/                # Static files
│   ├── _locales/          # Contains languages
│   ├── icons/             # Extension icons
│   └── manifest.json      # Chrome Extension manifest
│
├── src/                   # Source files
│   ├── context/           # Contains global functions
│   ├── styles/            # Contains css files
│   ├── youtube/           # YouTube files
│   ├── linkedin/          # LinkedIn files
│   ├── background.ts      # Background script (Runs continuously in the background)
│   ├── content.ts         # Global content script (Injected into websites)
│   ├── popup.html         # HTML for popup interface
│   └── popup.tsx          # React popup UI
│
├── package.json           # Project metadata and scripts
├── package-lock.json      # Dependency lockfile
├── tsconfig.json          # TypeScript configuration
├── vite.config.ts         # Vite bundler configuration
└── README.md              # You're reading it!
```

## License

- N/A
