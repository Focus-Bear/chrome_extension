# Focus Bear Chrome Extension — Release Information

**Current version:** 1.1  
**Manifest:** Chrome Extension Manifest V3  
**Repository:** [https://github.com/Focus-Bear/chrome_extension](https://github.com/Focus-Bear/chrome_extension)

---

## Release Notes — v1.1

Focus Bear v1.1 brings together timed focus sessions, site blocking, and distraction controls in one popup. The UI has been uplifted to be more intuitive and align with existing Focus Bear styling.

### What's included

- Pomodoro-style focus timer with configurable work and break durations, pause/resume, and desktop notifications
- Personal blocklist that redirects distracting sites during active focus sessions
- Intention popup when opening supported websites — set why you're visiting and how long you'll stay
- Distraction blurring for YouTube, LinkedIn, Gmail, Wikipedia, Reddit, and X
- Spanish language support via Chrome's locale settings
- 38 unit tests covering core session, blocklist, and unfocus logic
- CI pipeline (Oxlint, Oxfmt, Vitest) on every pull request

---

## Known Bugs & Issues

The following are known limitations at the time of the v1.1 release. 


| Issue                           | Affected area                | Description                                                                                                                                                                                                            |
| ------------------------------- | ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **LinkedIn blur inconsistency** | LinkedIn                     | Blurring on some LinkedIn can sometimes be inconsistent as the page loads content dynamically after the content script runs. Also as the DOM changes it can break our script to isolate specific DOM elements to blur. |
| **Site DOM changes**            | All blur scripts             | YouTube, LinkedIn, Gmail, and other sites update their page structure over time. As these DOM elements change they can break element targetting scripts we have.                                                       |
| **Chrome API layer untested**   | Background / content scripts | Unit tests cover pure logic in `src/lib/` only. Alarms, storage listeners, and message handlers are validated manually — not via automated tests.                                                                      |


### Not bugs — expected behaviour

- **Blocklist is locked during a focus session** — users cannot edit the blocklist while a work phase is active.
- **Settings blocked during an unfocus session** — blur/blocklist settings cannot be opened while an intention-based unfocus session is active on the current site.

---

#### Known limitations

- Gmail blur timing inconsistencies on slow page loads
- Blurring of websites can breka overtime as DOM elements are updated
- Potentially a close button can be added on intention popup with might help less focused individuals
- Testing can be further developed into more edgecases like having multiple focus sessions open

