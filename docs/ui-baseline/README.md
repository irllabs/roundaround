# UI baseline

Twenty-two reference screenshots of the app, the two scripts that take them and compare
against them, and a third that checks the behaviour a screenshot cannot hold still. The
shadcn migration is supposed to be invisible, so this is how we prove it: capture the same
twenty-two screens again and count the pixels that moved.

Eighteen screens are 1300x900. `13-round-mobile` and `20`-`22` are a 390x844 phone viewport
at device pixel ratio 2, so those four files are 780x1688.

| screen | what it shows |
| --- | --- |
| `01-landing` | the landing page, signed out |
| `02-signin-choice` | the sign in dialog, on its first step |
| `03-signin-email` | the same dialog on its email step |
| `04-signin-guest` | the guest step, with a name typed in |
| `05-round` | a fresh round, as it renders on arrival, effects sidebar open |
| `06-effects-sidebar` | the same round with the effects sidebar minimized by its chevron |
| `07-mixer-popup` | the mixer popup, opened from the bottom bar |
| `08-bottom-bar-click` | a layer picked in the mixer, so the bottom bar shows that layer's controls |
| `09-header-menu` | the header's More options menu, with the tempo slider |
| `10-share-dialog` | the share dialog |
| `11-avatar-menu` | the avatar menu, with the colour picker and Sign out |
| `12-rounds-list` | the rounds list |
| `13-round-mobile` | the same round at phone size |
| `14-layer-popup` | the layer popup off the steps pill: the steps counter and the offset slider |
| `15-layer-offset-ms` | the same popup with the offset switched from percent to milliseconds |
| `16-instrument-popup` | the instrument popup off the instrument summary: Instrument and Sound |
| `17-instrument-list` | the instrument list inside it, with the layer's own instrument ticked |
| `18-volume-popup` | the volume popup off the bar's volume button, with solo and mute |
| `19-effects-on` | the first effect switched on, so the sidebar shows a thumb in each state |
| `20-hamburger-popup` | the hamburger popup at phone size, which replaces the add-layer pair |
| `21-mixer-popup-mobile` | the mixer popup at phone size, opened from that popup |
| `22-delete-clear-popup` | the delete/clear popup at phone size, off the ellipsis button |

## Capturing and comparing

`capture.py` needs python3 with websocket-client, plus Google Chrome at
`/Applications/Google Chrome.app`. `compare.py` needs python3 with Pillow. Both can be
run from any directory.

```sh
# re-take the baseline itself
python3 docs/ui-baseline/capture.py --base https://rounds.studio --out docs/ui-baseline

# take a candidate and measure it against the baseline
python3 docs/ui-baseline/capture.py --out /tmp/candidate
python3 docs/ui-baseline/compare.py /tmp/candidate
```

`capture.py` also takes `--port` (default 9336) if 9336 is busy. It launches its own
headless Chrome in a throwaway profile and kills it on the way out on every exit path,
including when a screen fails and including when Chrome itself never finishes starting up.

`compare.py` writes its `diff-<name>.png` files next to the candidate, so running it with
`docs/ui-baseline` as the candidate drops diffs into this directory. `.gitignore` here
keeps them out of the repo.

`compare.py` prints one line per screen, `05-round.png changed=0.02%`, writes a
`diff-<name>.png` next to each candidate so you can see where the change is, and exits
1 if any screen is over the threshold. The threshold is `--threshold` (default 0.5) and
the per-channel noise floor is `--tolerance` (default 24).

## Keyboard and focus

`keyboard.py` covers the half of the migration a screenshot cannot see. Material UI's Menu,
Popper and Dialog owned the focus trap, the roving arrow keys and the return of focus to
whatever opened a menu or a dialog; Radix's Popover and Dialog do not do all of that on their
own, so the app now owns it, and none of it is photographed. The script drives a served build
over the same CDP plumbing as `capture.py` -- it imports Chrome, the browser class and the
guest sign-in from it rather than copying them -- and prints one `PASS`/`FAIL` line per case,
exiting non-zero if any failed. It covers the sign-in dialog's Escape, Tab trap and focus
return, the avatar and rounds-list menus opening on Enter and walking on the arrow keys, and
the two dialogs that are opened from a menu item, Rename and Delete, handing focus back to
that menu's trigger rather than dropping it on `<body>`.

```sh
npx -y serve@14 -s build -l 3100 &
python3 docs/ui-baseline/keyboard.py --base http://localhost:3100
```

It also covers the play route PR 3 migrates: the effects sidebar's chevron, which is a `div`
with `role=button` and so owns its own Enter and Space, and the layer-settings popups, which
Escape now closes and which a Tab must not walk into. That last case is the one worth naming.
The popups are never unmounted -- a closed one sits at `top: 200%` at opacity 0 -- so until
each wrapper was given `inert`, every control inside a closed one was still in the tab order:
one Tab off the steps pill landed on the closed volume popup's slider, and Chrome scrolling it
into view scrolled the play route's root down by 303px, which nothing on the route could scroll
back. The case checks both halves, where focus went and that the root did not move.

It takes `--base` (default `http://localhost:3100`) and `--port` (default 9337, so it can run
alongside a capture). It signs in as a guest the way `capture.py` does rather than seeding a
session, so it runs against any host, `--base https://rounds.studio` included; that is how the
baseline for it was recorded.

## The 0.5% rule

**Every screen must come in under 0.5% changed pixels.** That is the acceptance rule
for a PR that is not supposed to change the look of anything. Two consecutive captures
of the same build land between 0.00% and 0.27%, so anything above 0.5% is a real
change, not anti-aliasing. The top of that range is where the random instrument names are:
`21-mixer-popup-mobile` draws three of them at device pixel ratio 2.

**A PR that changes a screen on purpose has to re-capture the baseline in the same PR**,
against the branch's own build, and the new PNGs go in the same commit as the change.
Otherwise the next PR inherits a failing baseline and nobody knows which change caused
it.

## What is pinned, and why

A guest gets a random colour and a random round, so two runs would never match on their
own. `capture.py` pins all of it:

- **The guest's colour.** A new guest is given a random one out of fifteen, and the
  avatar, the layer rings and every step circle take it. Right after the round first
  renders, the capture opens the avatar menu and clicks the first swatch, `#f44336`, so
  every run is red, then closes the menu and checks it is gone before shooting anything.
- **The share dialog's QR code and link.** Both are built from the round's id, which is a
  new uuid every run. The QR canvas is not even a constant size: the encoder picks its
  QR version from how well that particular id compresses, so it comes out either 164px or
  180px square and the whole dialog resizes around it. The capture waits for the real QR
  and the real link, checks they rendered, and then replaces them with a blank 180x180
  square and a fixed placeholder link. Everything else in that dialog, which is what the
  migration touches, stays under test.

  Be clear about what that costs: **the 180x180 QR block is painted over before the shot,
  so those pixels, 2.8% of the frame, are not under comparison at all.** Nothing inside
  the canvas is checked by the diff. What guards the region is the assertion the capture
  makes *before* it masks: it reads the canvas's laid-out size and aborts unless it is
  164x164 or 180x180, the two sizes the app produces today. So a migration that resizes
  the QR through CSS stops the capture with a message instead of being normalised away by
  the mask. If a resize is ever intended, change `QR_SIZES` in `capture.py` deliberately.
  The QR's version grows with the length of the whole share URL, so a preview channel,
  whose host name is far longer than `rounds.studio`, legitimately draws a larger square
  (212px on `roundaround-dev--pr<n>-….web.app`); only the production host is held to the
  strict pair, and any other host only has to produce a square between 100px and 400px,
  which is logged. The mask normalises it to 180px either way, which is what lets a
  preview capture be compared against the baseline at all.

- **The first effect switch.** `19-effects-on` is the only screen with an effect on. The
  capture drags the first switch's thumb across, shoots, and drags it back off before
  anything else is photographed, because the sidebar is in frame on fifteen of the other
  twenty-one screens and a switch left on would show up in every one of them.
- **The layer picked in the mixer, after screen 19.** Screens 07-19 need a layer selected and
  09-13 and 20-22 show the bottom bar with none, so the capture clicks the round's own
  background - `#round`, where `PlayUI` listens for exactly that - and asserts the empty-selection
  hint is back before it goes on. The selection lives in the store, so it outlives the trip to
  `/rounds` and would otherwise still be there when the round is re-entered at phone size.

Two things are deliberately left alone because they are small enough to live inside the
threshold: the three random instrument names on the rings, in the mixer, in the bottom bar
and in the instrument popup (worth about 0.14% on `07-mixer-popup` and 0.27% on
`21-mixer-popup-mobile`, which draws them at device pixel ratio 2), and the created-at time
under the round in the rounds list.

## What the baseline does not cover

`PlayRoute`'s load-error box is not photographed, because the capture cannot reach it.
The box needs `getRound` to reject; `/play/<unknown id>` resolves to `null`, which
redirects to `/rounds` instead of erroring (checked against production), and the only other
way in is to break Firestore's transport, which produces a different message after a long,
non-deterministic wait. It is covered by `src/components/play/PlayRoute.test.jsx` instead,
through its `findByRole('alert')` test.

## When a screen fails to appear

`capture.py` asserts every state before it shoots it, and aborts rather than photograph
the wrong screen, so a run either produces twenty-two correct files or stops with a message
naming the state that never happened. If it stops, fix the selector or the wait; do not
commit a partial capture.
