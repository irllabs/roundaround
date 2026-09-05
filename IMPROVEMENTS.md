# Improvement checklist

Living checklist from the September 2026 code review of Round Around. Each item links to the code it
concerns and records what was done. Update the status when an item lands (`[x]`), is partly done
(`[~]`), or needs a person to act outside the repo (`[!]`). The full review with evidence and
reasoning is published at https://claude.ai/code/artifact/b0944e40-a61a-4421-bdbb-a8014e6e675a.

Legend: `[ ]` open · `[~]` partly done · `[x]` done · `[!]` needs a human (credentials, console access)

## P0: must do now

### Credentials and access

- [~] **1. Bitly API token in the client bundle** (`src/components/dialogs/ShareDialog.js:86-87`)
  - [!] Revoke the token in the Bitly account (it has been public since Feb 2021).
  - [x] Remove it from the client; shorten via an authenticated Cloud Function or drop shortening. (`b1ba1f2`, `3422b56`)
  - [!] Purge from git history (`git filter-repo --replace-text`) before sharing the repo further.
- [~] **2. Test account password committed** (`cypress/support/users.js:3-6`)
  - [!] Change the password for `roundabout-test@protonmail.com`.
  - [x] Read credentials from `CYPRESS_TEST_EMAIL` / `CYPRESS_TEST_PASSWORD` (`b1ba1f2`). [!] Add them as GitHub Actions secrets.
- [x] **3. `getJaasToken` mints moderator tokens for anyone** (`functions/index.js:7-45`)
  - [x] Require `request.auth`, derive identity server-side, scope `room` to the round id, moderator only for the round owner, 1 h expiry. (`3422b56`)
- [~] **4. Firestore and Storage rules are not in the repo** (`firebase.json`)
  - [x] Add `firestore.rules` + `storage.rules`, wire them in `firebase.json`. (`ee61d71`)
  - [!] Compare with the live rules in the Firebase console before deploying; run the emulator tests.

### A toolchain that no longer runs

- [x] **5. Build only works on end-of-life Node** (`package.json`, react-scripts 4 / webpack 4, `ERR_OSSL_EVP_UNSUPPORTED` on Node 17+)
  - [x] Migrate to Vite + `@vitejs/plugin-react` (`0b5e701`); `.nvmrc` (22) and `engines` (`a9b3a6e`).
  - [x] Keep lint working without react-scripts (eslint 8 + eslint-config-react-app). (`0b5e701`)
- [x] **6. Cloud Function targets the decommissioned Node 10 runtime** (`functions/package.json`)
  - [x] Node 22, `firebase-functions` 7, `firebase-admin` 14, `jsonwebtoken` 9. (`3422b56`)
  - [x] Load the JaaS private key from Secret Manager instead of a file copied by hand. [!] Run `firebase functions:secrets:set JAAS_PRIVATE_KEY` and `BITLY_TOKEN`, then deploy.
- [x] **7. CI cannot run** (`.github/workflows/*.yml`)
  - [x] `ubuntu-latest`, `actions/checkout@v4`, `actions/setup-node@v4` (reads `.nvmrc`), `cypress-io/github-action@v6`. (`a9b3a6e`)
  - [x] Set `CYPRESS_BASE_URL` through `env:` (the `run: VAR=...` steps never set anything).
  - [x] Run Cypress against a preview server, not the live dev site.
- [~] **8. Firebase SDK v8, imported whole** (`src/firebase/firebase.js:1-6`)
  - [~] Step 1: the whole-SDK `import firebase from 'firebase'` is gone (per-product imports, `7f7ed7a`); the package upgrade itself is still open.
  - [ ] Step 2: full modular API migration.

### Broken features and correctness

- [ ] **9. Custom-sound recorder is unreachable dead code with missing assets** (`LayerCustomSounds.js`, `AudioRecorder.js:8-14`, `public/opus-media-recorder` removed in `46ae7f3`)
  - [ ] Decide: restore with native `MediaRecorder`, or delete the six dead files and `opus-media-recorder`, `react-dropzone`, `array-move`, and `public/samples/Metal` (its instrument is never registered).
- [~] **10. Voice chat cannot connect** (`JitsiComponent.js:59-66` tenant `ed842ad0…` vs `functions/index.js:14,37` tenant `6e18748a…`; `firebase.js:103-106` passes four positional args to `httpsCallable`)
  - [x] Single source of truth for the tenant (function returns it), pass `{ roundId }`, real display name. (`3422b56`)
  - [!] Confirm which JaaS tenant is the live one and set it as the function parameter.
- [x] **11. Round and userPatterns listeners are never unsubscribed** (`PlayRoute.js:131,193` vs `221-229`)
  - [x] Keep every unsubscribe function; call all of them on unmount; honour `isDisposing` everywhere. (`7f7ed7a`, tested in `PlayRoute.test.js`)
- [x] **12. A missing sample or a Firestore error leaves an endless spinner** (`InstrumentBaseClass.js:57-77`, `firebase.js` promise wrappers, no error boundary)
  - [x] `onerror` + timeout on sample load; wrappers that throw; visible error state; error boundary around the router. (`7f7ed7a`)
- [~] **13. Joining a round is a read-modify-write race; nobody ever leaves** (`PlayRoute.js:89-103`)
  - [x] `arrayUnion` on join (`7f7ed7a`).
  - [ ] Leaving is deliberately not implemented yet: `currentUsers` doubles as the list of contributors whose colours the layers need, so removing a user on leave would break their layers' colours. Needs a separate contributors list first.

## P1: should do next

- [x] **14.** (`5d43802`) Sliders can write gain/offset to the wrong layer (stale `useCallback(_.throttle)` closures; `VolumeSlider.js:33-40`, `LayerPercentOffset.js:84-102`). Key `VolumePopup`/`LayerPopup` by `selectedLayer.id` or pass ids.
- [x] **15.** (`5d43802`) Changing the step count is not persisted; the old layer object is written (`LayerPopup.js:87-91`).
- [x] **16.** (`5d43802`) Enter in the guest name field submits the form natively and reloads the page (`SignInDialog.js:289-299`).
- [x] **17.** (`5d43802`) Renaming a round you did not create throws (`RenameDialog.js:23-25`).
- [x] **18.** (`5d43802`) "Duplicate" from the title menu leaves the app pointed at two rounds; deleting the open round strands the user (`ProjectName.js:65-72`, `DeleteRoundDialog.js:24-26`).
- [x] **19.** (`5d43802`) Header "More" menu crashes when no round is loaded (`Header.js:172-187`, `TempoSlider.js:31`); tempo slider ignores remote changes.
- [ ] **20.** Every step toggle = 2 full document writes + full SVG redraw + full round refetch on each collaborator (`PlayUI.js:1205-1218`, `PlayRoute.js:284-304`). Apply `docChanges()` payloads, save presets only when changed, redraw the touched layer.
- [ ] **21.** Redux store objects mutated in place (`PlayUI.js:1429,1505,1633,1732-1739`). Redux Toolkit + Immer.
- [ ] **22.** Effects sidebar writes all six effects back to Firestore on mount; thumbs ignore remote changes (`EffectThumbControl.js:63-83`).
- [ ] **23.** "Solo" inverts each other layer's mute instead of muting the others, and writes other users' layers (`LayerSettings.js:600-613`).
- [x] **24.** (`7f7ed7a`) `deleteRound` orphans `userBuses` and `userPatterns` (`firebase.js:242-250`).
- [ ] **25.** Two code paths create the user document with different shapes (`Header.js:95-105`, `SignInDialog.js:129-187`); emails copied into a collection all collaborators read.
- [ ] **26.** Window-level click handler calls `preventDefault` on every click in the play view (`LayerSettings.js:542-544`).
- [x] **27.** (`7f7ed7a`) Audio-context unlock listens for `touchstart` only (`PlayRoute.js:307-316`).
- [ ] **28.** No keyboard path or ARIA on the sequencer (`PlayUI.js:1303`, unused `KEY_MAPPINGS`); icon-only buttons and hidden-but-focusable popups across the widgets.
- [ ] **29.** Automation layers play one bar and stop (`Automation.js:35-45`); `FX.create` never settles on an unknown name and the FX registry leaks (`FX.js:13-36`).
- [~] **30.** Fullscreen cannot be exited on Safari (fixed, `5d43802`); Google sign-in still uses `signInWithPopup` (`SignInDialog.js:84-112`).
- [x] **31.** (`5d43802`) Orientation detection uses `window.orientation`; `OrientationDialog` is never mounted and could not close (`PlayUI.js:1284`, `OrientationDialog.js:7-10`).
- [ ] **32.** Timing hacks in the audio graph: 3 s effect bypass, 300 ms volume/mute (`Track.js:40-47,292-310`).
- [ ] **33.** No error reporting; analytics `measurementId` configured but never started.
- [~] **34.** Zero unit tests: now 30 Jest/Testing Library tests (`yarn test`) covering the data layer, sample loading, PlayRoute subscriptions, the dialogs and the slider regression; CI runs them. The Cypress smoke test now runs against a local build in CI. Coverage of PlayUI and the audio graph is still zero.

## P2: cleanup

- [ ] **35.** Dead code: `HeaderOld`, `PlayButton`, `SwingSlider`, `OrientationDialog`, `PatternsSidebar` + `PatternThumbControl` + `PatternSequencer`, `LayerAutomation`, `LayerCustomSounds` (+ `VUMeter`, `AudioRecorder`), `LayerName`, `LayerNumberOfSteps`, `LayerTimeOffset`, `LayerType`, `instruments/Metal` + `samples/Metal`, 14 unused SVG icons, `public/distortion.svg`, `.babelrc`, hammer.js leftovers (`PlayUI.js:1184-1188`), `layerGrahpics` typo (`PlayUI.js:550`).
- [x] **36.** (`d004a35`) `public/samples-old` (43 MB, unreferenced) is uploaded on every deploy; the build folder is 61 MB.
- [ ] **37.** 129 `console.log` calls including `console.time` on the hot path (`AudioEngine.js:76-88`).
- [x] **38.** (`0b5e701`) `package.json` drift: unused `react-sortable-hoc`, `sfz-parser`, `copy-webpack-plugin`, `@tonaljs/tonal`; undeclared `prop-types`, `@tonaljs/note`; testing-library in `dependencies`.
- [~] **39.** Loose ends: `manifest.json` says "Create React App Sample" (fixed, `d004a35`); landing copy promises a native iOS app; `getRoundsList` calls `limitToLast()` with no argument; `document.execCommand('copy')`; marketing video served with Storage download tokens.
- [ ] **40.** Cache policy for `/samples/**` (18 MB of WAV, default one-hour cache) in `firebase.json`.
- [ ] **41.** Eight near-identical FX classes and five identical instrument classes; `AutoWah.Q` / `Freeverb.roomSize` setters assign to read-only signals.

## Upgrade map

| Package | Installed | Target | Notes |
| --- | --- | --- | --- |
| Node | 14.17 | 22 LTS | `.nvmrc` + `engines` |
| react-scripts | 4.0.1 | Vite 7 + plugin-react | done: Vite 7.3, plugin-react 5.2, Vitest 3.2 |
| react / react-dom | 17.0.2 | 19 | after MUI |
| @material-ui/core, icons | 4.12.4 | @mui/material 7 | largest UI diff (38 files) |
| react-router-dom | 5.3.4 | 7 | `Switch` → `Routes`; fixes path-to-regexp advisory |
| firebase | 8.10.1 | 12 (compat first, then modular) | see item 8 |
| firebase-functions / admin | 3.13 / 9.4 | 6 / 13 | required for Node 22 runtime |
| jsonwebtoken | 8.5.1 | 9 | advisories fixed in 9.0 |
| tone | 14.7.77 | 15 | `getTransport()`, `getDraw()` |
| redux + immutability-helper | 4.0.5 / 3.1.1 | @reduxjs/toolkit 2 | fixes in-place mutation |
| react-sortable-hoc | 1.11.0 | remove | done |
| opus-media-recorder | 0.8.0 | native MediaRecorder or remove | see item 9 |
| react-loader-spinner | 4.0.0 | 6 or CSS | one usage |
| web-vitals | 0.2.4 | 5 | `getFID` no longer exists |
| cypress | 8.7.0 | 14+ | `cypress.config.js`, `e2e/` |
| husky | 7.0.4 | 9 | drop pre-push Cypress run |
| GitHub Actions | checkout@v2, cypress@v2, ubuntu-20.04 | checkout@v4, setup-node@v4, cypress@v6, ubuntu-latest | see item 7 |

## Suggested order

1. Items 1-2: rotate credentials, remove them from code, scrub history. Hours.
2. Items 3-4: rules in the repo, auth check on the token function. One day.
3. Items 5-7: Vite, Node 22, working CI and deploys. One to two days.
4. Items 8, 11-13: Firebase upgrade and the collaboration bugs together (same files). Two to three days.
5. Items 9-10: decide on recording and voice chat; fix or remove. One day.
6. Items 14-19 (small bugs), then the rest of P1, then MUI 7 / React 19 / Redux Toolkit last.

## Change log

| Date | Commit | Items | Notes |
| --- | --- | --- | --- |
| 2026-09-05 | `fbfed63` | — | Checklist created from the review. |
| 2026-09-05 | `b1ba1f2` | 1, 2 | Bitly token and test password removed from code; share dialog uses a callable with full-URL fallback. |
| 2026-09-05 | `3422b56` | 3, 6, 10 | Cloud Functions on Node 22 / firebase-functions 7; auth-checked, round-scoped JaaS tokens; server-side shortener; tests. |
| 2026-09-05 | `a9b3a6e` | 7 | CI workflows repaired; Node 22 pinned via `.nvmrc` and `engines`; `yarn lint` script. |
| 2026-09-05 | `ee61d71` | 4 | Firestore and Storage rules, index, emulator config in the repo (compare with live rules before deploying). |
| 2026-09-05 | `7f7ed7a` | 8 (part), 11, 12, 13 (part), 24, 27 | Data layer rejects instead of hanging; sample-load errors and timeout; listener cleanup; error boundary; arrayUnion join; tests. |
| 2026-09-05 | `5d43802` | 14-19, 30 (part), 31 | Slider/step-count persistence, form submission, rename/delete/duplicate flows, header null-round guards, orientation dialog; dialog tests. |
| 2026-09-05 | `7fc2168` | — | Restored `arraymove` after the helpers move (caught by the build). |
| 2026-09-05 | `0b5e701` | 5, 38 | Vite 7 build, Vitest, eslint 8; .jsx renames; unused packages removed; CI without the OpenSSL workaround. |
| 2026-09-05 | `d004a35` | 36, 39 (part) | Removed `public/samples-old` and `distortion.svg`; manifest named. |
