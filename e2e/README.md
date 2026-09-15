# The Playwright suite

End-to-end tests for the app's interface: the round canvas, the transport, the steps, the
patterns, the layer bar, and the routes around them. They run against a real build of the app in a
real browser, with an in-memory Firebase underneath, so a run needs no account, no network and no
live project.

```
yarn test:e2e                 # the whole suite
yarn test:e2e --headed        # watch it
yarn test:e2e:ui              # Playwright's runner, for writing tests
yarn test:e2e steps.spec.js   # one spec
yarn test:e2e:report          # the last run's HTML report
```

The first run on a new machine needs the browser: `npx playwright install chromium`. Where that
download is blocked, `E2E_CHANNEL=chrome yarn test:e2e` uses the Chrome already installed.

## How a test gets a round

`vite build --mode e2e` swaps `src/firebase/firebase.js` for `src/firebase/testDouble.js`, an
in-memory implementation of the same wrapper (see the plugin in `vite.config.js`). The double reads
`window.__ROUNDS_TEST_SEED__`, which the fixture sets before any app code runs, so each test starts
signed in, with the round it asked for and no one else's data in the way.

`vite build` -- the mode the deploy uses -- never imports the double. The production bundle is
checked for it in the same breath as the build, and carries neither the file nor its seed key.

The default seed is one user and one round: 16 kicks with a hit on every beat, 8 snares on the
backbeat, and an empty 16-step hat ring to switch steps on in. Ids are fixed (`kicks-s0`,
`snares-s2`), so a spec addresses a step directly. To change the world a test wakes up in:

```js
import { seed, round, layer } from '../fixtures/seed.js'

test.use({ seedData: seed({ rounds: [round({ bpm: 92 })] }) })
```

## What a test can reach

The `app` fixture wraps the running app:

| | |
|---|---|
| `openRound()` | opens the seeded round and waits for the canvas |
| `selectLayer(id)` | picks a layer through the mixer, which is what opens the layer bar's controls |
| `storedRound()`, `storedLayer(id)`, `stepIsOn(layerId, stepId)` | what the double actually holds, for checking a change was persisted and not only drawn |
| `firebaseCalls(name)` | every call the app made into Firebase, in order |
| `isPlaying()`, `positionBars()`, `engineName()` | the audio engine |
| `playheadVisible()`, `playheadDegrees()` | the playhead |
| `metronomeOn()` | the metronome's click |

The `pageErrors` fixture collects console errors and uncaught exceptions, so a spec can assert a
run produced none.

## Selectors

The canvas is drawn with SVG.js rather than React, so most of it is addressed by attribute:

| | |
|---|---|
| `#round > svg` | the canvas itself (the direct child: the round is full of nested `svg`s) |
| `[data-step="<id>"]` | a step's dot, with `data-step-on` and `data-step-layer` on it |
| `[data-step-hit="<id>"]` | the invisible ellipse a finger lands on: what a test clicks |
| `[data-layer="<id>"]` | a layer's ring |
| `[aria-label="Play"]` / `[aria-label="Stop"]` | the transport |
| `#tempo-button` | the tempo pill, which is also the metronome's switch (`aria-pressed`) |
| `#playhead` | the playhead |
| `[id="0_pattern_clickable_button"]` | a pattern preset (an id that starts with a digit is not a valid `#` selector) |
| `#clickable-switch`, `#sequence-cickable-button` | the sequence switch and the record button (the record button keeps that id whether it shows Sequence or Stop; the spelling is the app's) |
| `[data-effect="delay"]` | an effect in the sidebar, with a `role="switch"` inside carrying `aria-checked` and `data-on` |

The layer bar's popups carry `data-test` (`mixer-popup`, `layer-popup`, `volume-popup`) and are
hidden by class, so assert `data-open` rather than visibility when checking one has closed.

## Two things to know about the app

- **The layer bar needs a selected layer.** Without one it shows only "Add a layer" and the mixer.
  `app.selectLayer(id)` goes through the mixer because a ring is a circle with no fill, and the
  middle of its bounding box is the middle of the round rather than the ring.
- **The step modal only opens on a step that is already on**, after a press of about half a second.
  A press on the ring beside the dot opens the layer's settings instead.
- **The effects switches are dragged, not clicked.** The thumb is drawn with SVG.js, so a test
  operates the switch with the keyboard (`Enter`) rather than simulating a drag. Space works too,
  and the switch stops the key from reaching PlayUI's window listener, which would otherwise start
  the round.

## Where this sits next to the other suites

- `yarn test` -- Vitest, the units: reducers, the audio engine, the geometry.
- `yarn test:e2e` -- this suite, the interface, hermetic.
- `yarn cypress:run` -- one smoke test against the real Firebase project, which is the only thing
  that checks sign-in and the live rules still work.
