# Touch targets: the steps on an iPad

Feedback: the rounds are small and hard to touch on iPads. Measured first, then a sizing policy, then the same measurements again.

## What an iPad showed before the change

rounds.studio master `03cf9df`, Chrome with iPad device metrics (touch, 2x), the round's creator looking at their own rings. Everything in screen points (1 pt = 1 CSS px on the iPad). Apple asks for 44 x 44 pt targets, kept apart.

| iPad (viewport) | rings | zoom | dot, also the hit area | dots apart along the ring | rings apart |
|---|---|---|---|---|---|
| 10.9" Safari, landscape (1180 x 716) | 3 | 0.339 | 16.3 pt | 67.8 pt | 43.5 pt |
| 10.9" Safari | 5 | 0.260 | 12.5 pt | 51.8 pt | 33.3 pt |
| 10.9" Safari | 8 | 0.192 | 9.2 pt | 38.3 pt | 24.6 pt |
| mini Safari (1133 x 640) | 3 | 0.294 | 14.1 pt | 58.7 pt | 37.6 pt |
| Pro 13" Safari (1376 x 930) | 3 | 0.468 | 22.4 pt | 93.4 pt | 59.9 pt |
| 10.9" as a home-screen app (1180 x 820) | 3 | 0.402 | 19.3 pt | 80.2 pt | 51.4 pt |

The round is drawn at the design's size (48 px dots, rings 128 px apart) and zoomed to fit between the 64 pt header and the 68 pt bottom bar: 584 pt on a 10.9" iPad in Safari. Rings apart is fixed by that: with N rings it is 128 x zoom, and nothing short of hiding the header or the bottom bar changes it. The middle of the round cannot shrink either: the presets reach 432 px from the centre and the innermost ring's band starts at 486 px. So the levers are the dot and, above all, the hit area.

Before: `before-3-rings.png`, `before-5-rings.png`, `before-8-rings.png`; the numbers for every viewport in `before-measurements.json`.

## The policy (`src/components/play/touchTargets.js`)

- **The dot** is 72 px instead of 48 px, made smaller only where dots would come within 8 pt of each other (a 32-step ring in a big round), never below 24 px.
- **The hit area** of a step is an invisible ellipse laid along the ring: 44 pt along the arc and 44 pt across it, each cut back so that neighbouring hit areas, on the same ring and on the rings either side, stay 8 pt apart. It is never smaller than the dot. On a fine pointer it is exactly the dot.
- **Forgiving tap, precise hold.** A tap anywhere on the hit area toggles the step. A hold on the dot edits the step (velocity and probability), as before. A hold on the rest of the hit area is a hold on the ring: it opens the round's settings and does not toggle the step, so "long press a round to edit" still works on a ring whose band is now mostly covered by hit areas.
- **The rail** (the band a round's dots sit on) is 76 px instead of 52: as wide as a dot with its stroke, which is the Figma's own relation (52 for 48 px dots). A first cut left the rail at 52 and the dots overflowed it; the tabs grow out of whichever reaches further, the rail or the dots.
- The layout is otherwise unchanged; the whole round still fits. (Rotating an iPad now refits the round: the resize handler wrote `containerheight` and never updated the height.)

## The same iPad after the change

Production build of the branch, same emulation. `touch-3-rings.png` and the `-hits` variants (loaded with `?hits`, which paints the hit areas) show what the numbers describe; `touch-3-rings-tabs-crop.png` is the tabs on the wider rail with the dots inside it.

| 10.9" Safari, landscape | rings | dot | hit area, along x across | clear between hit areas along / across |
|---|---|---|---|---|
| 16-step rings | 3 | 24.1 pt (was 16.3) | 44.0 x 34.8 pt (was 16.3 x 16.3) | 22.8 / 8.0 pt |
| 16-step rings | 5 | 18.5 pt (was 12.5) | 43.6 x 24.9 pt (was 12.5 x 12.5) | 7.7 / 8.0 pt |
| 16-step rings | 8 | 13.7 pt (was 9.2) | 30.3 x 16.4 pt (was 9.2 x 9.2) | 8.0 / 8.0 pt |
| a 32-step ring, in the 8-ring round | 8 | 11.1 pt | 11.1 x 16.4 pt | 7.8 / 8.0 pt |

The wider rail costs 12 px of radius, so the zooms are 1% smaller than before (0.335, 0.257, 0.190). Eight rings on a 10.9" iPad are a geometric limit: the rings are 24.4 pt apart and no hit area can be taller than that minus the clearance. Pinch-zoom is the answer there, as it always was.

Desktop, 1440 x 900 with a mouse (`desktop-1440x900.png`, `-hits.png`): dots 32 px, hit area 32 x 32 px, a click 8 px past the dot's edge does nothing.

## Taps, holds and swipes

`report.json`, Chrome with touch emulation, the 5-ring round, a dot on the innermost ring:

| synthetic touch | toggled | expected |
|---|---|---|
| tap on the dot | yes | yes |
| tap 19 pt along the ring, inside the hit area | yes | yes |
| tap 10 pt out across the ring, inside | yes | yes |
| tap 28 pt along the ring, past the edge | no | no |
| tap 16 pt out, between the rings | no | no |
| tap 9 pt along: the old dot's edge would have missed | yes | yes |
| hold beside the dot | no; the round's settings open | no; settings |
| hold on the dot | the step's modal opens | modal |

The same taps on Playwright's WebKit (`webkit-report.json`): all as expected except the gutter, see below.

**What the browsers add.** Measured outward from an outermost ring's dot, where nothing else is near: Chrome sends a touch to a hit area up to 10 pt past its edge, WebKit up to 8 pt (`report.json`, `webkit-report.json`). So the 8 pt gutter between two rings is not a dead zone: a tap in it lands on the nearer ring (a sweep of taps midway between rings toggled the nearest step whenever one was at that angle, in both engines). The ellipse is what a tap always reaches; the browsers' own snapping fills the gutter, nearest wins.

## Video, with sound

`touch-targets.mp4` (33 s), iPad 10.9" viewport with the hit areas painted: play; taps 18 pt beside the snare dots and 10 pt inside the hat dots add hits you can hear; a tap between two rings does nothing; a hold beside a dot opens the round's settings without toggling it; a hold on a lit dot opens the step's velocity and probability and a drag softens it; a swipe along the hat ring paints the steps; then the hit areas hidden, and stop. `contact-sheet.png` has six frames of it.

## Tests

`touchTargets.test.js` (17): the rail as wide as a dot with its stroke, the fit zoom at the measured values, the dot's size and its floor, the hit area's 44 pt target and 8 pt clearances, the ellipse test along the ring and round it, the hold-on-the-dot slack, the pointer policy. `PlayUI.test.jsx` (+5): the fit zoom, the nearest editable ring and the presets as bounds, the ring's edge and the gap between rings with 72 px dots, a collaborator's ring unchanged. `roundTab.test.js` (+2): the tab on the dots' edge when they reach past the rail, the same tab otherwise. Whole suite green, lint clean.
