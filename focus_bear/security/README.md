# Extension security evidence (ST4S)

## Vulnerability scanning (AP1#)

`.github/workflows/security-scan.yml` runs when a release is published or a `v*` tag is pushed, at 02:00 UTC on the
1st of every month, and on demand ("Run workflow").

| Check | What it covers |
|---|---|
| `npm audit` | Known vulnerabilities in the npm dependency tree. |
| OSV-Scanner | `package-lock.json` against the OSV database (GitHub, npm and other advisories). |
| Semgrep `p/javascript`, `p/typescript`, `p/secrets` | The source and the built `dist/` bundle that ships to the stores. |
| `scripts/check-permissions.js` | Every requested permission has a justification (BE3). |

Reports are uploaded as run artifacts and kept for 90 days. **Before each store submission, run the workflow and
save that run's artifacts in the ST4S evidence pack**, so the release-time scan outlives artifact retention. High or
critical npm advisories and error-level Semgrep findings open, or comment on, the issue titled "Security scan: high
or critical findings".

## Permission justifications (BE2, BE3)

`permission-justifications.json` explains each permission, host permission and broad content-script match.
`npm run check:permissions` (also run by the unit tests and the scan) fails if the manifests request something
that isn't justified there, or if a justification is left for something no longer requested.

`activeTab` and `scripting` were removed in this change because no code used them.

## School-managed policy

The extension makes no network requests of its own. It keeps the student's settings on the device and talks only to
the installed Focus Bear desktop app over native messaging. It sends nothing to Focus Bear's servers or to any AI
service, so the school feature policy (backend#2728) has nothing to lock here. AI relevance checks run in the
desktop apps, which honour the policy themselves. Any future feature that calls the Focus Bear API or an AI service
must first read `GET /school-feature-policy/me` and stay off for a locked student.
