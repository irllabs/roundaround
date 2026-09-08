# shadcn migration, PR 3 (play route) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the last screens — the play route, the effects sidebar, the Jitsi controls and the whole bottom bar with its six popups — off Material UI, then delete Material UI, JSS, `react-loader-spinner` and the last inline styles, take React to 19, and clear the follow-ups PR 2 booked against this PR. No visible change on any screen.

**Architecture:** The play route has no `Popper`, no `Paper`, no `ClickAwayListener`, no `Dialog`, no `List`, no `TextField` and no `Tabs` — see **What the play route actually uses** below. Its popups are plain absolutely-positioned `Box`es that are always mounted and toggled between a positioned class and a `hidden` class (`opacity: 0; top: 200%`), with one `window` click listener in `LayerSettings` doing click-away. That pattern is kept: it is what the 0.2 s fades are, it is what `docs/ui-baseline/capture.py` reads to tell open from closed, and replacing it with Radix `Popover` would unmount the popups and change both. What changes is the styling engine: `withStyles`/`makeStyles` become one Tailwind class map (`src/components/play/layer-settings/styles.js`) threaded through the same `classes` prop the children already take, `Box` becomes `div`, `Typography` becomes an element with MUI's own type metrics spelled out, `IconButton` becomes the generated `Button` with `variant="plain"`, and MUI's two sliders become Radix `Slider` primitives the way PR 2 did for `TempoSlider`. Keyboard: `Escape` closes every popup, which MUI's version never did.

PR 2 is merged as `1ea0b7e`, so everything this plan says about its output is a fact read off that tree, not a guess: `AppDialog.jsx`'s `MUI_BUTTON`/`MUI_PRIMARY`/`MUI_SECONDARY`, `Button`'s `plain` variant and `icon-round` size, the generated `Spinner`, `TempoSlider`'s Radix `Slider` class strings (including MUI's focus halo, which PR 2's final fix wave added), and the two `revert` rules left in `src/index.css`. PR 2's follow-ups are PR 3's, and each lands in the task that owns its file: the three `MUI_*` constants move out of `AppDialog.jsx` in Task 2, and the spec's token table plus the shell's four pre-existing defects are cleared in Task 5.

**Tech Stack:** React 18.3.1 → **19** (Task 6), react-redux 9.3, Redux Toolkit 2.12, react-router-dom 5, Vite 7, Vitest 3 + jsdom, @testing-library/react 16.3 + user-event 14.6, Tailwind 4.3, shadcn 4.21 components on `radix-ui` 1.6, `cn` 0.2 (clsx + tailwind-merge, so later utilities beat earlier ones), Python 3 + Pillow + websocket-client and headless Google Chrome for the pixel gate.

**Spec:** `docs/superpowers/specs/2026-09-07-shadcn-ui-migration-design.md`
**Predecessors:** `docs/superpowers/plans/2026-09-07-shadcn-migration-pr1-foundation.md`, `docs/superpowers/plans/2026-09-07-shadcn-migration-pr2-shell.md`

## Global Constraints

- Node 22 (`.nvmrc`), yarn 1 via `corepack yarn`. After every task these pass from the repo root: `corepack yarn -s lint`, `corepack yarn -s test`, `corepack yarn -s build`. After any `package.json` change run `CYPRESS_INSTALL_BINARY=0 corepack yarn install` and commit `yarn.lock` (CI installs with `--frozen-lockfile`).
- No TypeScript: every new file is `.js`/`.jsx`.
- Files that may be changed: everything under `src/components/play/`, `src/App.jsx`, `src/index.css`, `src/index.jsx` (only if the React 19 upgrade asks for it — it should not), `src/setupTests.js`, `src/components/ui/button.jsx`, `src/components/ui/dialog.jsx`, `src/components/fields/OutlinedField.jsx`, `src/components/icons/icons.test.jsx` (+ a new fixture next to it), `src/lib/mui.js` (new, Task 2 Step 1), `docs/ui-baseline/*`, `docs/superpowers/specs/2026-09-07-shadcn-ui-migration-design.md` (its token table only, Task 5 Step 2), `package.json`/`yarn.lock`.
- PR 2's own files are in scope **only** for the follow-ups its merged body books against PR 3, and only in the step that names them. Nothing else under `src/components/header/`, `src/components/dialogs/`, `src/components/landing-page/` or `src/components/rounds-list-route/` may be touched, and no class string in any of them may change except where a step says so.
  - Task 2 Step 1: `src/components/dialogs/AppDialog.jsx` loses its three `MUI_*` exports to `src/lib/mui.js`, and the nine files that import them follow the move — `ErrorBoundary.jsx`, `landing-page/LandingPageRoute.jsx`, `rounds-list-route/RoundsListRoute.jsx`, `header/Header.jsx`, `header/ProjectName.jsx`, `dialogs/SignInDialog.jsx`, `dialogs/ShareDialog.jsx`, `dialogs/RenameDialog.jsx`, `dialogs/DeleteRoundDialog.jsx`. Import paths only.
  - Task 2 Step 3: `src/components/ErrorBoundary.jsx`'s headline gains `tracking-normal`, so it and `PlayRoute`'s error box spell MUI's `h5` the same way.
  - Task 2 Step 11: `src/components/header/Header.test.jsx` drops the Material UI `ThemeProvider` it only ever had for `JitsiComponent`.
  - Task 5 Step 11: `src/components/header/AppMenu.jsx` + `AppMenu.test.jsx` (ArrowUp on a freshly opened menu), `src/components/header/HeaderAvatar.jsx` + `HeaderAvatar.test.jsx` (the `onColorChosen` guard), `src/components/header/Header.jsx`, `src/components/rounds-list-route/RoundsListRoute.jsx` + `RoundsListRoute.test.jsx` and `src/components/dialogs/SignInDialog.jsx` (unused `connect` entries, and the duplicate `<SignInDialog />`).
- No visual change: the pixel gate in Task 6 must report **every** baseline screen (the thirteen plus the nine added in Task 1 = 22) within 0.5 % changed pixels, **or** the residual must be inspected by eye and listed in the PR body as an intended difference with its `diff-*.png`.
- Test output must be pristine (no `act()` warnings, no PropTypes warnings, no Radix warnings, no Tone banner). Every existing test keeps passing through its `data-test`/role queries.
- `docs/ui-baseline/keyboard.py` is PR 2's 24-case focus and keyboard gate. It is run against production in Task 1 to establish the baseline, and re-run after **every** task that touches the header, a menu, a dialog or the popups — Tasks 2, 3, 4, 5 and 6 — and must report every case passing. Tasks 2 and 3 add the play route's own cases to it as they add the behaviour those cases check.
- Commits: imperative subject under 72 chars, a body that says why, ending with these two lines exactly:
  `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`
  `Claude-Session: https://claude.ai/code/session_01Rb8iHgPPsGgjMsPQnrsYYd`
  Commit with `git -c user.name="Meriç Dağlı" -c user.email="mericda@gmail.com" commit ...`.
- Do not run `firebase`, `gh`, or `git push`. Do not edit `.github/`, `firebase.json`, `firestore.rules`, `functions/`, or `cypress/`.
- The two-browser collaboration check on the preview channel is the controller's, not this plan's.

## What the play route actually uses

The controller's brief expects `Popper`/`Grow`/`Paper`/`ClickAwayListener`, `TextField`, `List`/`ListItem` and possibly `Tabs` in these files. `grep -rn "Popper\|Grow\|ClickAway\|Paper\|Drawer\|Tabs\|MenuList\|MenuItem\|TextField\|FormControl\|Divider\|Modal\|Dialog" src/components/play` says otherwise. The complete Material UI surface of the play route is:

| import | where | becomes |
|---|---|---|
| `Box` (23 uses) | everywhere | `div` |
| `Typography` (24 uses) | everywhere | `p` (body1) or `span` (caption), with MUI's metrics written out |
| `IconButton` (21 uses) | everywhere | `Button` `variant="plain"` `size="icon-app"` (new size, Task 2) |
| `Button` (1) | `PlayRoute`'s error box | `Button` + `MUI_BUTTON` |
| `Slider` (2) | `VolumeSlider`, `LayerPercentOffset` | `radix-ui` `Slider` primitives, as PR 2 did for `TempoSlider` |
| `FormControl` (1) | `LayerPercentOffset` | `div` with FormControl's four rules |
| `CircularProgress` (1) | `JitsiComponent` | `Spinner` |
| `withStyles` / `makeStyles` (9 files) | everywhere | Tailwind classes; the shared ones in `layer-settings/styles.js` |
| `@material-ui/icons` `ChevronRight`, `Mic`, `MicOff`, `Call`, `CallEnd` | sidebar, Jitsi | `@/components/icons` (PR 1 copied all five) |
| `react-loader-spinner` `Puff` | `PlayRoute` | `Spinner` |

So PR 3 consumes exactly these of PR 2's output: **`MUI_BUTTON`** and **`MUI_PRIMARY`** (both moved to `@/lib/mui` in Task 2 Step 1), **`Button`'s `plain` variant**, its **`icon-round` size** — only in `JitsiComponent`, whose glyphs really are 24 px Material icons — the generated **`Spinner`**, and **`TempoSlider`'s Radix `Slider` class strings** as the pattern for the play route's own two sliders. It does **not** consume `AppDialog` itself, `AppMenu`/`AppMenuItem`, `ColorGrid`, `OutlinedField` or `Separator`. There is no `TextField` to replace: the only text input in the play route is a bare `<input readOnly>` in `LayerPopup`, and it stays bare markup — but it stops leaning on `src/index.css` and carries its own font, so the rule that carried it can go (see **Measured values**).

## Hooks that must survive, verbatim

`data-test`: `app`, `voice-chat`, `button-back-to-rounds-error`, and every hook PR 1 and PR 2 listed (`button-sign-in-out` with `signed-in`/`signed-out`, `button-sign-out`, `button-get-started`, `button-email`, `button-guest`, `input-name`, `button-name`, `input-email`, `input-password`, `button-sign-in`, `button-back-to-rounds`, `button-new-round`, `list-item-round`, `header`, `location`) — the Cypress smoke (`cypress/integration/smoke/see-a-round.spec.js`) and `capture.py` drive the whole app through them.

`aria-label` in the play route: `Fewer steps`, `More steps`, `Number of steps` (on the `<input>`), `Solo (only you hear this layer)`, `Mute`, `Offset as a percentage of a step`, `Offset in milliseconds`, `Volume` (on the slider when `hideText`). Plus `aria-pressed` on the solo, mute, percentage and ms buttons.

DOM ids in the play route: `#round` (also `class="round"`, which Cypress and `capture.py` both wait on), `#instrument-summary`, `#instrument`, `#sound`, `#instrument-<i>`, `#articulation-<i>`, `#step-count`, `#layer-offset-label`, `#jaas-container`, `#volume-slider-<layerId>`.

Structure `capture.py` reads and that must not move:

- **`LayerListPopup` is rendered before `HamburgerPopup`.** `MIXER_POPUP` finds the *first* leaf element whose text is exactly `Mixer` and walks `closest('div').parentElement` to the popup. The hamburger popup has a `Mixer` label too; only DOM order keeps the right one first.
- **The mixer popup's children are `[header, layerContainer]`, and `layerContainer`'s children are the rows.** `FIRST_LAYER_ROW` clicks `popup.children[1].children[0]`.
- **The bottom bar's buttons are `<button>` elements inside the bar's own band.** `BAR` filters `document.querySelectorAll('button')` by `width >= 40 && top > innerHeight - 120 && bottom <= innerHeight`; the add-layer and mixer buttons must stay 48 px wide and stay `<button>`.
- **The effects sidebar is the only `position: absolute` element computing to `width: 120px`** (`SIDEBAR_RIGHT`), and its minimize control is the only **`div`** that computes to 32×32, contains an `svg` and sits at `x > 1000` (`CHEVRON`). Keep it a `div`; a `<button>` there breaks the selector.
- **The empty-selection hint is the leaf text `Long Press a round to edit`** (screen 08's assertion).

## File structure

```
docs/ui-baseline/capture.py                      + 9 screens, + onscreen/offscreen/drag helpers   (Task 1)
docs/ui-baseline/1[4-9]-*.png, 2[0-2]-*.png      new baselines, captured from production          (Task 1)
docs/ui-baseline/*.png                           all thirteen re-captured                          (Task 1)
docs/ui-baseline/README.md                       22 screens, what is pinned, what is not covered   (Task 1)
docs/ui-baseline/keyboard.py                     + the sidebar chevron's cases                     (Task 2)
                                                 + the popups' Escape cases                        (Task 3)
                                                 + the AppMenu ArrowUp case                        (Task 5)
src/lib/mui.js                                   new: MUI_BUTTON/MUI_PRIMARY/MUI_SECONDARY move    (Task 2)
src/components/dialogs/AppDialog.jsx             - the three MUI_* exports (import path churn in
                                                   its nine consumers)                             (Task 2)
src/components/ErrorBoundary.jsx                 h5 gains tracking-normal, matching PlayRoute      (Task 2)
src/components/ui/button.jsx                     + size "icon-app"                                 (Task 2)
                                                 - forwardRef                                      (Task 6)
src/components/play/PlayRoute.jsx                migrated (+ PlayRoute.test.jsx: one new test)     (Task 2)
src/components/play/EffectsSidebar.jsx           migrated (+ EffectsSidebar.test.jsx, new)         (Task 2)
src/components/play/EffectThumbControl.jsx       migrated                                          (Task 2)
src/components/play/JitsiComponent.jsx           migrated (+ JitsiComponent.test.jsx, new)         (Task 2)
src/components/header/Header.test.jsx            Material UI ThemeProvider dropped                 (Task 2)
src/components/play/layer-settings/styles.js     new: the class map the popups share               (Task 3)
src/components/play/layer-settings/LayerSettings.jsx      migrated (+ LayerSettings.test.jsx, new) (Task 3)
src/components/play/layer-settings/LayerListPopup.jsx     migrated                                 (Task 3)
src/components/play/layer-settings/HamburgerPopup.jsx     migrated                                 (Task 3)
src/components/play/layer-settings/DeleteClearPopup.jsx   migrated                                 (Task 3)
src/components/play/layer-settings/LayerPopup.jsx         migrated                                 (Task 4)
src/components/play/layer-settings/LayerInstrument.jsx    migrated                                 (Task 4)
src/components/play/layer-settings/LayerPercentOffset.jsx migrated                                 (Task 4)
src/components/play/layer-settings/VolumePopup.jsx        migrated                                 (Task 4)
src/components/play/layer-settings/VolumeSlider.jsx       migrated (+ its test rewritten)          (Task 4)
src/App.jsx                                      ThemeProvider, CssBaseline and the theme deleted  (Task 5)
src/index.css                                    CssBaseline's body type moved in; two rules pruned(Task 5)
src/setupTests.js                                findDOMNode filter deleted                        (Task 5)
src/components/play/PlayUI.jsx                   two class names, no JSS (+ PlayUI.test.jsx)       (Task 5)
src/components/icons/material-paths.js           new: the twelve `d` strings as a fixture          (Task 5)
src/components/icons/icons.test.jsx              compares against the fixture, not @material-ui    (Task 5)
docs/superpowers/specs/…-shadcn-ui-migration-design.md  the token table's `type`, `--accent` and
                                                 `--border` rows reconciled with what ships        (Task 5)
src/components/header/AppMenu.jsx (+ its test)   ArrowUp on a fresh menu lands on the last item    (Task 5)
src/components/header/HeaderAvatar.jsx (+ test)  onColorChosen guards a missing state.users entry  (Task 5)
src/components/header/Header.jsx                 - two unused connect actions                      (Task 5)
src/components/rounds-list-route/RoundsListRoute.jsx (+ test)
                                                 - two unused connect actions, - the second
                                                   <SignInDialog />                                (Task 5)
src/components/dialogs/SignInDialog.jsx          - two unused connect actions, - one unused state  (Task 5)
package.json, yarn.lock                          - @material-ui/*, react-loader-spinner, prop-types(Task 5)
                                                 react 19, react-dom 19                            (Task 6)
src/components/ui/dialog.jsx                     - forwardRef on DialogOverlay                     (Task 6)
src/components/fields/OutlinedField.jsx          - forwardRef                                      (Task 6)
```

---

## Measured values

Everything in PR 2's **Measured values** section still holds and **must not be re-derived**: the theme facts (`shape.borderRadius: 32`, breakpoints `xs 0 / sm 500 / md 900 / lg 1200 / xl 1536`, the palette, `typography.button.textTransform: 'none'`), the typography table (h5 24/1.334/0em, h6 20/1.6/0.0075em, body1 16/1.5/0.00938em, body2 14/1.43/0.01071em, button 14/1.75/0.02857em, caption 12/1.66/0.03333em), `Button`/`IconButton` geometry, and the fact that `CssBaseline` sets the body's font unlayered. What follows is only what PR 3 adds.

### What PR 2 shipped, read off `1ea0b7e`

Facts about the merged tree. Every one was checked against the file named; use these names and
strings verbatim rather than deriving them again.

- `src/components/dialogs/AppDialog.jsx` exports `AppDialog` (props `open, onOpenChange, titleId, title, titleClassName, onBack, backLabel, className, children` — and **no** `...rest`), `AppDialogBody`, `AppDialogContent`, `AppDialogActions`, and three class strings. Its paper is centred by layout (`inset-0 m-auto h-fit w-fit`), focus parks on the paper on open, and the opener is captured during the render in which `open` flips true and resolved through `aria-controls` to a popover trigger when it sits inside one. PR 3 renders no dialog of its own; it consumes only the class strings, and Task 2 Step 1 moves them:
  - `MUI_BUTTON` = `h-auto min-w-16 rounded-full border-0 px-4 py-1.5 text-sm font-medium leading-[1.75] tracking-[0.02857em] shadow-none disabled:opacity-100 disabled:text-white/30` — note it already carries `border-0`.
  - `MUI_PRIMARY` = `bg-primary text-primary-foreground hover:bg-muted-foreground disabled:opacity-100 disabled:bg-white/12 disabled:text-white/30`. `hover:bg-muted-foreground` is `#AAAAAA`, MUI's `primary.dark`; **not** `hover:bg-primary/90`.
  - `MUI_SECONDARY` = `bg-secondary text-white hover:bg-[#333333] disabled:opacity-100 disabled:bg-white/12 disabled:text-white/30`.
- `src/components/ui/button.jsx`'s base class is `group/button inline-flex shrink-0 items-center justify-center rounded-lg border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 … [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4`. `variant="plain"` is `text-foreground hover:bg-white/8`; `size="icon-round"` is `size-12 rounded-full [&_svg:not([class*='size-'])]:size-6`. There is no `icon-app`; Task 2 adds it. It is still wrapped in `React.forwardRef`.
- `src/components/ui/spinner.jsx` exports `Spinner`: a `lucide-react` `Loader2Icon` carrying `data-slot="spinner" role="status" aria-label="Loading"` and `size-4 animate-spin`, merged with the caller's `className` through `cn`.
- `src/components/header/TempoSlider.jsx` is the pattern for the play route's two sliders: `import { Slider as SliderPrimitive } from 'radix-ui'`; root `relative flex h-7 w-[300px] touch-none select-none items-center`; track `relative h-0.5 w-full grow rounded-[1px] bg-white/38`; range `absolute h-full rounded-[1px] bg-white`; thumb `relative block size-3 rounded-full bg-white outline-none ring-primary/16 transition-shadow duration-150 hover:ring-8 focus-visible:ring-8 active:ring-[14px]`; `aria-labelledby` on the **thumb**, not on the root. The three `ring-*` utilities are MUI's `Slider.thumb` box-shadow halo, added by PR 2's final fix wave — Task 4 reproduces it rather than shipping a bare thumb, because MUI drew it on every slider, not just the tempo one.
- `src/components/header/AppMenu.jsx` exports `AppMenu` (props `open, onOpenChange, trigger, listId, label, align, alignOffset, sideOffset, contentClassName, listClassName, footer, children`) and `AppMenuItem` (a `forwardRef` over `<button role="menuitem" data-menu-item tabIndex={-1}>`). Radix `Popover`, roving arrow keys handled on the content, focus parked on the content on open. PR 3 renders no menu; it only fixes `AppMenu`'s ArrowUp in Task 5 Step 11.
- `src/components/header/ColorGrid.jsx` keeps the `circle-picker` class and the `title={hex}` attributes on purpose, because `capture.py` forces the guest colour through them. Nothing in PR 3 touches it.
- `src/components/fields/OutlinedField.jsx` is a `forwardRef` with the ref and `data-test` on the wrapper, `px-[13px]` on the input and a 14 px floated label. Task 6 unwraps it; nothing else in PR 3 uses it.
- `forwardRef` exists in exactly four places: `ui/button.jsx`, `ui/dialog.jsx` (`DialogOverlay`), `fields/OutlinedField.jsx` and `header/AppMenu.jsx` (`AppMenuItem`). Task 6 removes the first three and leaves the fourth.
- `react-color` is already gone from `package.json`. `react-loader-spinner` (used by `PlayRoute`), `prop-types` and `@material-ui/core`/`@material-ui/icons` are still there; Task 5 removes all four.
- `docs/ui-baseline/capture.py` has `Browser.press(x, y)`, `Browser.key(key, code, vk)` — **used**, at screen 10, to close the share dialog with Escape — a `dismiss(b)` helper that presses at (400, 32) and blurs the active element, `AVATAR_IS_SWATCH` accepting `[data-slot=avatar-fallback]` as well as `.MuiAvatar-root`, and the back-button selector `[data-test=dialog-back], .MuiDialogTitle-root button[aria-label=close]`.
- `docs/ui-baseline/keyboard.py` is new: 24 CDP cases with `--base` (default `http://localhost:3100`) and `--port` (default 9337), importing `DESKTOP`, `GUEST_NAME_TYPED`, `SET_GUEST_NAME`, `Browser`, `Failed`, `discard`, `gone` and `has` from `capture.py`. Nothing this plan adds to `capture.py` may rename or remove those eight.
- `src/index.css` no longer carries the `h1…h6, p { … revert }` shim: PR 2's Task 5b pruned it after giving `HeaderAvatar`'s `<h3>` an explicit `mb-[1em]`. Two `revert` rules remain; see below.

### Conversion rules that are easy to get wrong

1. **`theme.breakpoints.down(k)` means "below the *next* breakpoint".** With this theme's values that is: `down('xs')` → `max-sm` (< 500), `down('sm')` → `max-md` (< 900), `down('md')` → `max-lg` (< 1200). Writing `max-sm` for `down('sm')` moves three popups by 400 px.
2. **The radius scale is derived from `--radius: 8px`,** so `rounded-lg` is 8 px but `rounded-xl` is 11.2 px, `rounded-3xl` is 17.6 px, and so on. Any other radius must be arbitrary: `rounded-[4px]`, `rounded-[5px]`, `rounded-[24px]`, `rounded-[30px]`, `rounded-[32px]`, `rounded-full`.
3. **CSS `flex: N` is `N 1 0%`; Tailwind's `flex-N` is `N N 0%`.** `flex-1` happens to match (`1 1 0%`), every other number does not. Use `[flex:2]`, `[flex:3]`, `[flex:4]`, `[flex:5]`, `[flex:6]`, `[flex:7]`.
4. **`Typography` renders `<p class="MuiTypography-body1">` with `margin: 0`** for the default variant, and `<span>` for `variant="caption"`. Use `<p className="m-0 …">` (block in every context, like MUI's) and `<span>` for captions — and remember a `<span>`'s vertical margin is ignored in a block parent but honoured once it is blockified as a flex item, which is why `LayerPopup`'s `gutterBottom` does nothing and `LayerPercentOffset`'s does.
5. **Every migrated `Typography` needs `font-normal` and its tracking spelled out.** MUI's `body1` sets `fontWeight: 400` on the element itself; the generated `Button` sets `text-sm font-medium` on its whole subtree, so a label that does not say `text-base font-normal … tracking-[0.00938em]` comes out 14 px medium.
6. **The generated `Button`'s icon rule resizes the app's own SVGs.** Its base class ends in `[&_svg:not([class*='size-'])]:size-4` and `size="icon-round"` raises that to `size-6`. Every icon in `src/components/play/layer-settings/resources/` renders `<svg width={…} height={…}>` with **no `className` prop at all** (16×4 for the ellipsis, 19.2×14 for the hamburger, 18×20 for the equaliser, 13×16 for the trash), so both rules would resize all of them and no call site can opt out. Task 2 adds one `size` variant, `icon-app`, whose only content is `[&_svg:not([class*='size-'])]:size-auto`; picking a size replaces the default size's classes entirely, so `icon-app` also removes `h-8 px-2.5 gap-1.5` and leaves the geometry to the caller's own class, the way MUI's `IconButton` did.
7. **`border-0` belongs on every migrated icon button.** MUI's `ButtonBase` sets `border: 0`; the generated `Button` carries `border border-transparent`, which insets its content by 1 px under `box-sizing: border-box` and moves the label and glyph of every `justify-between` button.
8. **MUI's `IconButton` padding is invisible wherever the content is centred.** `IconButton` is `display: inline-flex; align-items: center; justify-content: center` with `padding: 12`, and its label span is `width: 100%`; a 32 px button with a 12 px padding and a centred 16 px glyph draws exactly like a 32 px button with no padding. Padding is only reproduced where the JSS sets it *and* the content is not centred (`buttonWithText`, `rectButton`, `instrumentSummary`).
9. Accepted, documented differences from the generated `Button`'s base class, none of which a settled screenshot can see: `transition-all` (MUI transitions only `background-color`), `active:not-aria-[haspopup]:translate-y-px` (a 1 px press shift; PR 2's `MUI_BUTTON` accepts the same), `whitespace-nowrap`, `select-none`, and the `focus-visible` ring, which is kept deliberately — it is an accessibility improvement and the capture never focuses a button with the mouse.

### The play route's own geometry, and where it was measured

| screen | element | measured box (frame) |
|---|---|---|
| `05-round` | the bottom bar | x 376–923 (**548 ≈ 547**), y 832–879 (**48**), `rgb(51,51,51)`, centred, 20 px off the bottom |
| `05-round` | its add-layer container | x 376–472 (**97 ≈ 96**, two 48 px buttons), `rgb(77,77,77)` |
| `05-round` | effects sidebar container | x 1180–1299 (**120**), y 307–658 (**352**), `rgb(45,45,45)` = `rgba(47,47,47,0.9)` over `#1b1b1b` |
| `05-round` | its minimize control | x 1140–1171, y 319–350 (**32 × 32**, i.e. `left: -40; top: 12`) |
| `06-effects-sidebar` | the same control, minimized | x 1260–1291 — the whole root moved `right: -120px` |
| `07-mixer-popup` | the mixer popup | x 425–923 (**499**), y 585–827 (**243**), i.e. `left: 48; top: -247` off the bar |
| `08-bottom-bar-click` | instrument summary pill | x 485–692 (**216**), y 840–871 (**32**), `rgb(71,71,71)` = white at 10 % over `#333333` |
| `08-bottom-bar-click` | steps pill | x 717–767 (**59** at the corners' chord), same 32 px band |
| `08-bottom-bar-click` | the three 32 px action buttons | centred at x 803, 851, 899 — volume, clear, delete |
| `13-round-mobile` | the bar at 390 × 844 (DPR 2) | 341 wide, 48 tall, and the empty-selection hint, **not** a selected layer |

The 10 px vertical margins on the pills overflow the 48 px bar (10 + 32 + 10 = 52) and are centred by the flex line, which is why the pills sit at y 840–871 and not 842–873. Reproduce `my-2.5`, not `py-*`.

### `EffectThumbControl`, which is SVG.js and not DOM

`container` 96 × 48 with a 24 px radius and a `rgba(255,255,255,0.1)` border; the drawing inside is a 78 × 32 background rect plus a 32 × 32 thumb rect inside a nested `<svg>` whose `x` is **46 when the switch is off and 0 when it is on**; thumb fill `#555555` off, `#686868` on, `#EAEAEA` while dragging. The switch is dragged, never clicked — `mousedown` on the thumb, `mousemove` on `document` (ignored under 3 px), and `mouseup` decides on the thumb's final `x` against a threshold of 23.

### Rules in `src/index.css` at `1ea0b7e`, and what PR 3 does to each

PR 2's Task 5b already pruned `h1, h2, h3, h4, h5, h6, p { font-size: revert; font-weight: revert; margin: revert }` — `HeaderAvatar`'s `<h3>` was its last consumer and got an explicit `mb-[1em]` instead — so **there is no heading shim left to decide about.** Two `revert` rules remain, and PR 3 takes both out rather than narrowing them: a `revert` in the base layer is invisible action at a distance, and the elements that need it are all PR 3's.

- `input:not([data-slot="input"]):not([class*="Mui"]) { font: revert }` — **goes.** Its only consumer is the steps counter in `LayerPopup`, and the `[class*="Mui"]` clause dies with Material UI. Task 4 Step 5 writes the metrics that `revert` resolves to in the Chrome the baseline is shot in straight onto that one input, as `[font:13.3333px_Arial]`, and Task 5 Step 6 deletes the rule. A utility beats preflight's `button,input,select,optgroup,textarea{font:inherit}` because preflight lives in the base layer and utilities do not. Pinning the value also makes the counter render the same in Firefox and Safari, which `revert` never did.
- `img:not([data-slot]) { max-width: revert; height: revert }` — **goes.** `grep -rn '<img' src --include=*.jsx` finds eleven, ten of which lean on it; each gets its own file's intrinsic size as two utilities, read off the SVG's `width`/`height` attributes:

  | file | intrinsic | utilities | where | step |
  |---|---|---|---|---|
  | `lock.svg`, `openLock.svg` | 12 × 16 | `h-4 w-3` | `EffectThumbControl` (2) | Task 2 Step 7 |
  | `minus.svg` | 14 × 4 | `h-1 w-[14px]` | `LayerPopup` | Task 4 Step 5 |
  | `plus.svg` | 14 × 14 | `size-[14px]` | `LayerPopup` | Task 4 Step 5 |
  | `leftArrow.svg`, `rightArrow.svg` | 8 × 14 | `h-[14px] w-2` | `LayerInstrument` (4: two of each) | Task 4 Step 7 |
  | `check.svg` | 14 × 10 | `h-[10px] w-[14px]` | `LayerInstrument` (2, both conditional) | Task 4 Step 7 |
  | `percentage.svg` | 11 × 12, drawn at 13 × 18 | `h-[18px] w-[13px]` | `LayerPercentOffset` | Task 4 Step 4 |

  `percentage.svg` already writes its size inline, so it was never affected by preflight and is only being moved from a `style` prop to classes. Task 5 Step 6 deletes the rule and Step 9's full pixel pass is what proves the other ten.
- `[data-slot="dialog-overlay"] { background-color: rgba(0,0,0,0.5); backdrop-filter: none }` — **stays.** Its reason is the generated overlay's own `bg-black/10 supports-backdrop-filter:backdrop-blur-xs`, which cannot be overridden from JSX because `DialogContent` renders its own overlay with no props. Nothing to do with `CssBaseline`.
- `[data-slot="dialog-title"] { font-family: inherit }` — **goes.** Its reason was that `CssBaseline` put a different family on the body from `--font-heading`. With `CssBaseline` gone and `--font-heading: var(--font-sans)`, the rule is a no-op (Task 5 Step 2).
- `background-color: var(--background) !important` on `body` — **loses the `!important`.** The unlayered rule it was fighting was `CssBaseline`'s (Task 5 Step 2).
- `letter-spacing: 0.01071em` on `body` — **stays**, and is joined by `font-size: 0.875rem` and `line-height: 1.43`, while `--font-sans` becomes MUI's stack. See Task 5, Step 2; this is the single largest pixel risk in the PR.
- `@custom-variant dark`, the `:root` token block, `html, body, #root, .App { height: 100% }`, `code`, and `button:not(:disabled), [role="button"]:not(:disabled) { cursor: pointer }` — **untouched.** That last one is what lets `EffectsSidebar`'s chevron keep its pointer cursor once it becomes a `[role="button"]` div (Task 2 Step 6).

---

### Task 1: Extend and re-take the UI baseline

The baseline has to be re-taken anyway — PR 2 is live on production (Step 1 proves it), so `01`–`04` and `09`–`12` all show the shadcn shell — and it has never covered the six layer-settings popups this PR rewrites. Both happen here, **before any migration change lands**, so the new screens are photographs of the Material UI implementation.

**What `capture.py` already is at `1ea0b7e`** (checked, not assumed): `Browser.press(x, y)`; `Browser.key(key, code, vk)`, **in use** at screen 10 to close the share dialog with Escape; a `dismiss(b)` helper that presses at (400, 32) and blurs; `AVATAR_IS_SWATCH` accepting `[data-slot=avatar-fallback]` as well as `.MuiAvatar-root`; the back-button click `b.click('[data-test=dialog-back], .MuiDialogTitle-root button[aria-label=close]', …)`; and `.circle-picker [title="#f44336"]` still driving the guest colour, because `ColorGrid` kept that class and those titles for it. `keyboard.py` imports `DESKTOP`, `GUEST_NAME_TYPED`, `SET_GUEST_NAME`, `Browser`, `Failed`, `discard`, `gone` and `has` from `capture.py`, so none of those eight may be renamed here.

**Files:**
- Modify: `docs/ui-baseline/capture.py`, `docs/ui-baseline/README.md`
- Replace: `docs/ui-baseline/01-landing.png` … `13-round-mobile.png`
- Create: `docs/ui-baseline/14-layer-popup.png`, `15-layer-offset-ms.png`, `16-instrument-popup.png`, `17-instrument-list.png`, `18-volume-popup.png`, `19-effects-on.png`, `20-hamburger-popup.png`, `21-mixer-popup-mobile.png`, `22-delete-clear-popup.png`

**Interfaces:**
- Produces: 22 baseline PNGs and a `capture.py` that reproduces all 22 against `--base`, from either the Material UI build or the migrated one; and a recorded `keyboard.py` pass against production.

- [ ] **Step 1: Prove production is serving the PR 2 merge before photographing it**

These screenshots are only a photograph of PR 2 if `https://rounds.studio` is running `1ea0b7e`. `.github/workflows/firebase-hosting-merge.yml` deploys every push to `master` to the `production` target, so the deploy should have happened on merge; prove it rather than assume it. Vite writes content-hashed asset names into `build/assets/`, so the name is the fingerprint:

```bash
git rev-parse HEAD                  # expected: 1ea0b7e… (this branch is one commit's worth of plan on top)
git status --short                  # expected: nothing under src/ or package.json
corepack yarn -s build
ls build/assets/index-*.js
curl -sS https://rounds.studio/ | grep -o '/assets/index-[A-Za-z0-9_-]*\.js'
```

Expected: the same `index-<hash>.js` name from both. Rollup's hash is content-derived and the lockfile and Node major are pinned (`.nvmrc` is 22, CI installs `--frozen-lockfile`), so a match is conclusive.

A mismatch is not automatically a stale deploy — a different Node minor can move the hash — so fall back to a content probe, which does not depend on the build being byte-reproducible:

```bash
asset=$(curl -sS https://rounds.studio/ | grep -o '/assets/index-[A-Za-z0-9_-]*\.js' | head -1)
curl -sS "https://rounds.studio$asset" | grep -c 'h-auto min-w-16 rounded-full'
```

Expected: at least 1. That literal is `MUI_BUTTON`, which PR 2 introduced and which survives minification because it is a string. If it is 0, production is still PR 1 and the baseline must not be taken — stop and report it. `gh` and `firebase` are out of bounds for this plan, so a stale deploy is the controller's to trigger.

- [ ] **Step 2: Add the open/closed helpers**

The layer-settings popups are never unmounted, so "open" cannot be `document.querySelector`. Add next to `has()` and `gone()`:

```python
def onscreen(selector):
    """True when the element is laid out inside the viewport.

    The layer-settings popups are never unmounted: a closed one is pushed to `top: 200%` at
    opacity 0 and an open one is placed above the bar. A rect inside the viewport therefore
    means "open" in the Material UI build this baseline is taken from and in the migrated one,
    without either build's class names.
    """
    return """(() => {
      const e = document.querySelector(%s);
      if (!e) return false;
      const r = e.getBoundingClientRect();
      return r.width > 0 && r.height > 0 && r.top >= 0 && r.bottom <= innerHeight;
    })()""" % json.dumps(selector)


def offscreen(selector):
    """True when the element is still in the DOM but pushed below the fold: a closed popup."""
    return """(() => {
      const e = document.querySelector(%s);
      if (!e) return false;
      return e.getBoundingClientRect().top >= innerHeight;
    })()""" % json.dumps(selector)
```

- [ ] **Step 3: Add the bottom-bar finders**

The existing `BAR` only sees buttons 40 px and wider, which is the add-layer and mixer pair. With a layer selected the bar also holds the 216 px instrument summary, the 59 px steps pill and three 32 px action buttons. Add below `BAR`:

```python
# Every button of the bottom bar, left to right. The band filter is what excludes the popups:
# a closed one sits at top:200%, an open one is above the bar.
BAR_ALL = """[...document.querySelectorAll('button')].filter(e => {
  const r = e.getBoundingClientRect();
  return r.width >= 24 && r.height >= 24 && r.top > innerHeight - 120 && r.bottom <= innerHeight;
}).sort((a, b) => a.getBoundingClientRect().x - b.getBoundingClientRect().x)"""

# The steps pill is the only bar button whose whole text is a number.
STEP_PILL = """(() => {
  const b = %s.find(e => /^\\d+$/.test(e.textContent.trim()));
  if (!b) return false;
  b.click();
  return true;
})()""" % BAR_ALL

# The 32px buttons at the right of the bar: volume, then clear and delete on the desktop and
# the ellipsis on the phone.
SMALL_BAR = "%s.filter(e => Math.round(e.getBoundingClientRect().width) === 32)" % BAR_ALL
```

- [ ] **Step 4: Add the effect-switch helpers and a drag**

```python
# The effect switches are SVG.js drawings, not inputs: a 78x32 background rect with a 32x32
# thumb rect inside a nested <svg> that carries the thumb's x -- 46 when the effect is off,
# 0 when it is on. They are dragged, never clicked.
THUMB_RECTS = """[...document.querySelectorAll('svg rect')].filter(r =>
  r.getAttribute('width') === '32' && r.getBoundingClientRect().x > 1000)"""
FIRST_THUMB_X = '(() => { const r = %s[0]; return r ? r.parentElement.getAttribute("x") : "missing" })()' % THUMB_RECTS
FIRST_THUMB_POINT = """(() => {
  const r = %s[0];
  if (!r) return null;
  const b = r.getBoundingClientRect();
  return { x: Math.round(b.x + b.width / 2), y: Math.round(b.y + b.height / 2) };
})()""" % THUMB_RECTS
```

and to `Browser`:

```python
    def drag(self, start, dx):
        """Press, move and release. The move is split in two because the switch ignores
        anything under 3px, and the release is what decides which side the thumb lands on."""
        self.send('Input.dispatchMouseEvent', type='mousePressed', x=start['x'], y=start['y'],
                  button='left', buttons=1, clickCount=1)
        for x in (start['x'] + dx // 2, start['x'] + dx):
            self.send('Input.dispatchMouseEvent', type='mouseMoved', x=x, y=start['y'],
                      button='left', buttons=1)
        self.send('Input.dispatchMouseEvent', type='mouseReleased', x=start['x'] + dx, y=start['y'],
                  button='left', buttons=1, clickCount=1)
```

- [ ] **Step 5: Capture the six desktop popup states, after screen 08**

Screen 08 already leaves a layer selected and every popup closed. Append after its `b.shot(out, '08-bottom-bar-click')` block:

```python
    # 14, 15: the layer popup — the steps counter and the offset slider — and its ms mode.
    b.run(STEP_PILL, 'click the steps pill')
    b.must(onscreen('#step-count'), 'the layer popup opening')
    b.shot(out, '14-layer-popup', verify=onscreen('#step-count'))
    b.click('[aria-label="Offset in milliseconds"]', 'the ms offset mode')
    b.must('document.querySelector(\'[aria-label="Offset in milliseconds"]\').getAttribute("aria-pressed") === "true"',
           'the ms offset mode being chosen')
    b.shot(out, '15-layer-offset-ms')
    b.click('[aria-label="Offset as a percentage of a step"]', 'the percentage offset mode')
    b.run(STEP_PILL, 'click the steps pill again')
    b.must(offscreen('#step-count'), 'the layer popup closing')

    # 16, 17: the instrument popup and its instrument list.
    b.click('#instrument-summary', 'the instrument summary')
    b.must(onscreen('#instrument'), 'the instrument popup opening')
    b.shot(out, '16-instrument-popup', verify=onscreen('#instrument'))
    b.click('#instrument', 'the Instrument row')
    b.must(onscreen('#instrument-0'), 'the instrument list opening')
    b.shot(out, '17-instrument-list', verify=onscreen('#instrument-0'))
    b.click('#instrument', 'the Instrument row again')
    b.must(offscreen('#instrument-0'), 'the instrument list closing')
    b.click('#instrument-summary', 'the instrument summary again')
    b.must(offscreen('#instrument'), 'the instrument popup closing')

    # 18: the volume popup, off the leftmost of the bar's three 32px buttons.
    b.must('%s.length === 3' % SMALL_BAR, 'the bar\'s three small buttons')
    b.run('%s[0].click(); true' % SMALL_BAR, 'click the volume button')
    b.must(onscreen('[aria-label="Mute"]'), 'the volume popup opening')
    b.shot(out, '18-volume-popup', verify=onscreen('[aria-label="Mute"]'))
    b.run('%s[0].click(); true' % SMALL_BAR, 'click the volume button again')
    b.must(offscreen('[aria-label="Mute"]'), 'the volume popup closing')

    # 19: the first effect switched on, then switched back off so screens 09-13 are unaffected.
    b.must('%s === "46"' % FIRST_THUMB_X, 'the first effect starting off')
    b.drag(b.js(FIRST_THUMB_POINT), -46)
    b.must('%s === "0"' % FIRST_THUMB_X, 'the first effect switching on')
    b.shot(out, '19-effects-on', verify='%s === "0"' % FIRST_THUMB_X)
    b.drag(b.js(FIRST_THUMB_POINT), 46)
    b.must('%s === "46"' % FIRST_THUMB_X, 'the first effect switching back off')
```

- [ ] **Step 6: Capture the three phone-sized popup states, after screen 13**

At 390 px the add-layer pair collapses into one hamburger button and the delete/clear pair collapses into an ellipsis popup, so these three states exist only on the phone. Append after `b.shot(out, '13-round-mobile', …)`:

```python
    # 20: the hamburger popup, which replaces the add-layer pair below 500px.
    b.must('%s.length >= 1' % BAR_ALL, 'the bottom bar at phone size')
    b.run('%s[0].click(); true' % BAR_ALL, 'click the hamburger')
    b.must(onscreen_text('Add round'), 'the hamburger popup opening')
    b.shot(out, '20-hamburger-popup', verify=onscreen_text('Add round'))

    # 21: the mixer at phone size, opened from that popup, and a layer picked in it so the bar
    # has something to show. Picking a row leaves the mixer open; its own X closes it.
    b.run(click_text('Mixer'), 'click Mixer in the hamburger popup')
    b.must("%s === '1'" % MIXER_OPACITY, 'the mixer popup opening at phone size')
    b.shot(out, '21-mixer-popup-mobile')
    b.run(FIRST_LAYER_ROW, 'click the first layer in the mixer')
    b.must("[...document.querySelectorAll('*')].every(e => e.children.length !== 0 || !/Long Press/.test(e.textContent))",
           'the bottom bar hint giving way to the layer controls')
    b.run('%s[0].click(); true' % BAR_ALL, 'click the hamburger again')
    b.run(click_text('Mixer'), 'click Mixer again')
    b.must("%s === '0'" % MIXER_OPACITY, 'the mixer popup closing')

    # 22: the delete/clear popup, off the ellipsis that replaces the two buttons below 500px.
    b.must('%s.length === 2' % SMALL_BAR, 'the volume and ellipsis buttons at phone size')
    b.run('%s[1].click(); true' % SMALL_BAR, 'click the ellipsis')
    b.must(onscreen_text('Clear'), 'the delete/clear popup opening')
    b.shot(out, '22-delete-clear-popup', verify=onscreen_text('Clear'))
```

with two more helpers next to `onscreen`:

```python
def leaf_with_text(text):
    """The first element whose entire text is `text` and which has no children of its own."""
    return ("[...document.querySelectorAll('*')].find(e => e.children.length === 0 "
            "&& e.textContent.trim() === %s)" % json.dumps(text))


def onscreen_text(text):
    return """(() => {
      const e = %s;
      if (!e) return false;
      const r = e.getBoundingClientRect();
      return r.width > 0 && r.top >= 0 && r.bottom <= innerHeight;
    })()""" % leaf_with_text(text)


def click_text(text):
    return "(() => { const e = %s; if (!e) return false; (e.closest('button') || e).click(); return true })()" % leaf_with_text(text)
```

- [ ] **Step 7: The load-error box: prove it is not reachable, and say so**

`PlayRoute`'s error box needs `getRound` to reject. `/play/<unknown id>` resolves to `null`, which redirects to `/rounds` rather than erroring, and making Firestore fail from the capture would mean blocking its transport, which produces a different message and a long, non-deterministic wait. Try `b.send('Page.navigate', url=base + 'play/ui-baseline-does-not-exist')` once by hand and confirm it lands on `/rounds`; then leave the error box out of the baseline and write that into the README (Step 10). It is covered instead by `PlayRoute.test.jsx`'s existing `findByRole('alert')` test, which Task 2 extends.

- [ ] **Step 8: Re-capture everything from production, twice, and prove it is stable**

```bash
python3 docs/ui-baseline/capture.py --base https://rounds.studio --out docs/ui-baseline --port 9401
python3 docs/ui-baseline/capture.py --base https://rounds.studio --out /tmp/pr3-baseline-check --port 9402
python3 docs/ui-baseline/compare.py /tmp/pr3-baseline-check
```

Expected: 22 files written, and every screen of the second run under 0.5 % against the first. A screen above that is not deterministic yet — the usual causes are a popup shot before its 0.2 s fade finished (raise `SETTLE` locally to check), a random instrument name (the README already tolerates ~0.15 % for those), or an effect switch that did not go back off. Fix the capture, not the threshold, and re-take both runs.

- [ ] **Step 9: Run `keyboard.py` against production, and record the number**

`docs/ui-baseline/keyboard.py` is PR 2's: 24 CDP cases over the sign-in dialog, the avatar menu, the round-name menu and the rounds-list row menu. It signs in as a guest exactly the way `capture.py` does, importing `Browser`, `SET_GUEST_NAME`, `GUEST_NAME_TYPED`, `has` and `gone` from it, so it runs against any host and not only a served build.

```bash
python3 docs/ui-baseline/keyboard.py --base https://rounds.studio --port 9408
```

Expected: every one of the 24 cases `PASS` and exit 0. This is the other half of the baseline — the half a screenshot cannot hold — and from here on every task that touches the header, a menu, a dialog or the popups re-runs it and must still get a clean sheet. Tasks 2, 3 and 5 add cases to it.

A failure here is not PR 3's to fix: it means production has drifted from what PR 2 merged. Stop and report it with the failing case names rather than changing the script.

- [ ] **Step 10: README**

Update `docs/ui-baseline/README.md`: the table grows to 22 rows with a one-line description each; the intro says "twenty-two"; `13-round-mobile` and `20`–`22` are the 390 × 844 DPR-2 shots (files 780 × 1688); a new bullet under **What is pinned** says the first effect is switched on for `19-effects-on` and dragged back off before any later screen, because the sidebar is visible on nine of them; and a new short section, **What the baseline does not cover**, names `PlayRoute`'s load-error box with the reason from Step 7 and points at `PlayRoute.test.jsx`. The **Keyboard and focus** section PR 2 wrote gains a line saying `keyboard.py` also runs against `--base https://rounds.studio` and that PR 3 grows it with the play route's popups.

- [ ] **Step 11: Commit**

```bash
git add docs/ui-baseline
git commit  # subject: "Add the layer-settings popups to the UI baseline"
```

---

### Task 2: The play route's shell, the effects sidebar and the Jitsi controls

**What is already true at `1ea0b7e`, so nothing here needs confirming:** `MUI_BUTTON`, `MUI_PRIMARY` and `MUI_SECONDARY` are exported from `src/components/dialogs/AppDialog.jsx`; `Button` has `variant="plain"` (`text-foreground hover:bg-white/8`) and `size="icon-round"` (`size-12 rounded-full [&_svg:not([class*='size-'])]:size-6`) and no `icon-app`; `Spinner` is `@/components/ui/spinner` and renders `role="status" aria-label="Loading"`; `ChevronRightIcon`, `MicIcon`, `MicOffIcon`, `CallIcon` and `CallEndIcon` are all exported from `@/components/icons` and each renders a 24 × 24 `<svg>` with `fill="currentColor"`. The exact strings are in **Measured values → What PR 2 shipped**.

**Files:**
- Create: `src/lib/mui.js`
- Modify: `src/components/dialogs/AppDialog.jsx` and its nine importers (import paths only, Step 1)
- Modify: `src/components/ui/button.jsx` (one new size)
- Modify: `src/components/ErrorBoundary.jsx`
- Modify: `src/components/play/PlayRoute.jsx`, `src/components/play/PlayRoute.test.jsx`
- Modify: `src/components/play/EffectsSidebar.jsx`, `src/components/play/EffectThumbControl.jsx`, `src/components/play/JitsiComponent.jsx`
- Modify: `src/components/header/Header.test.jsx`, `docs/ui-baseline/keyboard.py`
- Create: `src/components/play/EffectsSidebar.test.jsx`, `src/components/play/JitsiComponent.test.jsx`

**Interfaces:**
- Produces: `@/lib/mui` exporting `MUI_BUTTON`, `MUI_PRIMARY` and `MUI_SECONDARY` (the same three strings, unchanged character for character); `Button` size `icon-app`. No other API change. `PlayRoute` keeps its `connect` map, its Firebase lifecycle, `playUIRef` and `onBackToRoundsClick` verbatim; only `render()` and the imports change.

- [ ] **Step 1: Move `MUI_BUTTON`, `MUI_PRIMARY` and `MUI_SECONDARY` out of `AppDialog.jsx`**

PR 2's merged body books this as PR 3's: "`MUI_BUTTON`/`MUI_PRIMARY`/`MUI_SECONDARY` live in `dialogs/AppDialog.jsx` and are imported by routes; PR 3 moves them to a `Button` variant." It happens first, before `PlayRoute` becomes the tenth consumer, so no file in this plan ever names the old path.

They become a module, not `cva` variants. A `cva` variant would splice these strings into `buttonVariants`' own output ahead of the caller's `className`, which changes the order `cn`'s `tailwind-merge` resolves conflicts in at every one of nine existing call sites — invisible until a pixel gate catches it, and there is no reason to take that risk in a PR whose whole claim is that nothing moves. PR 2's follow-up allows either shape ("or `src/lib/mui.js`"). This takes the module.

Create `src/lib/mui.js` and move the three `export const` declarations into it **with their doc comments, verbatim** — the comments carry the derivation of every value (`getContrastText`, `primary.dark`, `action.disabled`) and are the reason nobody re-derives them:

```js
/**
 * Material UI's Button, as Tailwind class strings.
 *
 * These outlived Material UI itself: the app still draws MUI's pill, its `primary.dark` hover
 * and its `action.disabled` colour-only disabled state, and nothing generates them any more, so
 * the strings are the specification. They lived in `dialogs/AppDialog.jsx` through PR 2 because
 * that is where the dialogs needed them; they are not about dialogs.
 */
```

Then delete the three declarations from `AppDialog.jsx` (its own JSX uses none of them) and repoint the nine importers at `@/lib/mui`:

```bash
grep -rln "MUI_BUTTON\|MUI_PRIMARY\|MUI_SECONDARY" src
```

Expected, and each is an import-line change only: `components/ErrorBoundary.jsx`, `components/landing-page/LandingPageRoute.jsx`, `components/rounds-list-route/RoundsListRoute.jsx`, `components/header/Header.jsx`, `components/header/ProjectName.jsx`, `components/dialogs/SignInDialog.jsx`, `components/dialogs/ShareDialog.jsx`, `components/dialogs/RenameDialog.jsx`, `components/dialogs/DeleteRoundDialog.jsx`. `RenameDialog`, `DeleteRoundDialog`, `SignInDialog` and `ShareDialog` keep their `AppDialog`/`AppDialogBody`/`AppDialogContent`/`AppDialogActions` imports from `./AppDialog` and gain a second import line from `@/lib/mui`.

Not one class string changes, so `corepack yarn -s test` is the whole check here and no re-capture is needed.

- [ ] **Step 2: Give `Button` a size that leaves the app's own SVGs alone**

In `src/components/ui/button.jsx`, add to `variants.size`:

```js
        // The play route's buttons hold the app's own SVG resources, which carry their size in
        // width/height attributes and take no className (16x4 for the ellipsis, 19.2x14 for the
        // hamburger, 18x20 for the equaliser). Every other size forces size-4 or size-6 onto an
        // unclassed svg, which would resize all of them. This one hands the attributes back and,
        // because a chosen size replaces the default size's classes, leaves the height, padding
        // and radius to the caller, the way MUI's IconButton did.
        "icon-app": "[&_svg:not([class*='size-'])]:size-auto",
```

- [ ] **Step 3: Bring `ErrorBoundary`'s headline in line with the one `PlayRoute` is about to grow**

PR 2's final review booked this: `ErrorBoundary` renders MUI's `h5` as `mb-[0.35em] mt-0 text-2xl leading-[1.334]` and lets the headline inherit the body's `0.01071em`, where MUI's `h5` sets `letterSpacing: 0em`. Step 4 writes the same three lines into `PlayRoute`'s error box; they must be the same string, and the correct one is MUI's.

In `src/components/ErrorBoundary.jsx`, the headline becomes:

```jsx
                    <p className="m-0 mb-[0.35em] text-2xl leading-[1.334] tracking-normal">Something went wrong.</p>
```

and the paragraph below it becomes `m-0 mb-[0.35em] text-base leading-6 tracking-[0.00938em] text-white/70`, so the two files read identically. `m-0 mb-[0.35em]` and `mb-[0.35em] mt-0` compile to the same box (`p` has no horizontal default margin under preflight); writing it the same way in both is what stops the next reader from wondering which is right. No baseline screen photographs this boundary — it only renders when a descendant throws during render — so this cannot move a pixel; list it in the PR body under intended differences all the same.

- [ ] **Step 4: `PlayRoute.jsx`**

Delete `PropTypes`, `PlayRoute.propTypes`, `withStyles`, the `styles` object, and the `Box`, `Button`, `Typography` and `react-loader-spinner` imports. Import `{ Button }` from `@/components/ui/button`, `{ Spinner }` from `@/components/ui/spinner`, `{ MUI_BUTTON, MUI_PRIMARY }` from `@/lib/mui` (Step 1) and `{ cn }` from `@/lib/utils`. The export becomes `connect(mapStateToProps, { … })(PlayRoute)`.

| JSS rule | Tailwind |
|---|---|
| `root` | `relative h-full overflow-hidden` |
| `loader` | `absolute top-0 z-[9] flex h-full w-full items-center justify-center` |
| `error` | `absolute top-0 z-[9] flex h-full w-full flex-col items-center justify-center p-8 text-center` (`2rem` → `p-8`) |
| the one inline style | `relative flex w-full justify-center` |

```jsx
    render() {
        const { round } = this.props;
        const { loadError } = this.state
        return (
            <div className="relative h-full overflow-hidden">
                {!_.isNil(round) && <PlayUI childRef={ref => (this.playUIRef = ref)} />}
                {_.isNil(round) && _.isNil(loadError) &&
                    <div className="absolute top-0 z-[9] flex h-full w-full items-center justify-center">
                        <Spinner className="size-[100px] text-[#00BFFF]" />
                    </div>
                }
                {!_.isNil(loadError) &&
                    <div role="alert" className="absolute top-0 z-[9] flex h-full w-full flex-col items-center justify-center p-8 text-center">
                        <p className="m-0 mb-[0.35em] text-2xl leading-[1.334] tracking-normal">This round could not be loaded.</p>
                        <p className="m-0 mb-[0.35em] text-base leading-6 tracking-[0.00938em] text-white/70">{loadError.message || String(loadError)}</p>
                        <Button
                            type="button"
                            className={cn(MUI_BUTTON, MUI_PRIMARY)}
                            onClick={this.onBackToRoundsClick}
                            data-test="button-back-to-rounds-error"
                        >
                            Back to my rounds
                        </Button>
                    </div>
                }
                <EffectsSidebar />
                <ShareDialog />
                <OrientationDialog />
                <div className="relative flex w-full justify-center">
                    <LayerSettings playUIRef={this.playUIRef} />
                </div>
            </div>
        )
    }
```

Four notes for the commit body. `tracking-normal` on the first line is not decoration: MUI's `h5` sets `letterSpacing: 0em` and the body inherits `0.01071em`, so without it the headline tracks wider than the baseline. `text-white/70` is dark-theme `text.secondary`. `MUI_PRIMARY` rather than a hand-written `bg-primary text-primary-foreground hover:bg-primary/90`: the hand-written hover was `#EAEAEA` at 90 % over the ground, which is *lighter* than the button, where MUI's `contained primary` hover is `primary.dark` `#AAAAAA` — and `MUI_PRIMARY` also carries MUI's colour-only disabled state, which the generated `Button`'s `disabled:opacity-50` would otherwise win. `ErrorBoundary` uses the same pair (Step 3). And the spinner is a deliberate, spec-sanctioned change: `react-loader-spinner`'s `Puff` was two expanding rings, the shadcn `Spinner` is a rotating arc; it keeps the 100 px box and the `#00BFFF` colour, no baseline screen photographs the loading state, and the spec's component map says `Puff` → `Spinner`.

- [ ] **Step 5: One new `PlayRoute` test, and the existing ones stay untouched**

`PlayRoute.test.jsx` already proves the error box through `expect(await screen.findByRole('alert')).toHaveTextContent(…)`, which the migration keeps. Add, in the same `describe`:

```jsx
    it('spins while the round is loading, then stops', async () => {
        let resolveRound
        const { firebase } = makeFirebase({ round: () => new Promise((resolve) => { resolveRound = resolve }) })
        const { store } = renderRoute(firebase)

        expect(await screen.findByRole('status', { name: 'Loading' })).toBeInTheDocument()
        resolveRound(roundWithMembers(['me']))
        await waitFor(() => expect(store.getState().round).not.toBeNull())
        expect(screen.queryByRole('status')).toBeNull()
    })
```

(`Spinner` renders `role="status" aria-label="Loading"` itself, so this needs no new hook.)

- [ ] **Step 6: `EffectsSidebar.jsx`**

Delete `PropTypes`, `EffectsSidebar.propTypes`, `withStyles`, `styles` and the `Box` import; import `ChevronRightIcon` from `@/components/icons` instead of `@material-ui/icons/ChevronRight` and `cn` from `@/lib/utils`. Drop the bogus `size="small"` on the icon (`size` is not an `SvgIcon` prop; it was landing on the `svg` as an attribute and doing nothing).

| JSS rule | Tailwind |
|---|---|
| `root` | `absolute top-16 flex h-[calc(100%-64px)] w-[120px] flex-col items-center justify-center border-t border-white/10 [transition:right_0.4s]` + `right-0` / `-right-[120px]` |
| `effectContainer` | `relative flex h-[352px] w-[120px] flex-col items-center justify-center rounded-l-lg bg-[rgba(47,47,47,0.9)]` |
| `minimizeButton` | `absolute -left-10 top-3 flex size-8 cursor-pointer items-center justify-center rounded-lg bg-[rgba(47,47,47,0.9)] [transition:transform_0.4s]` |
| `minimizeButtonIsMinimized` | `[transform:rotateY(180deg)]` |
| `isMinimized` | folded into the root's `right` (above) |
| `thumbControl`, `effectsSidebarList`, `effectsSidebarListItem`, `effectsSidebarListItemDragHandle` | **deleted.** The first is passed to `EffectThumbControl` as `className` and that component never spreads `className`, so it has never applied; the other three are left over from a drag-to-reorder list that no longer renders. |

```jsx
        return (
            <div className={cn('absolute top-16 flex h-[calc(100%-64px)] w-[120px] flex-col items-center justify-center border-t border-white/10 [transition:right_0.4s]',
                this.state.isMinimized ? '-right-[120px]' : 'right-0')}>
                <div className="relative flex h-[352px] w-[120px] flex-col items-center justify-center rounded-l-lg bg-[rgba(47,47,47,0.9)]">
                    {/* A div, not a button: capture.py's CHEVRON finds this control as the only
                        32x32 div holding an svg on the right-hand edge. */}
                    <div
                        className={cn('absolute -left-10 top-3 flex size-8 cursor-pointer items-center justify-center rounded-lg bg-[rgba(47,47,47,0.9)] [transition:transform_0.4s]',
                            this.state.isMinimized && '[transform:rotateY(180deg)]')}
                        role="button"
                        tabIndex={0}
                        aria-label={this.state.isMinimized ? 'Show the effects' : 'Hide the effects'}
                        aria-expanded={!this.state.isMinimized}
                        onClick={this.onMinimizeClick}
                        onKeyDown={(event) => {
                            if (event.key !== 'Enter' && event.key !== ' ') return
                            event.preventDefault()
                            // PlayUI puts a keydown listener on `window` that toggles playback on
                            // Space for any target that is not an input, textarea, select or
                            // contenteditable (src/utils/constants.js: KEY_MAPPINGS.playToggle is
                            // ' '). React delegates to the root container, which is inside window,
                            // so without this the sequencer would start playing every time someone
                            // minimized the sidebar from the keyboard.
                            event.stopPropagation()
                            this.onMinimizeClick()
                        }}
                    >
                        <ChevronRightIcon />
                    </div>
                    {items.map((fx) => (
                        <EffectThumbControl key={fx.id} isOn={fx.isOn} isOverride={fx.isOverride} label={toTitleCase(fx.label)} fxId={fx.id} userId={fx.userId} switchOn={this.onSwitchOn} switchOff={this.onSwitchOff} name={fx.name} />
                    ))}
                </div>
            </div>
        )
```

`role`, `tabIndex`, `aria-label`, `aria-expanded` and the key handler are new: the control was a bare `div` nobody could reach from the keyboard. None of them changes a pixel — `cursor: pointer` was already set by the JSS, and `button:not(:disabled), [role="button"]:not(:disabled) { cursor: pointer }` in `src/index.css` says the same thing — and `capture.py`'s `CHEVRON` still matches, because the element is still the only 32 × 32 `div` holding an `svg` at `x > 1000`.

`aria-expanded` describes the *effects*, which the control shows and hides, so it is `!isMinimized`. The `aria-label` flips with the state (`Hide the effects` / `Show the effects`) rather than staying constant, because the two names are what `EffectsSidebar.test.jsx` (Step 8) and `keyboard.py` (Step 12) assert the toggle by.

- [ ] **Step 7: `EffectThumbControl.jsx`**

Delete `PropTypes`, `EffectThumbControl.propTypes`, `withStyles`, `styles` and the `Box` import; the default export becomes the class itself. The one JSS name that reaches SVG.js becomes a literal:

```js
// SVG.js only ever needed the string; this used to come from JSS as classes.button.
this.thumb.addClass('cursor-pointer')
```

| JSS rule | Tailwind |
|---|---|
| `container` | `relative m-[0.2rem] flex h-12 w-24 flex-col items-center justify-center rounded-[24px] border border-white/10` |
| `lockContainer` + its two inline `left`/`right` | `absolute flex h-full flex-row items-center justify-center` + `left-4` / `right-4` |
| `open`, `locked` | `z-[1] flex` (their `color: '#474747'` never applied — they are on `<img>` elements) |
| `iconDark` | **deleted**, never referenced |
| `style={{ zIndex: 2, position: 'absolute' }}` | `absolute z-[2]` |
| `style={{ display: 'flex', zIndex: 2 }}` | `z-[2] flex` |

The two `<img>` elements stay bare markup but stop relying on `img:not([data-slot])` in `src/index.css`, which Task 5 Step 6 deletes. `lock.svg` and `openLock.svg` are both 12 × 16 in their own `<svg width height>`, and preflight's `img,video{max-width:100%;height:auto}` is what the `revert` rule was undoing, so each carries its file's size as two utilities instead:

```jsx
                    <img alt='open lock' src={OpenLock} className="z-[1] flex h-4 w-3" />
```

and the same on the `locked` one. `z-[1] flex` is the `open`/`locked` rule from the table; `h-4 w-3` is the file's own size. A utility beats preflight because preflight lives in the base layer, so no `cn` and no extra import are needed here — this file has no `classes` object left once `withStyles` is gone.

- [ ] **Step 8: `EffectsSidebar.test.jsx`**

```jsx
import { vi, describe, it, expect } from 'vitest'
import React from 'react'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import EffectsSidebar from './EffectsSidebar'
import { renderWithProviders, makeStore } from '../../test/test-utils'
import { setRound, setUser } from '../../redux/actions'

vi.mock('tone', () => ({}))
vi.mock('../../audio-engine/AudioEngine', () => ({ default: { busesByUser: {} } }))
// The switch itself is an SVG.js drawing with no DOM to assert on; it has its own coverage
// through the 19-effects-on baseline screen.
vi.mock('./EffectThumbControl', () => ({ default: ({ name }) => <div data-test={`fx-${name}`} /> }))

function setup() {
    const store = makeStore()
    store.dispatch(setUser({ id: 'me', color: '#f44336' }))
    store.dispatch(setRound({ id: 'r1', currentUsers: ['me'], layers: [], userBuses: { me: { id: 'me', fx: [{ id: 'reverb', name: 'reverb', isOn: true, isOverride: false }] } } }))
    return renderWithProviders(<EffectsSidebar />, { store, firebase: { updateUserBus: vi.fn() } })
}

describe('EffectsSidebar', () => {
    it('lists the user\'s effects', () => {
        setup()
        expect(screen.getByTestId('fx-reverb')).toBeInTheDocument()
    })

    it('slides itself off the edge and back from its chevron', async () => {
        const user = userEvent.setup()
        const { container } = setup()
        const root = container.firstChild
        expect(root).toHaveClass('right-0')
        await user.click(screen.getByRole('button', { name: 'Hide the effects' }))
        expect(root).toHaveClass('-right-[120px]')
        await user.click(screen.getByRole('button', { name: 'Show the effects' }))
        expect(root).toHaveClass('right-0')
    })
})
```

- [ ] **Step 9: `JitsiComponent.jsx`**

Delete `PropTypes`, `JitsiComponent.propTypes`, `withStyles` and `styles`; swap the four `@material-ui/icons` imports for `@/components/icons` and `CircularProgress` for `Spinner`. `size="icon-round"` is right here — unlike the app's own resources, these are the copied Material glyphs and really are 24 px.

| JSS rule | Tailwind |
|---|---|
| `root` | `absolute left-[-600px] top-0` |
| `micButton` | `mr-4 bg-secondary hover:bg-secondary` (the same string PR 2 gives the header's share button) |
| `micButtonOn` | `mr-4 bg-primary text-secondary hover:bg-[#AAAAAA]` (`primary.dark` is `#AAAAAA`) |
| `style={{ height: "100%" }}` on `#jaas-container` | `h-full` |

```jsx
            <>
                {!this.state.isEnabled &&
                    <Button type="button" variant="plain" size="icon-round" aria-label="Start voice chat" className="mr-4 bg-secondary hover:bg-secondary" onClick={this.join}>
                        <CallIcon />
                    </Button>
                }
                {(this.state.isEnabled && this.state.isConnecting) &&
                    <Button type="button" variant="plain" size="icon-round" disabled aria-label="Connecting to voice chat" className="mr-4 bg-secondary hover:bg-secondary disabled:opacity-100">
                        <Spinner className="size-6 text-primary" />
                    </Button>
                }
                {(this.state.isEnabled && !this.state.isConnecting) &&
                    <Button type="button" variant="plain" size="icon-round" aria-label="Leave voice chat" className="mr-4 bg-primary text-secondary hover:bg-[#AAAAAA]" onClick={this.leave}>
                        <CallEndIcon />
                    </Button>
                }
                {this.state.micIsEnabled &&
                    <Button type="button" variant="plain" size="icon-round" aria-label="Mute the microphone" className="mr-4 bg-secondary hover:bg-secondary disabled:opacity-100 disabled:text-white/30" onClick={this.onMicClick} disabled={!this.state.isEnabled}>
                        <MicIcon />
                    </Button>
                }
                {!this.state.micIsEnabled &&
                    <Button type="button" variant="plain" size="icon-round" aria-label="Unmute the microphone" className="mr-4 bg-secondary hover:bg-secondary disabled:opacity-100 disabled:text-white/30" onClick={this.onMicClick} disabled={!this.state.isEnabled}>
                        <MicOffIcon />
                    </Button>
                }
                <div className="absolute left-[-600px] top-0" data-test="voice-chat">
                    <div id="jaas-container" className="h-full"></div>
                </div>
            </>
```

`disabled:opacity-100 disabled:text-white/30` is PR 2's rendering of MUI's `action.disabled`; the generated `Button` would fade the whole button to 50 %. The `aria-label`s are new — these buttons have never had accessible names — and cost nothing: `JitsiComponent` only renders when a round has more than one user, so it appears on no baseline screen. The 8×8 iframe inside `#jaas-container` is untouched.

- [ ] **Step 10: `JitsiComponent.test.jsx`**

```jsx
import { vi, describe, it, expect } from 'vitest'
import React from 'react'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import JitsiComponent from './JitsiComponent'
import { renderWithProviders, makeStore } from '../../test/test-utils'
import { setRound, setUser } from '../../redux/actions'

function setup(firebase = {}) {
    const store = makeStore()
    store.dispatch(setUser({ id: 'me', displayName: 'Me', color: '#f44336' }))
    store.dispatch(setRound({ id: 'r1', currentUsers: ['me'], layers: [] }))
    return renderWithProviders(<JitsiComponent />, { store, firebase })
}

describe('JitsiComponent', () => {
    it('offers to start a call, with the microphone control disabled until one is running', () => {
        setup()
        expect(screen.getByRole('button', { name: 'Start voice chat' })).toBeEnabled()
        expect(screen.getByRole('button', { name: 'Unmute the microphone' })).toBeDisabled()
        expect(screen.getByTestId('voice-chat')).toBeInTheDocument()
    })

    it('comes back to the start button when the Jitsi API is not on the page', async () => {
        const user = userEvent.setup()
        setup({ getJitsiToken: vi.fn() })
        await user.click(screen.getByRole('button', { name: 'Start voice chat' }))
        expect(await screen.findByRole('button', { name: 'Start voice chat' })).toBeInTheDocument()
    })
})
```

- [ ] **Step 11: Take the Material UI theme out of `Header.test.jsx`**

`Header.test.jsx` wraps its subject in `<ThemeProvider theme={createTheme({ palette: { type: 'dark' } })}>` for one reason: `Header` renders `JitsiComponent`, whose JSS read `theme.palette`. That is gone as of Step 9. Delete the `import { createTheme, ThemeProvider } from '@material-ui/core/styles'` line and both wrappers, leaving `const ui = <Header />` and the second render's children as they are. No assertion changes.

- [ ] **Step 12: Give `keyboard.py` the sidebar chevron's two cases**

Step 6 makes the effects sidebar's minimize control reachable and operable from the keyboard, which is exactly the kind of behaviour `keyboard.py` exists to hold and no screenshot can. Add one function next to `avatar_menu` and register it in `check()`, following that file's shape: it takes `(b, report)`, calls `report(name, ok, detail)` once per case, and drives the app through `Keyboard.type_key`.

```python
def effects_chevron(b, report):
    """The sidebar's minimize control is a div with role=button, not a <button>.

    capture.py's CHEVRON selector needs it to stay a 32x32 div holding an svg, so it cannot
    become a real button, and the keyboard behaviour a real button would have come with is the
    app's own code. Space is the case worth having: PlayUI listens for it on `window` to toggle
    playback, so a handler that does not stopPropagation minimizes the sidebar *and* starts the
    sequencer.
    """
    b.focus('[aria-label="Hide the effects"]')
    report('effects sidebar: the chevron takes focus',
           b.js('document.activeElement.getAttribute("aria-label") === "Hide the effects"'), b.js(WHERE))

    b.enter()
    report('effects sidebar: Enter minimizes it',
           b.wait(has('[aria-label="Show the effects"]'), timeout=10), b.js(SIDEBAR_RIGHT))

    b.run(SPACE_PROBE, 'install the window keydown probe')
    b.type_key(' ', 'Space', 32, text=' ')
    report('effects sidebar: Space restores it',
           b.wait(has('[aria-label="Hide the effects"]'), timeout=10), b.js(SIDEBAR_RIGHT))
    report('effects sidebar: Space does not reach PlayUI',
           b.js('window.__spaceAtWindow === false'), 'reached window: %s' % b.js('window.__spaceAtWindow'))
```

with, next to `MENU_GONE` at the top of `keyboard.py`:

```python
# PlayUI toggles playback from a `keydown` listener on `window`, and redraws the transport in
# SVG.js rather than exposing any state, so "did Space reach it" is asked directly: a listener
# registered on window in the bubble phase, exactly where PlayUI's is. React delegates to the
# root container, which is below window, so a handler that calls stopPropagation stops this probe
# and PlayUI's listener together, and one that does not stops neither.
SPACE_PROBE = """(() => {
  window.__spaceAtWindow = false;
  if (!window.__spaceProbeInstalled) {
    window.addEventListener('keydown', (e) => { if (e.key === ' ') window.__spaceAtWindow = true });
    window.__spaceProbeInstalled = true;
  }
  return true;
})()"""
```

`b.focus`, `b.enter`, `b.run`, `b.type_key` and `b.wait` are all already on `Keyboard`/`Browser`; `report(case, ok, detail='')` takes an already-evaluated string as its third argument, so `b.js(WHERE)` and not `WHERE`. Add `SIDEBAR_RIGHT` to the `from capture import (…)` list at the top of the file — `has`, `Browser`, `Failed`, `discard` and `gone` are already there. Call `effects_chevron(b, report)` from `check()` **immediately after `sign_in_as_guest(b)`**, which is where the play route is loaded and the sidebar exists, and before `avatar_menu(b, report)`. The total goes from 24 to 28.

- [ ] **Step 13: Run the suite, `keyboard.py`, then the pixel check for the sidebar screens**

```bash
corepack yarn -s test && corepack yarn -s lint && corepack yarn -s build
(npx -y serve@14 -s build -l 3102 >/dev/null 2>&1 &)
python3 docs/ui-baseline/keyboard.py --base http://localhost:3102 --port 9409
python3 docs/ui-baseline/capture.py --base http://localhost:3102 --out /tmp/pr3-shell --port 9403
python3 docs/ui-baseline/compare.py /tmp/pr3-shell
pkill -f 'serve -s build -l 3102'
```

`keyboard.py` must report 28/28: the 24 PR 2 cases, which this task must not have disturbed, plus the four from Step 12.

Expected: all 22 screens under 0.5 %. The ones this task can move are `05`, `06`, `13` and `19` (the sidebar is in all four) plus anything the new `icon-app` size touches. Read `/tmp/pr3-shell/diff-06-effects-sidebar.png` against the baseline and hold the numbers from **Measured values**: container x 1180–1299 / y 307–658, chevron at x 1260–1291 when minimized and 1140–1171 when not. If the effect switches have moved, the `icon-app` size is not doing its job or a lock `<img>` lost its `h-4 w-3` and preflight clamped it.

- [ ] **Step 14: Commit, in two**

Step 1 is a move with no behaviour in it and nine files of import churn; keeping it out of the migration commit is what makes the migration commit readable.

```bash
git add src/lib/mui.js src/components/dialogs/AppDialog.jsx src/components/ErrorBoundary.jsx \
        src/components/landing-page/LandingPageRoute.jsx src/components/rounds-list-route/RoundsListRoute.jsx \
        src/components/header/Header.jsx src/components/header/ProjectName.jsx \
        src/components/dialogs/SignInDialog.jsx src/components/dialogs/ShareDialog.jsx \
        src/components/dialogs/RenameDialog.jsx src/components/dialogs/DeleteRoundDialog.jsx
git commit  # subject: "Move the MUI button class strings out of AppDialog"

git add src/components/ui/button.jsx src/components/play/PlayRoute.jsx src/components/play/PlayRoute.test.jsx \
        src/components/play/EffectsSidebar.jsx src/components/play/EffectsSidebar.test.jsx \
        src/components/play/EffectThumbControl.jsx src/components/play/JitsiComponent.jsx \
        src/components/play/JitsiComponent.test.jsx src/components/header/Header.test.jsx \
        docs/ui-baseline/keyboard.py
git commit  # subject: "Move the play route's shell and the effects sidebar to shadcn"
```

(`ErrorBoundary.jsx` is in the first commit: Step 1 changes its import line and Step 3 its two class strings, and splitting one file across two commits buys nothing.)

---

### Task 3: The bottom bar, the mixer, the hamburger and delete/clear popups

**What this task consumes from PR 2:** only `Button`'s `plain` variant. It does **not** use `MUI_BUTTON` — nothing in the bottom bar is a MUI pill — so there is no import from `@/lib/mui` here. `Button` is still a `forwardRef` at this point, which is what lets `HamburgerPopup` and `DeleteClearPopup` put `ref` on it (Task 6 removes the wrapper and React 19 passes `ref` as a prop, with no change to those call sites).

**Files:**
- Create: `src/components/play/layer-settings/styles.js`, `src/components/play/layer-settings/LayerSettings.test.jsx`
- Modify: `src/components/play/layer-settings/LayerSettings.jsx`, `LayerListPopup.jsx`, `HamburgerPopup.jsx`, `DeleteClearPopup.jsx`, `docs/ui-baseline/keyboard.py`

**Interfaces:**
- Produces: `layerSettingsClasses` (the same 34 keys the JSS had, so the children's `classes.x` reads are unchanged), `ICON_BUTTON`, `SM_BREAKPOINT`. `LayerSettings` keeps every handler, every ref, its `connect` map and the order of its children.

- [ ] **Step 1: `styles.js`, the class map the four files share**

The JSS object was shared by five components through the `classes` prop. Keeping that shape is what makes this a styling change instead of a rewrite: the children go on reading `classes.mixerPopup`, and the open/closed ternaries stay character for character. `LayerInstrument` (Task 4) reads `classes.instrumentPopup` and `classes.rectButton` from here too, so the map is complete from this task on.

```js
/**
 * What withStyles used to hand the bottom bar and its popups, as Tailwind class strings.
 *
 * Keys, and the ternaries that pick between a positioned key and `hidden`, are unchanged from
 * the JSS so the popups keep working the way capture.py reads them: always mounted, opacity 0
 * and top:200% when closed. `hidden` here is that rule, not Tailwind's `hidden` utility --
 * `display: none` would take the popups out of the layout and out of the fades.
 *
 * MUI's down(key) means "below the NEXT breakpoint", and this theme's are sm 500, md 900,
 * lg 1200: down('xs') is max-sm, down('sm') is max-md, down('md') is max-lg.
 */
export const layerSettingsClasses = {
    container: 'absolute bottom-0 left-1/4 right-1/4 flex items-start justify-center bg-transparent max-lg:left-[20%] max-lg:right-[20%] max-md:left-[5%] max-md:right-[5%]',
    addLayerMobile: 'hidden max-sm:flex',
    addLayerDesktop: 'flex max-sm:hidden',
    selectedInstrumentInfo: 'flex max-sm:hidden',
    // 547x48 with a 32px radius, 20px off the bottom. Measured on 05-round.png at x 376-923, y 832-879.
    root: 'relative mb-5 box-border flex h-12 w-[547px] flex-row items-center justify-start rounded-[32px] bg-[#333333] max-lg:mb-2.5 max-md:mb-[5px] max-sm:w-[341px]',
    // 499x243 above the bar, 48px in. Measured on 07-mixer-popup.png at x 425-923, y 585-827.
    mixerPopup: 'absolute -top-[247px] left-12 right-0 z-[100] flex h-[243px] w-[499px] flex-col overflow-hidden rounded-lg bg-[#333333] opacity-100 shadow-[0px_0px_2px_rgba(0,0,0,0.15),0px_4px_6px_rgba(0,0,0,0.15)] [transition:opacity_0.2s_ease-in] max-md:-top-[163px] max-md:left-0 max-md:h-40 max-sm:w-[341px]',
    mixerPopupHeader: 'flex flex-1 items-center justify-start border-b border-white/10 px-[15px] py-2.5',
    mixerPopupHeaderText: 'm-0 ml-[13px] text-[18px] font-normal leading-[1.5] tracking-[0.00938em]',
    buttonText: 'm-0 text-base font-normal leading-none tracking-[0.00938em]',
    instrumentPopup: 'absolute bottom-[47px] left-0 right-0 z-[100] overflow-hidden rounded-lg bg-[#333333] px-0 py-[5px] shadow-[0px_0px_2px_rgba(0,0,0,0.15),0px_4px_6px_rgba(0,0,0,0.15)] [transition:opacity_0.2s_ease-in] max-md:w-[216px]',
    instrumentSample: 'm-0 flex text-center text-base leading-none tracking-[0.00938em] capitalize [font-weight:bolder] max-sm:flex-1',
    addLayerContainer: 'm-0 flex h-full flex-row items-center justify-center rounded-[30px] bg-[#4D4D4D] p-0',
    iconButtons: 'size-12 rounded-full hover:bg-white/20',
    rectButton: 'flex w-full flex-row rounded-none px-[15px] py-[5px]',
    mixerButton: 'mx-[5px] flex size-8 flex-row items-center justify-center rounded-full bg-white/10 p-0',
    volumeSliderContainer: 'flex [flex:2] flex-row items-center justify-center',
    // 216x32 pill at 6px/15px. Measured on 08-bottom-bar-click.png at x 485-692, y 840-871.
    instrumentSummary: 'my-2.5 flex h-8 w-[216px] flex-row items-center justify-start rounded-[24px] bg-white/10 px-[15px] py-1.5 font-bold hover:bg-white/20 max-sm:w-[106px]',
    stepCount: 'my-2.5 flex h-8 w-[59px] flex-row items-center justify-center rounded-[24px] bg-white/10 px-3 py-1.5 hover:bg-white/20',
    stepLength: 'm-0 flex items-start text-base leading-none tracking-[0.00938em]',
    actionButtonContainer: 'relative mx-2 flex items-center justify-center',
    hamburgerPopup: 'absolute -top-[108px] left-0 z-[100] flex h-[104px] w-[155px] flex-col justify-center overflow-hidden rounded-lg bg-[#333333] opacity-100 shadow-[0px_0px_2px_rgba(0,0,0,0.15),0px_4px_6px_rgba(0,0,0,0.15)] [transition:opacity_0.2s_ease-in]',
    deleteClearPopup: 'absolute -top-[100px] right-0 z-[100] flex h-[104px] w-[155px] flex-col justify-center overflow-hidden rounded-lg bg-[#333333] opacity-100 shadow-[0px_0px_2px_rgba(0,0,0,0.15),0px_4px_6px_rgba(0,0,0,0.15)] [transition:opacity_0.2s_ease-in]',
    desktopDeleteClear: 'flex max-sm:hidden',
    mobileDeleteClear: 'hidden max-sm:flex',
    actionButton: 'my-2.5 flex size-8 flex-row items-center justify-center rounded-full bg-white/10 p-[5px] hover:bg-white/20',
    msg: 'm-0 flex-1 px-[15px] text-center text-base font-normal leading-6 tracking-[0.00938em] max-sm:text-sm',
    containerSoloMute: 'flex flex-1 flex-row items-center justify-between pl-5',
    layerContainer: 'z-[100] flex h-full [flex:6] flex-col overflow-y-scroll',
    layerSubContainer: 'flex flex-1 cursor-pointer flex-row hover:bg-white/10',
    layer: 'mx-5 flex flex-1 flex-row border-b border-white/10 py-2.5',
    layerOptions: 'relative flex w-[90%] items-center justify-start',
    plainButton: 'size-12 rounded-full hover:bg-transparent',
    buttonWithText: 'flex h-11 w-full flex-row items-center justify-between rounded-none p-3',
    hidden: 'absolute top-[200%] opacity-0 [transition:opacity_0.2s_ease-out]'
}

/**
 * What every migrated IconButton needs on top of its own geometry. MUI's ButtonBase draws no
 * border and inherits the body's 16px/400; the generated Button has a 1px transparent border,
 * which insets its content under border-box and shifts the label of every justify-between
 * button, and sets text-sm/font-medium on its whole subtree.
 */
export const ICON_BUTTON = 'border-0 text-base font-normal'

/** The theme's `sm` breakpoint, which decided `isMobile` while MUI still provided a theme. */
export const SM_BREAKPOINT = 500
```

Five rules were dropped because nothing reads them (`grep -n "classes\.\(drawer\|instrumentIcon\|buttonContainer\|containedButton\|soundTabs\|divider\)" src/components/play/layer-settings/*.jsx` is empty): `drawer` (a `MuiPaper` override for a `Drawer` that is not rendered), `instrumentIcon`, `buttonContainer`, `containedButton`, `soundTabs` (a `MuiTab` override for `Tabs` that are not rendered) and `divider`. Say so in the commit body.

- [ ] **Step 2: `LayerSettings.jsx`**

Delete `withStyles`, the whole `styles` object and the `Box`, `Typography`, `IconButton` imports; import `{ Button }` from `@/components/ui/button`, `{ cn }` from `@/lib/utils`, and `{ layerSettingsClasses as classes, ICON_BUTTON, SM_BREAKPOINT }` from `./styles`. The export becomes `connect(mapStateToProps)(LayerSettings)`, and `render()` reads `const { user } = this.props` — `classes` and `theme` are no longer props, so `isMobile` becomes `windowWidth < SM_BREAKPOINT`.

Keep, unchanged: every `React.createRef()`, `componentDidMount`/`componentDidUpdate`/`componentWillUnmount`, `onClick` (the click-away, whose ref list is what keeps a trigger from closing the popup it just opened), `hideAllLayerInspectorModals`, `setSelectedInstrument`, `getUserColors`, `applySolo` and all eight `toggle*` handlers with their `preventDefault`/`stopPropagation`.

Mechanical replacements through `render()`:

- `<Box className={classes.x}>` → `<div className={classes.x}>`; the bare `<Box style={{…}}>` wrappers → `<div className="…">` per the table below.
- `<IconButton className={classes.x} …>` → `<Button type="button" variant="plain" size="icon-app" className={cn(ICON_BUTTON, classes.x)} …>`; refs, `onClick` and `id` move over untouched.
- `style={showX ? { backgroundColor: 'rgba(255, 255, 255, 0.2)' } : {}}` → a third `cn` argument, `showX && 'bg-white/20'`.
- `<Typography className={classes.msg}>` → `<p className={classes.msg}>`; the inline-styled ones per the table.

| inline style | Tailwind |
|---|---|
| `{ display: 'flex', flex: 1, flexDirection: 'row' }` (layer controls row) | `flex flex-1 flex-row` |
| `{ display:'flex', flexDirection:'row', alignItems:'center', justifyContent:'center', paddingRight: 5 }` | `flex flex-row items-center justify-center pr-[5px]` |
| `{ fontWeight:'bolder', lineHeight:1, textTransform:'capitalize' }` (instrument label) | `m-0 text-base leading-none tracking-[0.00938em] capitalize [font-weight:bolder]` |
| `{ fontSize:30, marginLeft:5, marginRight:5, lineHeight:.5 }` (the middle dot) | `m-0 mx-[5px] text-[30px] leading-[0.5]` |
| `{ display:'flex', flexDirection:'row', alignItems:'center' }` (steps pill contents) | `flex flex-row items-center` |
| `{ display:'flex', justifyContent:'center', alignItems:'center', margin:0, padding:0 }` (`instrumentIcon()`) | `flex items-center justify-center m-0 p-0` |
| `{ fontWeight:'bolder' }` on the step count | `font-[bolder]` → write it as part of `classes.stepLength` + `[font-weight:bolder]` |

The `instrumentIcon` helper keeps returning an element; only its wrapper changes:

```jsx
        const instrumentIcon = (name) => {
            let Icon = () => <svg></svg>;
            if (name === 'HiHats') Icon = HiHatsIcon
            if (name === 'Kicks') Icon = KickIcon
            if (name === 'Snares') Icon = SnareIcon
            if (name === 'Perc') Icon = PercIcon
            return <div className="m-0 flex items-center justify-center p-0"><Icon /></div>
        }
```

(the empty-`svg` default was `let Icon = <svg></svg>` and then used as `<Icon />`, which React renders as an unknown element; make it a component so React 19's stricter element checks have nothing to complain about, and note that in the commit body.)

- [ ] **Step 3: Close the popups on Escape**

MUI's version had no keyboard escape from any of the six popups. In `componentDidMount`, next to the `click` listener:

```js
        window.addEventListener('keydown', this.onKeyDown)
```

```js
    // The popups are opened by pointer and were, until now, only closable by pointer.
    onKeyDown = (e) => {
        if (e.key === 'Escape') {
            this.hideAllLayerInspectorModals()
        }
    }
```

and remove it in `componentWillUnmount` beside the other two. `PlayUI`'s own key handling is for the space bar and is unaffected.

- [ ] **Step 4: Mark the popups for the tests**

Each of the six popup wrappers gets two attributes, so the unit tests can tell open from closed without computed styles (Vitest runs with `css: false`, so no Tailwind reaches jsdom):

```jsx
<div data-test="mixer-popup" data-open={String(showMixerPopup)} className={showMixerPopup ? classes.mixerPopup : classes.hidden}>
```

with `layer-list` → `mixer-popup`, `hamburger-popup`, `delete-clear-popup`, `instrument-popup`, `layer-popup`, `volume-popup` (the last three land in Task 4). These are new hooks: `capture.py` must not use them, because it also has to drive the Material UI build the baseline was taken from.

- [ ] **Step 5: `LayerListPopup.jsx`**

Keep the `useState`/`useEffect` that orders the layers, and keep this component **rendered before `HamburgerPopup`** in `LayerSettings` — `capture.py`'s `MIXER_POPUP` finds the first leaf whose text is `Mixer`, and the hamburger popup has one too. Keep the popup's children as `[header, layerContainer]` and the rows as `layerContainer`'s children: `FIRST_LAYER_ROW` clicks `popup.children[1].children[0]`.

```jsx
    return (
        <div data-test="mixer-popup" data-open={String(showMixerPopup)} className={showMixerPopup ? classes.mixerPopup : classes.hidden}>
            <div className={classes.mixerPopupHeader}>
                <Button type="button" variant="plain" size="icon-app" aria-label="Close the mixer" className={cn(ICON_BUTTON, classes.plainButton)} onClick={toggleShowMixerPopup}>
                    <CloseIcon />
                </Button>
                <p className={classes.mixerPopupHeaderText}>Mixer</p>
            </div>
            <div className={classes.layerContainer}>
                {layers.map((layer, i) =>
                    <div
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); onLayerSelect(layer.id) }}
                        key={i}
                        className={classes.layerSubContainer}
                    >
                        <div className={cn(classes.layer, (round.layers.length - 1) === i && 'border-b-0')}>
                            <div className="flex [flex:4] flex-col items-start justify-center">
                                <div className="flex flex-row items-center justify-start pb-[5px]">
                                    <div className="mr-[5px]">{instrumentIcon(layer?.instrument?.sampler)}</div>
                                    <p className="m-0 flex items-start text-base font-normal leading-none tracking-[0.00938em] capitalize">{layer.instrument?.sample}</p>
                                </div>
                                <div className="flex h-5 w-9 flex-row items-center">
                                    <div className="mr-[5px] flex flex-row items-center justify-center">
                                        {userColors && layer && layer.createdBy &&
                                            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                <circle cx="6" cy="6" r="5" stroke={userColors[layer.createdBy]} strokeWidth="2" />
                                            </svg>}
                                    </div>
                                    <p className={classes.stepLength}>{layer.steps.length}</p>
                                </div>
                            </div>
                            <div className={classes.volumeSliderContainer}>
                                <VolumeSlider hideText={true} selectedLayer={layer} roundId={round.id} user={user} />
                            </div>
                            <div className={classes.containerSoloMute}>
                                <Button type="button" variant="plain" size="icon-app" aria-label={`Solo ${layer.instrument?.sample}`} className={cn(ICON_BUTTON, classes.mixerButton)} onClick={() => onSoloClick(layer)}>
                                    <span className="text-base leading-6 font-bold tracking-[0.00938em]">S</span>
                                </Button>
                                <Button type="button" variant="plain" size="icon-app" aria-label={`Mute ${layer.instrument?.sample}`} className={cn(ICON_BUTTON, classes.mixerButton)} onClick={() => onMuteClick(layer)}>
                                    <span className="text-base leading-6 font-bold tracking-[0.00938em]">M</span>
                                </Button>
                            </div>
                        </div>
                    </div>)
            }
            </div>
        </div>
    )
```

The unused `height`, `selectedInstrument` and `ref` props stay in the signature (`LayerSettings` still passes `height`), and the `aria-label`s on S and M are new, for the same reason as Jitsi's: they had no accessible name at all, and they are inside a popup no baseline screen photographs until Task 1's `21-mixer-popup-mobile`, where a label changes no pixels.

- [ ] **Step 6: `HamburgerPopup.jsx` and `DeleteClearPopup.jsx`**

Both are the same shape: a positioned popup holding two full-width `buttonWithText` buttons, each a label and an icon pushed apart.

```jsx
export default function HamburgerPopup({ classes, user, userColors, showMixerPopup, showHamburgerPopup, addLayerButtonRef, mixerPopupButtonRef, toggleShowMixerPopup, onAddLayerClick }) {
    return (
        <div data-test="hamburger-popup" data-open={String(showHamburgerPopup)} className={showHamburgerPopup ? classes.hamburgerPopup : classes.hidden}>
            <Button type="button" variant="plain" size="icon-app" ref={addLayerButtonRef} onClick={onAddLayerClick} className={cn(ICON_BUTTON, classes.buttonWithText)}>
                <p className={classes.buttonText}>Add round</p>
                <PlusIcon width={16} height={16} user={user} userColors={userColors} />
            </Button>
            <Button type="button" variant="plain" size="icon-app" ref={mixerPopupButtonRef} onClick={toggleShowMixerPopup} className={cn(ICON_BUTTON, classes.buttonWithText, showMixerPopup && 'bg-white/20')}>
                <p className={classes.buttonText}>Mixer</p>
                <EqualiserIcon width={12} height={16} user={user} userColors={userColors} />
            </Button>
        </div>
    )
}
```

`DeleteClearPopup` is the same with `Clear`/`ErasorIcon` and `Delete`/`TrashIcon`, `classes.deleteClearPopup`, and `data-test="delete-clear-popup"`. `p-3` inside `classes.buttonWithText` is load-bearing: MUI's `IconButton` keeps its 12 px padding here (the JSS only sets height, width, radius and `justify-content`), and with `justify-between` that padding is what holds the label and the glyph 12 px off each edge.

`ref` on the generated `Button` works because PR 1 wrapped it in `forwardRef` and PR 2 left the wrapper in place (`src/components/ui/button.jsx` at `1ea0b7e` still has it, with the comment `forwardRef is only needed on React 18; drop it with the React 19 upgrade in PR 3`); Task 6 removes it and React 19 passes `ref` as a prop, with no change to these call sites.

- [ ] **Step 7: `LayerSettings.test.jsx`**

```jsx
import { vi, describe, it, expect } from 'vitest'
import React from 'react'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import LayerSettings from './LayerSettings'
import { renderWithProviders, makeStore } from '../../../test/test-utils'
import { setRound, setUser } from '../../../redux/actions'
import { SET_SELECTED_LAYER_ID } from '../../../redux/actionTypes'

vi.mock('tone', () => ({}))
vi.mock('../../../audio-engine/AudioEngine', () => ({ default: { tracksById: {} } }))
vi.mock('../../../audio-engine/Instruments', () => ({
    default: {
        getInstrumentOptions: () => [{ name: 'Kicks', label: 'Kick' }],
        getInstrumentArticulationOptions: () => [{ name: 'a', value: 'a' }],
        getRandomArticulation: async () => 'a',
        getInstrumentLabel: () => 'Kick'
    }
}))

const layer = { id: 'l1', createdBy: 'me', createdAt: 1, gain: 0, isMuted: false, timeOffset: 0, percentOffset: 0, instrument: { sampler: 'Kicks', sample: 'boom' }, steps: [{ id: 's1', isOn: false }] }

function setup({ selected = true } = {}) {
    const store = makeStore()
    store.dispatch(setUser({ id: 'me', color: '#f44336' }))
    store.dispatch(setRound({ id: 'r1', currentUsers: ['me'], layers: [layer] }))
    if (selected) store.dispatch({ type: SET_SELECTED_LAYER_ID, payload: { layerId: 'l1' } })
    return renderWithProviders(<LayerSettings />, { store, firebase: { updateLayer: vi.fn(), createLayer: vi.fn(), deleteLayer: vi.fn() } })
}

describe('LayerSettings', () => {
    it('asks for a layer when none is selected', () => {
        setup({ selected: false })
        expect(screen.getByText('Long Press a round to edit')).toBeInTheDocument()
        expect(screen.getByTestId('mixer-popup')).toHaveAttribute('data-open', 'false')
    })

    it('opens the mixer from the bar and closes it again from the same button', async () => {
        const user = userEvent.setup()
        setup()
        const mixer = screen.getByTestId('mixer-popup')
        await user.click(screen.getByRole('button', { name: 'Open the mixer' }))
        expect(mixer).toHaveAttribute('data-open', 'true')
        await user.click(screen.getByRole('button', { name: 'Open the mixer' }))
        expect(mixer).toHaveAttribute('data-open', 'false')
    })

    it('closes an open popup on Escape', async () => {
        const user = userEvent.setup()
        setup()
        await user.click(screen.getByRole('button', { name: 'Open the mixer' }))
        expect(screen.getByTestId('mixer-popup')).toHaveAttribute('data-open', 'true')
        await user.keyboard('{Escape}')
        expect(screen.getByTestId('mixer-popup')).toHaveAttribute('data-open', 'false')
    })

    it('closes an open popup when the click lands outside it', async () => {
        const user = userEvent.setup()
        setup()
        await user.click(screen.getByRole('button', { name: 'Open the mixer' }))
        await user.click(document.body)
        expect(screen.getByTestId('mixer-popup')).toHaveAttribute('data-open', 'false')
    })

    it('selects a layer from a mixer row', async () => {
        const user = userEvent.setup()
        const { store } = setup({ selected: false })
        await user.click(screen.getByRole('button', { name: 'Open the mixer' }))
        await user.click(screen.getByText('boom'))
        expect(store.getState().display.selectedLayerId).toBe('l1')
    })

    it('opens only one popup at a time', async () => {
        const user = userEvent.setup()
        setup()
        await user.click(screen.getByRole('button', { name: 'Open the mixer' }))
        await user.click(screen.getByRole('button', { name: 'Layer options' }))
        expect(screen.getByTestId('mixer-popup')).toHaveAttribute('data-open', 'false')
        expect(screen.getByTestId('layer-popup')).toHaveAttribute('data-open', 'true')
    })
})
```

Two of those names do not exist yet, so add them in Step 2 while migrating: `aria-label="Open the mixer"` on the bar's equaliser button (and on the hamburger, `aria-label="More"`), `aria-label="Add a layer"` on the plus, `aria-label="Layer options"` on the steps pill, `aria-label="Volume, solo and mute"` on the volume button, `aria-label="Clear or delete this layer"` on the ellipsis, `aria-label="Clear this layer"` / `aria-label="Delete this layer"` on the desktop pair. All are new accessible names on icon-only buttons that had none; none of them changes a pixel, and `capture.py` deliberately finds these buttons by geometry so it keeps working against the Material UI baseline. The last test's `layer-popup` hook arrives in Task 4 — write the test then, or write it now and mark it `it.skip` with a comment naming Task 4.

- [ ] **Step 8: Give `keyboard.py` the popups' Escape case**

Step 3 is the first Escape any of these six popups has ever had, and the pixel gate cannot see it. Add one function next to the one Task 2 added, in the same shape, and register it in `check()` on the play route:

```python
# The layer-settings popups are never unmounted -- a closed one sits at top:200% at opacity 0 --
# so `data-open`, which LayerSettings writes on each wrapper for its own unit tests, is what says
# open from closed. capture.py deliberately does not use it, because capture.py also has to drive
# the pre-migration build; keyboard.py only ever runs against a build of this branch.
def popup_open(name, want='true'):
    return ("(() => { const e = document.querySelector('[data-test=%s]');"
            " return !!e && e.dataset.open === '%s' })()" % (name, want))


def layer_popups(b, report):
    """Escape closes an open layer-settings popup. Material UI's had no keyboard escape at all."""
    b.click('button[aria-label="Open the mixer"]', 'the mixer button')
    opened = b.wait(popup_open('mixer-popup'), timeout=10)
    report('layer settings: the mixer popup opens from the bar', opened, b.js(WHERE))
    if not opened:
        raise Failed('the mixer popup never opened, so its Escape case cannot run')

    b.escape()
    report('layer settings: Escape closes the mixer popup',
           b.wait(popup_open('mixer-popup', 'false'), timeout=10), b.js(WHERE))
```

`aria-label="Open the mixer"` is one of the names Step 2 adds. Call `layer_popups(b, report)` from `check()` right after the `effects_chevron(b, report)` Task 2 added, so both run while the play route is up; `Failed` and `report(case, ok, detail='')` are already there. The total goes from 28 to 30.

- [ ] **Step 9: Run the suite, `keyboard.py` and the pixel check for the bar**

```bash
corepack yarn -s test && corepack yarn -s lint && corepack yarn -s build
(npx -y serve@14 -s build -l 3103 >/dev/null 2>&1 &)
python3 docs/ui-baseline/keyboard.py --base http://localhost:3103 --port 9409
python3 docs/ui-baseline/capture.py --base http://localhost:3103 --out /tmp/pr3-bar --port 9404
python3 docs/ui-baseline/compare.py /tmp/pr3-bar
pkill -f 'serve -s build -l 3103'
```

`keyboard.py` must report 30/30.

This task moves `05`, `07`, `08`, `13`, `20`, `21`, `22` and, through the bar behind them, `09`–`11`. Hold the numbers: bar x 376–923 / y 832–879 on `05`; mixer popup x 425–923 / y 585–827 on `07`; the pills at x 485–692 and 717–767 with the three 32 px buttons centred at 803 / 851 / 899 on `08`. A bar that comes out 4 px too wide or a pill 2 px too tall is almost always a `border` the generated `Button` added (`ICON_BUTTON` carries `border-0` for exactly that) or `my-2.5` written as padding.

If the capture aborts at screen 07 with "the mixer popup opening", `MIXER_POPUP` found the hamburger popup's `Mixer` label first: `LayerListPopup` must be rendered before `HamburgerPopup`.

- [ ] **Step 10: Commit**

```bash
git add src/components/play/layer-settings/styles.js src/components/play/layer-settings/LayerSettings.jsx \
        src/components/play/layer-settings/LayerSettings.test.jsx src/components/play/layer-settings/LayerListPopup.jsx \
        src/components/play/layer-settings/HamburgerPopup.jsx src/components/play/layer-settings/DeleteClearPopup.jsx \
        docs/ui-baseline/keyboard.py
git commit  # subject: "Move the bottom bar and its list popups to shadcn"
```

---

### Task 4: The layer, instrument, offset and volume popups

**What PR 2's `TempoSlider` settled on**, read off `1ea0b7e` and reproduced here: `import { Slider as SliderPrimitive } from 'radix-ui'`; root `relative flex h-7 w-[300px] touch-none select-none items-center`; track `relative h-0.5 w-full grow rounded-[1px] bg-white/38`; range `absolute h-full rounded-[1px] bg-white`; thumb `relative block size-3 rounded-full bg-white outline-none ring-primary/16 transition-shadow duration-150 hover:ring-8 focus-visible:ring-8 active:ring-[14px]`; `aria-labelledby` on the **thumb**. Three differences here, all of them deliberate: the colour (these sliders take the theme's `primary`, `#EAEAEA`, where the tempo slider's JSS forced `#ffffff`, so they use `text-primary` + `bg-current` instead of `bg-white`), the width (`w-full`, not 300 px), and that two of the three want no value bubble. The halo is **not** a difference — MUI's `Slider.thumb` drew it on every slider and PR 2's final fix wave restored it on the tempo one, so leaving it off here would be a regression, not parity.

**Files:**
- Modify: `src/components/play/layer-settings/LayerPopup.jsx`, `LayerInstrument.jsx`, `LayerPercentOffset.jsx`, `VolumePopup.jsx`, `VolumeSlider.jsx`, `VolumeSlider.test.jsx`
- Modify: `src/components/play/layer-settings/styles.js` (the slider class strings), `LayerSettings.test.jsx` (un-skip the last test)

**Interfaces:**
- Produces: `SLIDER_ROOT`, `SLIDER_TRACK`, `SLIDER_RANGE`, `SLIDER_THUMB` in `styles.js`; no prop changes. `VolumeSlider` keeps `{ selectedLayer, sliderRef, user, roundId, hideText }` and `LayerPercentOffset` keeps all eight of its props, refs included — `LayerSettings`'s click-away calls `contains()` on both slider refs.

- [ ] **Step 1: The slider classes**

Add to `styles.js`:

```js
/**
 * MUI's Slider, in the colour the theme gives it (primary, #EAEAEA): a 2px rail inside a 28px
 * hit area (height 2 + 13px padding top and bottom, content-box), a full-opacity filled part
 * and a 12px round thumb. Radix places the thumb itself, so MUI's -6/-5 margins are not needed.
 *
 * Same four strings as TempoSlider's, with `text-primary` + `bg-current` where it hard-codes
 * white (its JSS repainted the root and thumb `#ffffff`; these two take the theme's default
 * `color="primary"`, `#EAEAEA`) and `w-full` where it is 300px.
 *
 * The three `ring-*` utilities on the thumb are MUI's halo:
 * `&$focusVisible,&:hover { boxShadow: 0 0 0 8px alpha(primary.main, 0.16) }` and
 * `&$active { 0 0 0 14px }`, transitioned over 150ms. A Tailwind ring at width 8 compiles to
 * exactly that box-shadow and the thumb carries no other, so there is nothing to fight with;
 * `outline-none` stays because MUI's thumb sets `outline: 0` and drew the halo instead. Hover
 * before focus-visible before active is the order the JSS object had them in, so a press wins.
 * One measured deviation, the same one PR 2 accepted for the tempo slider: MUI lit `$active`
 * for a drag started anywhere on the rail, and Radix exposes no dragging state on the thumb, so
 * this is CSS `:active` and only fires for a press that started on the thumb.
 */
export const SLIDER_ROOT = 'relative flex h-7 w-full touch-none select-none items-center text-primary'
export const SLIDER_TRACK = 'relative h-0.5 w-full grow rounded-[1px] bg-current/38'
export const SLIDER_RANGE = 'absolute h-full rounded-[1px] bg-current'
export const SLIDER_THUMB = 'relative block size-3 rounded-full bg-current outline-none ring-primary/16 transition-shadow duration-150 hover:ring-8 focus-visible:ring-8 active:ring-[14px]'
```

None of the three states is photographed: the capture never hovers, never focuses a control with the mouse and never presses one at the shutter. If a residual does show up on `07`, `08`, `14`, `18` or `21`, it is the halo bleeding into a settled shot, which means a `:hover` stuck — check that the capture's last `click` was followed by a `dismiss(b)` or a move away.

- [ ] **Step 2: `VolumeSlider.jsx`**

Delete `makeStyles`, `styles`, and the `Slider`, `Typography`, `Box` imports; import `{ Slider as SliderPrimitive } from 'radix-ui'`, `{ cn } from '@/lib/utils'`, and `{ SLIDER_ROOT, SLIDER_TRACK, SLIDER_RANGE, SLIDER_THUMB } from './styles'`. Keep `persistGain`, its throttle, `latest`, `isDragging` and both effects exactly as they are. The two handlers lose their event argument:

```jsx
    const onSliderChange = ([percent]) => {
        isDragging.current = true
        setSliderValue(percent)
        const dB = convertPercentToDB(percent)
        const track = AudioEngine.tracksById[selectedLayer.id]
        if (!_.isNil(track)) {
            track.setVolume(dB)
        }
        persistGain(dB, selectedLayer.id)
    }
```

and the `e.preventDefault()`/`e.stopPropagation()` those handlers used to do move onto the wrapper, because in the mixer the slider sits inside a row whose click selects the layer:

```jsx
    return (
        <div
            className="flex w-full flex-col justify-center p-2"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => { event.preventDefault(); event.stopPropagation() }}
        >
            {!hideText && <span id={`volume-slider-${selectedLayer.id}`} className="text-xs leading-[1.66] tracking-[0.03333em]">Volume</span>}
            <SliderPrimitive.Root
                ref={sliderRef}
                className={cn(SLIDER_ROOT, 'min-w-[108px]')}
                value={[selectedLayer.isMuted ? 0 : Math.floor(sliderValue)]}
                min={0}
                max={100}
                onValueChange={onSliderChange}
                onValueCommit={onSliderChangeCommitted}
            >
                <SliderPrimitive.Track className={SLIDER_TRACK}>
                    <SliderPrimitive.Range className={SLIDER_RANGE} />
                </SliderPrimitive.Track>
                {/* aria-label/labelledby belong on the thumb: that is the element Radix gives
                    role="slider" to, the way MUI did. */}
                <SliderPrimitive.Thumb
                    className={cn(SLIDER_THUMB, 'group/thumb')}
                    aria-label={hideText ? 'Volume' : undefined}
                    aria-labelledby={hideText ? undefined : `volume-slider-${selectedLayer.id}`}
                >
                    {/* MUI's valueLabelDisplay="auto": a 32px teardrop 34px above the thumb,
                        shown while the thumb is hovered, focused or dragged. */}
                    <span className="pointer-events-none absolute -left-[10px] -top-[34px] z-10 block origin-bottom -translate-y-[10px] text-[12px] leading-[1.2] opacity-0 transition-opacity group-hover/thumb:opacity-100 group-focus-visible/thumb:opacity-100 group-active/thumb:opacity-100">
                        <span className="flex size-8 rotate-[-45deg] items-center justify-center rounded-[50%_50%_50%_0] bg-current">
                            <span className="rotate-45 text-[rgba(0,0,0,0.87)]">{Math.floor(sliderValue)}</span>
                        </span>
                    </span>
                </SliderPrimitive.Thumb>
            </SliderPrimitive.Root>
        </div>
    )
```

`theme.spacing(1)` is 8 px, so `root`'s padding is `p-2`, not `p-1`. `Typography variant="caption"` is a `<span>` at 12 px / 1.66 / 0.03333em.

- [ ] **Step 3: Rewrite `VolumeSlider.test.jsx`'s interaction**

The current test drives MUI through `fireEvent.mouseDown(slider, { clientX: 75 })` with a mocked 100 px `getBoundingClientRect`. Radix listens for pointer events, and jsdom has no `PointerEvent`, so the mouse path cannot survive; Radix's keyboard path can, and it commits on the key (`onEndKeyDown` calls `updateValues(max, …, { commit: true })`). Replace `withSliderGeometry()` and the two `fireEvent` lines with:

```jsx
        const thumb = screen.getByRole('slider')
        thumb.focus()
        await userEvent.setup().keyboard('{End}')
```

and keep every assertion below them as it is: the writes still go to `layer-b`, and `{End}` is 100 %, whose `convertPercentToDB` is +6 dB, so `expect(savedLayerB.gain).toBeGreaterThan(-6)` still means what it meant. Add `import userEvent from '@testing-library/user-event'`, make the test `async` (it already is), and delete `withSliderGeometry` with a comment saying the keyboard path needs no geometry. The mocked rect can go; nothing else uses it.

- [ ] **Step 4: `LayerPercentOffset.jsx`**

Delete `makeStyles`, `useStyles`, and the `Typography`, `Slider`, `FormControl`, `Box`, `IconButton` imports; import the same four slider strings, `{ Button }` from `@/components/ui/button`, `{ cn }` from `@/lib/utils` and `{ ICON_BUTTON }` from `./styles`. Keep `persistOffset`, the ref, both effects and both handlers; `_onChange` becomes `([value]) => …` and drops its event argument.

| JSS rule | Tailwind |
|---|---|
| `root` + the `Box`'s `display="flex" flexDirection="column"` props | `mb-5 flex w-full flex-col` |
| `formControl` + `FormControl`'s own four rules | `relative m-2 inline-flex min-w-[50px] flex-col border-0 p-0 align-top max-md:min-w-[100px]` |
| `offsetDisplay` | `mb-[15px] flex h-12 w-[88px] flex-row items-center justify-between rounded-[5px] border border-white/10 p-2.5` |
| `switchButton` | `flex size-8 flex-row items-center justify-center rounded-[4px] p-[5px] active:bg-white/10` |
| `selectEmpty` | **deleted**, never referenced |
| the `Typography` caption's inline `{ marginBottom: 5, fontSize: 14 }` | `mb-[5px] text-[14px] leading-[1.66] tracking-[0.03333em]` — the margin does apply here, because the caption is a flex item of the column and is blockified |
| `style={type === 'perc' ? { backgroundColor: 'rgba(255,255,255,0.1)' } : {}}` | a `cn` argument, `type === 'perc' && 'bg-white/10'` |
| `style={{ width: 13, height: 18 }}` on the percentage `<img>` | `className="h-[18px] w-[13px]"` — the same box, as utilities rather than an inline style, which is what the spec's "no inline styles but the user colour" grep in Task 6 Step 6 wants |
| `style={{ fontWeight: '600', lineHeight: 1.5 }}` on `ms` | `text-base leading-normal font-semibold tracking-[0.00938em]` |

The slider becomes the same three primitives with **no** value bubble (`valueLabelDisplay="off"`), `min={-100} max={100}`, `ref={offsetSliderRef}` on `Root` and `aria-labelledby="layer-offset-label"` on `Thumb`. The two `IconButton`s become `<Button type="button" variant="plain" size="icon-app" className={cn(ICON_BUTTON, …)}>` keeping `ref`, `aria-label` and `aria-pressed` verbatim.

- [ ] **Step 5: `LayerPopup.jsx`**

Delete `withStyles`, `styles`, and the `Box`, `Typography`, `IconButton` imports; keep `StepsDisplay`, `onNumberOfStepsChange`, `increaseSteps`, `decreaseSteps` and the `Limits` guard exactly.

| JSS rule | Tailwind |
|---|---|
| `root` | `absolute -top-[253px] left-0 z-[100] flex h-[257px] min-h-[48px] w-[155px] flex-col items-center justify-start rounded-lg bg-[#333333] shadow-[0px_0px_2px_rgba(0,0,0,0.15),0px_4px_6px_rgba(0,0,0,0.15)] [transition:opacity_0.2s_ease-in]` |
| `offsetSlider` | `w-full px-2.5 py-[5px]` |
| `stepCount` | `rounded-[4px] bg-white/10 px-2.5 py-[5px]` |
| `stepButtons` | `size-[30px] rounded-full bg-white/10 p-0` |
| `stepControls` | `mt-2.5 flex flex-row items-center justify-between` |
| `stepsInput` | `m-0 w-5 border-none bg-transparent p-0 text-center text-white outline-none [font:13.3333px_Arial]` |
| `hidden` | `layerSettingsClasses.hidden` — import it rather than keeping a second copy |
| `style={{ borderBottom: 'thin solid rgba(255,255,255,0.1)', padding: 20 }}` | `border-b border-white/10 p-5` |
| `style={{ width: '100%' }}` | `w-full` |

The dead `theme.breakpoints.down('md')` block on `root` (its body is a comment) goes. The `Steps` caption is `<span id="step-count" className="text-[14px] leading-[1.66] tracking-[0.03333em]">`: **no** margin, because MUI's `gutterBottom` puts `margin-bottom: 0.35em` on an inline `<span>` inside a block parent, where it does nothing.

The `<input readOnly aria-label="Number of steps">` keeps its bare markup, but stops depending on `src/index.css`. Today its font comes from `input:not([data-slot="input"]):not([class*="Mui"]) { font: revert }`, which hands Chrome's own control metrics back after preflight's `button,input,…{font:inherit}` took them away. Task 5 Step 6 deletes that rule, so `[font:13.3333px_Arial]` in `classes.stepsInput` above says the same thing at the one element that wants it. `400 13.3333px Arial` is exactly what `revert` resolves to in the headless Chrome every baseline screen was shot in; the `font` shorthand also resets `line-height` to `normal`, which is the other half of what `revert` was doing, and none of the other utilities in that string touch a font property, so there is no `cn` ordering to worry about. Pinning it is a small improvement as well: Firefox and Safari `revert` to a different control font, and now they will not.

The minus and plus stay `<img>` and take their file's own size as utilities, for the reason in **Measured values**: `<img alt='' src={Minus} className="h-1 w-[14px]" />` (14 × 4) and `<img alt='' src={Plus} className="size-[14px]" />` (14 × 14).

- [ ] **Step 6: `VolumePopup.jsx`**

Delete `withStyles`, `styles`, and the `Box`, `Typography`, `IconButton` imports; import `layerSettingsClasses`'s `hidden`.

| JSS rule | Tailwind |
|---|---|
| `root` | `absolute -top-[60px] right-[-100px] z-[100] flex h-16 w-[236px] flex-row items-center justify-start rounded-lg bg-[#333333] shadow-[0px_0px_2px_rgba(0,0,0,0.15),0px_4px_6px_rgba(0,0,0,0.15)] [transition:opacity_0.2s_ease-in] max-sm:right-[-55px]` |
| `mixerButton` | `mx-2 flex size-[30px] flex-row items-center justify-center rounded-full bg-white/10 p-0 max-md:size-8` |
| `containerSoloMute` | `ml-2 flex flex-1 flex-row items-center justify-between` |
| `volumeSliderContainer` | `ml-2 [flex:2]` — its `flexDirection` and `alignItems` never applied, the rule sets no `display` |
| `offsetSlider`, `stepCount`, `stepButtons`, `stepControls` | **deleted**, never referenced (copy-paste from `LayerPopup`) |
| `style={isSoloed ? { backgroundColor: 'rgba(255,255,255,0.35)' } : {}}` | a `cn` argument, `isSoloed && 'bg-white/35'` — same for `selectedLayer.isMuted` |

`aria-label`, `aria-pressed` and both refs stay on the two buttons.

- [ ] **Step 7: `LayerInstrument.jsx`**

Delete the `Box`, `Typography`, `IconButton` imports; keep both `useState`s, the effect, `onInstrumentSelect` and `onArticulationSelect`, and every `id`, `ref` and `key`. The wrapper gets `data-test="instrument-popup" data-open={String(showInstrumentsPopup)}`.

| inline style | Tailwind |
|---|---|
| `{ borderBottom: showX ? 'thin solid rgba(255,255,255,0.1)' : 'none' }` | `cn(classes.rectButton, showX ? 'border-b border-white/10' : 'border-b-0')` |
| `{ display:'flex', justifyContent:'flex-start', flex: 1 }` | `flex flex-1 justify-start` |
| `{ flex: showInstrumentsList ? 7 : 5, display:'flex', justifyContent:'flex-start' }` | `cn('flex justify-start', showInstrumentsList ? '[flex:7]' : '[flex:5]')` |
| `{ flex: 3, textAlign:'left', textTransform:'Capitalize' }` | `m-0 [flex:3] text-left text-base font-normal leading-6 tracking-[0.00938em] capitalize` |
| `{ textAlign:'left', textTransform:'Capitalize' }` | `m-0 text-left text-base font-normal leading-6 tracking-[0.00938em] capitalize` |
| `{ display:'flex', justifyContent:'flex-end', flex: 1 }` | `flex flex-1 justify-end` |
| `{ justifyContent:'space-between' }` on the list rows | `justify-between` |
| `{ display:'flex', flexDirection:'column' }` | `flex flex-col` |
| `{ display:'flex', flexDirection:'column', maxHeight:300, overflow:'scroll' }` | `flex max-h-[300px] flex-col overflow-scroll` |

`ref={instrumentsListRef}` is set inside a `map`, so it ends up on the last row; that is what it does today and the click-away depends on nothing else, so leave it and say so in the commit body.

The six `<img>` elements stay bare markup and take their file's own size as utilities, so Task 5 Step 6 can delete `img:not([data-slot])`: the four arrows (`leftArrow.svg` and `rightArrow.svg`, both 8 × 14, at lines 74, 85, 121 and 129 of the file today) get `className="h-[14px] w-2"`, and the two conditional checks (`check.svg`, 14 × 10, at lines 103 and 146) get `className="h-[10px] w-[14px]"`. Sizes read off the `<svg width height>` in `resources/svg/`, not guessed.

- [ ] **Step 8: Un-skip the last `LayerSettings` test and run everything**

```bash
corepack yarn -s vitest run src/components/play
corepack yarn -s test && corepack yarn -s lint && corepack yarn -s build
```

Expected: green and silent. A `Missing 'aria-label'` style warning from Radix means a label prop landed on `Root` instead of `Thumb`.

Then, on the same build, the keyboard gate — this task changes what is inside three of the popups `keyboard.py` opens:

```bash
(npx -y serve@14 -s build -l 3104 >/dev/null 2>&1 &)
python3 docs/ui-baseline/keyboard.py --base http://localhost:3104 --port 9409
pkill -f 'serve -s build -l 3104'
```

Expected: 30/30, unchanged from Task 3.

- [ ] **Step 9: Pixel check on the popup screens**

```bash
(npx -y serve@14 -s build -l 3104 >/dev/null 2>&1 &)
python3 docs/ui-baseline/capture.py --base http://localhost:3104 --out /tmp/pr3-popups --port 9405
python3 docs/ui-baseline/compare.py /tmp/pr3-popups
pkill -f 'serve -s build -l 3104'
```

`14`–`18` and `22` are this task's; `07`, `08` and `21` carry the mixer's volume sliders and move with it. Read `/tmp/pr3-popups/diff-14-layer-popup.png` first: the popup is 155 × 257 at `left: 0; top: -253` from a 32 px pill sitting at y 840, so it occupies y 587–844 with its `Steps` rule 65 px down. If the sliders read as too thick or too pale, the rail is `h-0.5` and `bg-current/38` and the range is opaque — not the generated `Slider`'s `h-1 bg-muted`; `src/components/ui/slider.jsx` stays untouched in this PR, as PR 2 ruled. If the minus, plus, arrows or check have shrunk, one of them is missing the explicit size from Step 5 or Step 7 and preflight has clamped it into its button's content box.

- [ ] **Step 10: Commit**

```bash
git add src/components/play/layer-settings
git commit  # subject: "Move the layer, instrument and volume popups to shadcn"
```

---

### Task 5: Delete Material UI

**What `src/index.css` is at `1ea0b7e`, so the diffs below are not blind:** PR 2's Task 5b **already pruned** `h1, h2, h3, h4, h5, h6, p { font-size: revert; font-weight: revert; margin: revert }` (`HeaderAvatar`'s `<h3>` got an explicit `mb-[1em]` in exchange), so there is no shim to prune here. What is left, and what happens to each, is the table in **Measured values → Rules in `src/index.css` at `1ea0b7e`**. `react-color` is **already gone** from `package.json`; `@material-ui/core`, `@material-ui/icons`, `react-loader-spinner` and `prop-types` are not.

**Files:**
- Modify: `src/App.jsx`, `src/index.css`, `src/setupTests.js`, `src/components/play/PlayUI.jsx`, `src/components/play/PlayUI.test.jsx`, `src/components/icons/icons.test.jsx`, `package.json`, `yarn.lock`
- Modify: `docs/superpowers/specs/2026-09-07-shadcn-ui-migration-design.md` (three rows of the token table, Step 2)
- Modify, for PR 2's booked follow-ups (Step 11): `src/components/header/AppMenu.jsx` + `AppMenu.test.jsx`, `src/components/header/HeaderAvatar.jsx` + `HeaderAvatar.test.jsx`, `src/components/header/Header.jsx`, `src/components/rounds-list-route/RoundsListRoute.jsx` + `RoundsListRoute.test.jsx`, `src/components/dialogs/SignInDialog.jsx`, `docs/ui-baseline/keyboard.py`
- Create: `src/components/icons/material-paths.js`

- [ ] **Step 1: `src/App.jsx`**

Delete the `unstable_createMuiStrictModeTheme`/`ThemeProvider` import, the `CssBaseline` import, the whole `theme` `useMemo` and the two provider elements. `React` is still needed for JSX; the `useMemo` import goes with the theme.

```jsx
  return (
    <div className="App" data-test="app">
      <Router>
        <ErrorBoundary>
          <Header />
          <Switch>
            <Route path="/rounds" component={RoundsListRoute} />
            <Route path="/play" component={PlayRoute} />
            <Route path="/" component={LandingPageRoute} />
          </Switch>
          <SignInDialog />
          <RenameDialog />
          <DeleteRoundDialog />
        </ErrorBoundary>
      </Router>
    </div>
  );
```

The theme's four facts do not disappear with it: the palette lives in `src/index.css`'s `:root`, the breakpoints in its `@theme`, `shape.borderRadius: 32` in `MUI_BUTTON`'s `rounded-full` and each dialog's own radius, and `typography.button.textTransform: 'none'` in the absence of any `uppercase` utility.

- [ ] **Step 2: Move `CssBaseline`'s body type into `src/index.css`**

This is the step that can move every screen at once. `CssBaseline` set, unlayered, on `body`: `font-family: "Roboto","Helvetica","Arial",sans-serif`, `font-size: 0.875rem`, `line-height: 1.43`, `letter-spacing: 0.01071em`, `background-color`, `color`, and the two font-smoothing properties. `src/index.css` today carries only the last four. Without the first three, the browser's own 16 px at `line-height: 1.5` (from Tailwind's preflight on `html`) takes over and every line of text in the app moves.

In the `@theme` block, replace `--font-sans`:

```css
  /* CssBaseline set "Roboto","Helvetica","Arial",sans-serif on the body, unlayered, which beat
     the system stack that used to be here, so that is the stack every screen in
     docs/ui-baseline was photographed with (no Roboto is served, so it renders as Helvetica).
     The spec's token table names the system stack; keeping it would change every glyph on
     every screen, which is a redesign and not this migration, so the value CssBaseline used is
     copied verbatim and the deviation is written up in the PR body. */
  --font-sans: "Roboto", "Helvetica", "Arial", sans-serif;
```

In the `@layer base` `body` rule: drop `!important` from `background-color` (the unlayered rule it was fighting is gone) and add, next to the letter-spacing PR 2 already moved here:

```css
    /* The other two thirds of MUI's body2, which CssBaseline set on the body and everything in
       the app inherits. */
    font-size: 0.875rem;
    line-height: 1.43;
```

Delete the `[data-slot="dialog-title"] { font-family: inherit }` rule at the bottom of the file: its whole reason was that `CssBaseline`'s family differed from `--font-heading`, and `--font-heading` is `var(--font-sans)`. Keep `[data-slot="dialog-overlay"]`, whose reason is the generated overlay's own `bg-black/10 supports-backdrop-filter:backdrop-blur-xs`.

Then amend the spec's token table in the same commit — the ruling recorded when this plan was drafted says the spec is amended in PR 3, and this is the step that makes it untrue, so this is where it is corrected. PR 2's merged body books a second row of the same table. Three rows in `docs/superpowers/specs/2026-09-07-shadcn-ui-migration-design.md`:

- **`type`**: replace "system stack unchanged (`-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, …`)" with `"Roboto", "Helvetica", "Arial", sans-serif`, and add the source: "MUI `CssBaseline`, unlayered on `body`; every screen in `docs/ui-baseline/` was photographed with it, and no Roboto is served, so it renders as Helvetica. The spec originally named the system stack; keeping it would have changed every glyph on every screen, which is a redesign and not this migration."
- **`--accent` (hover)**: it is white at 20 %, but that is the app's *selected/open* tint (`bg-white/20` on an open popup's trigger), not its hover. MUI's `IconButton`/`MenuItem` hover is white at 8 %, which is spelled at the call site as `hover:bg-white/8` in `Button`'s `plain` variant and in `AppMenuItem`. Rename the row to "`--accent` (selected)" and add a sentence naming the 8 % hover and where it lives.
- **`--border`**: it is white at 10 %, which is right for borders, but MUI's `Divider` is `divider`, white at 12 %, which the app draws with `bg-white/12` on `Separator` and in `MUI_PRIMARY`/`MUI_SECONDARY`'s disabled fill. Add that to the row rather than moving the token: changing `--border` would repaint every border in the app.

None of the three changes a line of CSS — they make the spec describe what ships. Say in the commit body that the token table now matches the code.

- [ ] **Step 3: `src/setupTests.js`**

Delete the `FIND_DOM_NODE_WARNING` constant and the `console.error` wrapper around it (13 lines), leaving the jest-dom import, the `configure`, the `afterEach(cleanup)` and the jsdom shims. Nothing calls `findDOMNode` any more, and leaving a filter that can never fire hides the next warning someone introduces.

- [ ] **Step 4: `PlayUI.jsx`'s two class names**

Delete the `withStyles` and `PropTypes` imports, the `styles` object and `PlayUI.propTypes`; the export becomes `connect(mapStateToProps, mapDispatchToProps)(PlayUI)` and the named `export class PlayUI` stays (the test imports it). At the top, next to `PATTERN_SAVE_DEBOUNCE_MS`:

```js
// The two class names PlayUI puts on SVG.js nodes. They came from JSS; SVG.js only ever needed
// the strings, and Tailwind emits both because they appear here as literals.
const BUTTON_CLASS = 'cursor-pointer'
const BUTTON_ICON_CLASS = 'pointer-events-none'
```

Then `this.props.classes.button` → `BUTTON_CLASS` (three sites: the playback toggle, `addLayer`'s layer graphic, the step graphic) and `this.props.classes.buttonIcon` → `BUTTON_ICON_CLASS` (one site). `fadeIn`, `fadeOut` and `smallCross` are deleted with the rest of `styles`; nothing has ever referenced them.

In `PlayUI.test.jsx`, delete `classes: {},` from both `makeUI` and `makeBatchedUI`. No assertion changes — the suite never touched `classes`.

- [ ] **Step 5: The icons test stops depending on `@material-ui/icons`**

Generate the fixture from the installed package while it is still installed, so the strings are provably copied and not retyped:

```bash
node -e '
const fs = require("fs");
const names = ["Add","ArrowBack","Call","CallEnd","ChevronRight","ExpandMore","Fullscreen","Image","Mic","MicOff","MoreHoriz","Share"];
const entries = names.map((n) => {
  const src = fs.readFileSync("node_modules/@material-ui/icons/" + n + ".js", "utf8");
  const ds = [...src.matchAll(/d: "([^"]+)"/g)].map((m) => m[1]);
  return "    " + n + "Icon: " + JSON.stringify(ds) + ","
});
fs.writeFileSync("src/components/icons/material-paths.js",
`/**
 * The path data of the twelve Material UI icons the app copied into src/components/icons/,
 * lifted straight out of node_modules/@material-ui/icons before that package was removed.
 * icons.test.jsx compares the local components against this, which is what keeps the glyphs
 * identical now that there is nothing left to compare them to.
 *
 * Regenerate only by re-installing @material-ui/icons and re-running the script in
 * docs/superpowers/plans/2026-09-07-shadcn-migration-pr3-play-route.md, Task 5, Step 5.
 */
export const MATERIAL_PATHS = {
${entries.join("\n")}
}
`);
'
```

Expected: twelve entries, each an array of one `d` string (`AddIcon: ["M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"]`, and so on). Then rewrite the head of `icons.test.jsx`: drop the twelve `MuiX` imports, import `{ MATERIAL_PATHS }` from `./material-paths`, and replace the `pairs` array and the `it.each` with

```jsx
describe('local icons', () => {
    it.each(Object.keys(MATERIAL_PATHS))('%s draws the Material icon\'s path data', (name) => {
        const Ours = icons[name]
        const { container } = render(<Ours />)
        expect([...container.querySelectorAll('path')].map(p => p.getAttribute('d'))).toEqual(MATERIAL_PATHS[name])
        expect(container.querySelector('svg')).toHaveAttribute('viewBox', '0 0 24 24')
    })
```

leaving the second test (`passes className and other props through to the svg`) untouched. Run `corepack yarn -s vitest run src/components/icons` **before** removing the package and confirm 13 passing, so the fixture is proved against the real icons once.

- [ ] **Step 6: Delete the two `revert` rules, once nothing needs them**

The heading shim is already gone — PR 2's Task 5b took it, and `HeaderAvatar`'s `<h3>` carries `mb-[1em]` instead — so there is nothing to decide there. The two rules left in the base layer both exist for the play route, and Tasks 2 and 4 have just given every element that leaned on them an explicit value. Prove that before deleting, with the greps that name the consumers:

```bash
# Bare inputs that are not the shadcn Input. Expected: only LayerPopup's steps counter.
grep -rn '<input' src --include='*.jsx'
# That counter must now spell its own font.
grep -n 'font:13.3333px_Arial' src/components/play/layer-settings/LayerPopup.jsx
# Every bare <img>, and every one of them must now carry a width and a height utility.
grep -rn '<img' src --include='*.jsx'
# The two rules, before they go.
grep -n 'revert' src/index.css
```

Expected: eleven `<img>` elements — `EffectThumbControl` 2, `LayerPopup` 2, `LayerInstrument` 6, `LayerPercentOffset` 1 — each with an `h-*`/`w-*` (or `size-*`) pair in its `className`; one bare `<input>`, carrying `[font:13.3333px_Arial]`; and exactly two `revert` rules in `src/index.css`. If any `<img>` is still bare, go back to Task 2 Step 7 or Task 4 Step 5/Step 7 and give it its file's size rather than keeping the rule.

Then delete both rules from `@layer base`, with their comments:

```
  input:not([data-slot="input"]):not([class*="Mui"]) { font: revert }
  img:not([data-slot]) { max-width: revert; height: revert }
```

Step 9's full pixel pass is what proves it. If `14`, `16`, `17` or `19` moves and the diff is a shrunken glyph, an `<img>` lost its size and preflight clamped it; if `14` moves and the diff is the steps number, the input's `[font:…]` did not land — check that no other utility in `classes.stepsInput` sets a font property, and that the string reads `[font:13.3333px_Arial]` with an underscore, not a space.

- [ ] **Step 7: Remove the packages**

```bash
grep -rn "@material-ui" src            # expected: nothing
grep -rn "react-loader-spinner" src    # expected: nothing
grep -rn "prop-types" src              # expected: nothing
CYPRESS_INSTALL_BINARY=0 corepack yarn remove @material-ui/core @material-ui/icons react-loader-spinner prop-types
```

`@material-ui/styles`, which five play-route files imported directly, is not in `package.json` — it comes in under `@material-ui/core` and leaves with it. `prop-types` goes only if its grep is empty (React 19 ignores `propTypes` on function components anyway, so a leftover would be dead code, not a warning). `react-color` is **not** in this list: PR 2's own Task 5 removed it, and `grep -n react-color package.json` at `1ea0b7e` is empty. The only traces left are two lines of prose — `ColorGrid.jsx`'s doc comment and `ColorGrid.test.jsx`'s test name — which Task 6 Step 6 expects to find and leaves alone.

- [ ] **Step 8: Run the suite**

```bash
corepack yarn -s test && corepack yarn -s lint && corepack yarn -s build
```

Expected: green and silent, and the build's gzip size drops sharply (record it for the report — `@material-ui/core` is the single biggest dependency in the bundle). A `Cannot find module '@material-ui/…'` here means a test file still imports it: `Header.test.jsx` (Task 2, Step 11) and `icons.test.jsx` (Step 5) are the only two that ever did.

- [ ] **Step 9: The full pixel pass**

```bash
(npx -y serve@14 -s build -l 3105 >/dev/null 2>&1 &)
python3 docs/ui-baseline/capture.py --base http://localhost:3105 --out /tmp/pr3-nomui --port 9406
python3 docs/ui-baseline/compare.py /tmp/pr3-nomui
pkill -f 'serve -s build -l 3105'
```

Record all 22 numbers. This is the run where the type reconciliation is proved: if **every** screen moved by a similar small amount and the diffs are text everywhere, `--font-sans` or the body's `font-size`/`line-height` did not land. If only the dialogs moved, it is `[data-slot="dialog-title"]`. If only the play route's popups moved, it is one of the two `revert` rules Step 6 deleted — the diff says which: a shrunken glyph is an `<img>` missing its size, a re-typeset number is the steps counter missing `[font:13.3333px_Arial]`. Run `keyboard.py` against the same build too (`python3 docs/ui-baseline/keyboard.py --base http://localhost:3105 --port 9409`, expected 30/30): deleting `CssBaseline` takes MUI's `TrapFocus` out of the app entirely, and nothing else in this task would catch that.

- [ ] **Step 10: Commit**

```bash
git add src/App.jsx src/index.css src/setupTests.js src/components/play/PlayUI.jsx src/components/play/PlayUI.test.jsx \
        src/components/icons/material-paths.js src/components/icons/icons.test.jsx package.json yarn.lock \
        docs/superpowers/specs/2026-09-07-shadcn-ui-migration-design.md
git commit  # subject: "Remove Material UI from the app"
```

- [ ] **Step 11: Clear the four follow-ups PR 2 left in the shell**

PR 2's merged body books these against PR 3 by name. They are behaviour, not styling, so they are their own commit and they land here rather than in Task 6, whose only job is the React bump. None of them touches a class string, so no screen can move; run the gate anyway in Step 12, because "cannot move a pixel" is a claim and the gate is the proof.

**(a) The duplicate `<SignInDialog />`.** `src/components/rounds-list-route/RoundsListRoute.jsx` renders one at the end of its fragment, on top of the one `src/App.jsx` mounts, and both are bound to `state.display.isShowingSignInDialog`, so `/rounds` mounts two Radix dialogs that both try to trap focus on the same flag. Delete the element, its `import SignInDialog from '../dialogs/SignInDialog'` and the comment above it that says PR 3 would do this. `App.jsx`'s copy is outside the router's `Switch`, so it is mounted on `/rounds` too and nothing is lost. If `RoundsListRoute.test.jsx` asserts on a sign-in dialog, it must now render the route inside something that provides `App.jsx`'s copy, or drop the assertion — check before deleting.

**(b) `HeaderAvatar.onColorChosen` throws when `state.users` has no entry for the user.** On `/rounds` nobody has joined a round, so `state.users` is empty, `_.find(usersClone, { id: user.id })` is `undefined` and `me.color = hex` throws after the colour has already been saved to Firestore and to `state.user`. The write is the part that matters; the `users` clone is only there to repaint other people's avatars in the current round.

```jsx
	const onColorChosen = ({ hex }) => {
		setUserColor(hex)
		firebaseContext.updateUser(user.id, { color: hex })
		// state.users holds the people in the round being played, so it is empty on /rounds and
		// on the landing page. The colour is already saved above; this only keeps the round's
		// own copy of this user in step, and there is nothing to keep in step when it is absent.
		const me = _.find(users, { id: user.id })
		if (!me) return
		const usersClone = _.cloneDeep(users)
		_.find(usersClone, { id: user.id }).color = hex
		setUsers(usersClone)
	}
```

Add a `HeaderAvatar.test.jsx` case: render with `users` empty, click a swatch, and assert `firebase.updateUser` was called and nothing threw.

**(c) Unused `connect` entries.** Verified against `1ea0b7e`; remove exactly these, and their now-unused named imports from `../../redux/actions`:

| file | drop from `mapDispatchToProps` | drop from `mapStateToProps` |
|---|---|---|
| `rounds-list-route/RoundsListRoute.jsx` | `setIsShowingSignInDialog`, `setRedirectAfterSignIn` | — |
| `header/Header.jsx` | `setUserDisplayName`, `setSignUpDisplayName` | `signupDisplayName` |
| `dialogs/SignInDialog.jsx` | `setSignUpDisplayName`, `setRounds` | `user` |

`SignInDialog`'s component signature destructures its props, so drop `setSignUpDisplayName` and `setRounds` from the parameter list too. Re-run `grep -n "setUserDisplayName\|setSignUpDisplayName\|signupDisplayName" src/components/header/Header.jsx` after the edit and expect nothing; the same for the other two.

**(d) ArrowUp on a freshly opened `AppMenu` lands on the second-to-last item.** `AppMenu`'s roving handler computes `at = items.indexOf(document.activeElement)`, and on open the active element is the content itself, so `indexOf` returns `-1` and ArrowUp goes to `(-1 - 1 + n) % n`, which is `n - 2`. MUI's `MenuList` landed on the last item. One line, in `src/components/header/AppMenu.jsx`:

```js
        const at = items.indexOf(document.activeElement)
        const next =
            event.key === 'Home' ? 0 :
            event.key === 'End' ? items.length - 1 :
            event.key === 'ArrowDown' ? (at + 1) % items.length :
            // at === -1 means focus is still parked on the content, where onOpenAutoFocus put
            // it. ArrowDown already reads that as "before the first item"; ArrowUp has to read
            // it as "after the last one", which the generic (at - 1 + n) % n does not.
            at <= 0 ? items.length - 1 : at - 1
```

Add an `AppMenu.test.jsx` case: open a menu, press ArrowUp without pressing anything else, and assert focus is on the last item. Add the same as a `keyboard.py` case in `row_menu`, not `avatar_menu`: the avatar menu has one item, so "the last item" and "the only item" are the same element and the case would prove nothing; the rounds-list row menu has three (Rename, Duplicate, Delete). The total goes from 30 to 31. Menu typeahead is the other half of that follow-up and is **not** done: MUI's `MenuList` matched a typed prefix, and no menu in this app has more than four items, so it earns nothing. Say so in the PR body rather than leaving it looking forgotten.

- [ ] **Step 12: Prove Step 11 moved nothing, and commit**

```bash
corepack yarn -s test && corepack yarn -s lint && corepack yarn -s build
(npx -y serve@14 -s build -l 3105 >/dev/null 2>&1 &)
python3 docs/ui-baseline/keyboard.py --base http://localhost:3105 --port 9409
python3 docs/ui-baseline/capture.py --base http://localhost:3105 --out /tmp/pr3-followups --port 9406
python3 docs/ui-baseline/compare.py /tmp/pr3-followups
pkill -f 'serve -s build -l 3105'
```

Expected: the same 22 numbers as Step 9, within noise, and `keyboard.py` 31/31.

```bash
git add src/components/header/AppMenu.jsx src/components/header/AppMenu.test.jsx \
        src/components/header/HeaderAvatar.jsx src/components/header/HeaderAvatar.test.jsx \
        src/components/header/Header.jsx \
        src/components/rounds-list-route/RoundsListRoute.jsx src/components/rounds-list-route/RoundsListRoute.test.jsx \
        src/components/dialogs/SignInDialog.jsx docs/ui-baseline/keyboard.py
git commit  # subject: "Clear the shell follow-ups PR 2 left for this PR"
```

---

### Task 6: React 19

**Where `forwardRef` is, at `1ea0b7e`:** `grep -rn "forwardRef" src` finds exactly four — `src/components/ui/button.jsx`, `src/components/ui/dialog.jsx` (`DialogOverlay`), `src/components/fields/OutlinedField.jsx` and `src/components/header/AppMenu.jsx` (`AppMenuItem`). The first three are this task's; `AppMenuItem` stays as it is, because a `forwardRef` component still works unchanged on React 19 and unwrapping it would be churn in a PR 2 file for no gain. Re-run the grep before starting anyway — Tasks 2 to 5 must not have added a fifth.

**Files:**
- Modify: `package.json`, `yarn.lock`, `src/components/ui/button.jsx`, `src/components/ui/dialog.jsx`, `src/components/fields/OutlinedField.jsx`

- [ ] **Step 1: Upgrade**

```bash
corepack yarn add react@19 react-dom@19
corepack yarn why @testing-library/react   # 16.3.3, which supports React 19
```

`@testing-library/react` stays at 16, `react-redux` 9 already supports 19, `react-router-dom` stays at 5. Nothing else moves.

- [ ] **Step 2: Drop the three `forwardRef` wrappers**

React 19 passes `ref` as an ordinary prop, so all three become plain functions.

`src/components/ui/button.jsx` — restore what the generator wrote, with `ref` in the props:

```jsx
function Button({ className, variant = "default", size = "default", asChild = false, ...props }) {
  const Comp = asChild ? Slot.Root : "button"
  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}
```

(`ref` arrives inside `...props` and reaches `Comp`; delete the `// forwardRef is only needed on React 18` comment and the `React.forwardRef` wrapper, and keep the `import * as React` line only if something else in the file still uses it — it does not, so remove it too.)

`src/components/ui/dialog.jsx` — the same for `DialogOverlay`, deleting its `forwardRef is only needed on React 18` comment. `React.forwardRef` on line 38 is that file's only use of `React`, so `import * as React from "react"` goes with it; `DialogPrimitive`, `cn`, `Button` and `XIcon` all stay.

`src/components/fields/OutlinedField.jsx` — unwrap and take `ref` from props:

```jsx
export function OutlinedField({ ref, id, label, value, defaultValue, onChange, /* … the rest unchanged … */ }) {
```

deleting the `forwardRef is only needed on React 18; drop it with the React 19 upgrade in PR 3` line from its doc comment. Its callers (`SignInDialog`'s six refs, `ShareDialog`'s one) do not change: they still read `ref.current.querySelectorAll('input')[0]`.

- [ ] **Step 3: Run the suite and read every warning**

```bash
corepack yarn -s test && corepack yarn -s lint && corepack yarn -s build
```

Expected: green and silent. React 19's likely complaints, and what each means:

- `Accessing element.ref was removed` — something reads `.ref` off an element; nothing in this app does.
- `Support for defaultProps will be removed from function components` — a dependency, and the one to watch is `react-router-dom` 5. Note which component it names; it decides Step 5.
- `A props object containing a "key" prop is being spread` — a call site to fix, not a dependency issue.

- [ ] **Step 4: Verify the router, for real**

`capture.py` is the router test: it loads `/`, opens a dialog, signs in as a guest, is redirected to `/play/<id>`, navigates to `/rounds` through the header's back button, and clicks back into `/play/<id>` — and it asserts `location.pathname` at four of those points, so a router that stops navigating aborts the run instead of producing a wrong screenshot.

```bash
(npx -y serve@14 -s build -l 3106 >/dev/null 2>&1 &)
python3 docs/ui-baseline/capture.py --base http://localhost:3106 --out /tmp/pr3-react19 --port 9407
python3 docs/ui-baseline/compare.py /tmp/pr3-react19
pkill -f 'serve -s build -l 3106'
```

Then, by hand, with `corepack yarn start`: load `/`, sign in as a guest, watch the address bar change to `/play/<id>`, use the browser's back and forward buttons, reload on `/play/<id>` directly (a deep link), go to `/rounds`, open a round, and use the header's back button. Keep the console open the whole time. Passing means: every navigation lands, the deep-link reload renders the round, and the console has no React or router warning.

- [ ] **Step 5: Only if Step 3 or Step 4 failed — upgrade to react-router 6**

The spec keeps react-router-dom at 5 unless it misbehaves. If it does, this is the shape of the fallback, as its own commit before the gate:

```bash
corepack yarn add react-router-dom@6
```

- `src/App.jsx`: `<Switch>` → `<Routes>`; `component={X}` → `element={<X />}`; `/play` becomes `/play/*` and `/` becomes `/*`, because v6 matches whole segments.
- Create `src/lib/withRouter.jsx`, because v6 dropped `withRouter` and four class components read `history` and `location` from route props:

```jsx
import { useLocation, useNavigate, useParams } from 'react-router-dom'

/** react-router 6 dropped withRouter. This is the same three props, from the hooks. */
export function withRouter(Component) {
    return function WithRouter(props) {
        const location = useLocation()
        const navigate = useNavigate()
        const history = { push: navigate, replace: (to) => navigate(to, { replace: true }) }
        return <Component {...props} location={location} history={history} params={useParams()} />
    }
}
```

  wrap `Header` (which already uses `withRouter`), `LandingPageRoute`, `RoundsListRoute` and `PlayRoute` in it, and replace `useHistory()` with `useNavigate()` in `DeleteRoundDialog` and `ProjectName` (`history.push(x)` → `navigate(x)`).
- `src/test/test-utils.jsx`: `LocationProbe` becomes `function LocationProbe() { return <div data-test="location">{useLocation().pathname}</div> }`, and `MemoryRouter initialEntries` is unchanged.
- `PlayRoute.test.jsx` renders `<Route path="/play" component={PlayRoute} />`; it becomes `<Routes><Route path="/play/*" element={<PlayRoute />} /></Routes>`.
- `PlayRoute.getRoundIdFromPath()` reads `this.props.location.pathname.split('/play/')[1]`, which the shim keeps working.

Then re-run Steps 3 and 4 before going on. This is the branch of the plan that costs the most if it is taken unnecessarily, so take it only on a real failure from Step 3 or Step 4, and record what failed.

- [ ] **Step 6: The grep gate**

```bash
grep -rn "@material-ui\|withStyles\|makeStyles\|style={{" src
```

Expected: exactly the two `style={{ '--user-color': user.color }}` lines in `src/components/header/HeaderAvatar.jsx`, which the spec names as the one permitted inline style, and nothing else.

```bash
grep -rn "react-loader-spinner\|react-color\|immutability-helper" src package.json
```

Expected: nothing in `package.json`, and in `src` exactly two lines of prose — `ColorGrid.jsx`'s doc comment (*"react-color's CirclePicker, in Tailwind…"*) and `ColorGrid.test.jsx`'s test name. Both describe what `react-color` used to do and are the reason the `circle-picker` class and the `title` attributes are still on the swatches for `capture.py`. Report the two lines; do not edit PR 2's files to make a grep quieter.

```bash
grep -rn "prop-types\|PropTypes" src            # expected: nothing
grep -rn "forwardRef" src/components/ui src/components/fields   # expected: nothing
grep -rn "forwardRef" src                        # expected: only AppMenuItem in header/AppMenu.jsx
grep -rn "MUI_BUTTON\|MUI_PRIMARY\|MUI_SECONDARY" src/components/dialogs/AppDialog.jsx  # expected: nothing
grep -rn "revert" src/index.css                  # expected: nothing
```

- [ ] **Step 7: The full gate**

```bash
corepack yarn -s lint && corepack yarn -s test && corepack yarn -s build
(npx -y serve@14 -s build -l 3106 >/dev/null 2>&1 &)
python3 docs/ui-baseline/capture.py --base http://localhost:3106 --out /tmp/pr3-final --port 9407
python3 docs/ui-baseline/compare.py /tmp/pr3-final
pkill -f 'serve -s build -l 3106'
```

Record the number for all 22 screens in the report and in the PR body. For any screen over 0.5 %, open `/tmp/pr3-final/diff-<name>.png` beside `docs/ui-baseline/<name>.png` and the candidate, name the rule that moved, and fix it in the component — or, if it is a preflight interaction, in `src/index.css` scoped to the affected element, never a blanket un-reset. Re-run until every screen holds or the residual is understood and can be written up.

Differences that are expected, and that go in the PR body with their diff images if they cost more than the threshold:

- the round's loading spinner is the shadcn `Spinner`'s rotating arc where it was `react-loader-spinner`'s two expanding rings, at the same 100 px and the same `#00BFFF`. The spec's component map asks for this; no baseline screen photographs the loading state.
- popup fades are unchanged (they were never MUI's `Grow`), but every migrated button now has `transition-all` where MUI transitioned only `background-color`, and presses shift it by 1 px. Neither is visible in a settled screenshot.
- the app's type is pinned to `"Roboto","Helvetica","Arial",sans-serif`, the stack `CssBaseline` used, rather than the system stack the spec's token table names. Keeping the token as written would change every glyph on every screen. This is the one deliberate deviation from the spec and it belongs in the PR body in as many words.

- [ ] **Step 8: The keyboard gate, scripted and then by hand**

```bash
(npx -y serve@14 -s build -l 3106 >/dev/null 2>&1 &)
python3 docs/ui-baseline/keyboard.py --base http://localhost:3106 --port 9409
pkill -f 'serve -s build -l 3106'
```

Expected: 31/31 — PR 2's 24, plus the sidebar chevron's four (Task 2 Step 12), the popups' two (Task 3 Step 8) and `AppMenu`'s ArrowUp (Task 5 Step 11). React 19 changes how refs and effects are ordered, and this script is the only thing in the plan that exercises the focus restore, the focus trap and the roving arrow keys, so it runs after the bump and not only before it.

Then by hand, on the served build, at 1300 × 900 and again at 390 × 844, for what the script does not cover: every layer-settings popup closes on `Escape` and on a click outside it; the two sliders move with the arrow keys, `Home` and `End` and announce themselves ("Volume", "Time Offset"); the solo, mute, percentage and ms buttons report `aria-pressed`. All of that except the last is new — MUI's popups had no keyboard escape at all.

- [ ] **Step 9: Commit and hand over**

```bash
git add package.json yarn.lock src/components/ui/button.jsx src/components/ui/dialog.jsx src/components/fields/OutlinedField.jsx
git commit  # subject: "Move the app to React 19"
```

Report: the 22 per-screen percentages, the gzip size before and after Task 5 (PR 2 measured JS 523.58 kB / CSS 10.55 kB gzip at `1ea0b7e`, with Material UI still bundled — that is the number to beat), the `keyboard.py` count at each gate, the list of intended differences with their diff images, and the result of the router verification (and whether Step 5 was needed).

Also list, as changes PR 2's body promised and this PR delivered: the three `MUI_*` strings moved to `src/lib/mui.js`; the spec's `type`, `--accent` and `--border` rows reconciled with what the app draws; `RoundsListRoute`'s second `<SignInDialog />` gone; `HeaderAvatar.onColorChosen` no longer throwing on `/rounds`; six unused `connect` entries removed; `AppMenu`'s ArrowUp landing on the last item. Menu typeahead was the one item of that list deliberately not done — no menu in the app has more than four items — and belongs in the body as a decision, not an omission.

And these open items, none of which is in this PR's scope:

- The mixer's layer rows are still `<div onClick>`, so a layer cannot be picked from the keyboard. Making them buttons would move `capture.py`'s `FIRST_LAYER_ROW`, which clicks `popup.children[1].children[0]`, and the row is a flex container with a slider inside it, so this is a small piece of design work rather than a swap.
- `EffectThumbControl`'s switch is a dragged SVG.js drawing with no keyboard path and no role at all: an effect cannot be turned on without a mouse. Same shape of problem as the rows, and the same reason it is not here — the drawing is the control.
- `src/components/ui/slider.jsx` is still the untouched generated component, unused by anything but `ui-smoke.test.jsx`. All three of the app's sliders are hand-composed from the Radix primitives because MUI's value bubble is a child of the thumb and the generated `Slider` renders its own thumbs. Either the generated one grows a thumb slot or it should be deleted.
- `PlayUI`'s global `keydown` listener eats Space anywhere on the play route, including on a focused button, which is why PR 2's avatar menu does not open with Space there. It predates the migration and is a real bug.
