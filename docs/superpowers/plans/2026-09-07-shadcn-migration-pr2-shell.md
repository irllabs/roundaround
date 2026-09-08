# shadcn migration, PR 2 (shell) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the app shell — the header and its three menus, the landing page, the rounds list, the five dialogs and the error boundary — off Material UI onto the shadcn components PR 1 generated, with no visible change. Material UI stays installed and keeps rendering the play route; `react-color` goes.

**Architecture:** Every migrated file drops `withStyles`/`makeStyles` and its inline styles and composes `@/components/ui/*` with Tailwind classes. Three app-level shells are added first so the four menus and five dialogs are not each re-deriving MUI's geometry: `AppDialog` (Radix Dialog dressed as MUI's `Dialog` + `DialogTitle` strip), `AppMenu` (Radix Popover dressed as MUI's `Popper` + `Grow` + `Paper` + `MenuList`, with roving arrow-key focus) and `ColorGrid` (the avatar menu's colour picker, replacing `react-color`'s `CirclePicker`). `src/App.jsx` is deliberately **not** touched: the play route still renders Material UI, so `ThemeProvider`, `CssBaseline` and the theme object stay until PR 3.

**Tech Stack:** React 18.3.1, react-redux 9.3, Redux Toolkit 2.12, react-router-dom 5, Vite 7, Vitest 3 + jsdom, @testing-library/react 16.3 + user-event 14.6, Tailwind 4.3, shadcn 4.21 components on `radix-ui` 1.6, `cn` 0.2, Python 3 + Pillow + websocket-client and headless Google Chrome for the pixel gate.

**Spec:** `docs/superpowers/specs/2026-09-07-shadcn-ui-migration-design.md`
**Predecessor:** `docs/superpowers/plans/2026-09-07-shadcn-migration-pr1-foundation.md`

## Global Constraints

- Node 22 (`.nvmrc`), yarn 1 via `corepack yarn`. After every task these pass from the repo root: `corepack yarn -s lint`, `corepack yarn -s test`, `corepack yarn -s build`. After any `package.json` change run `CYPRESS_INSTALL_BINARY=0 corepack yarn install` and commit `yarn.lock` (CI installs with `--frozen-lockfile`).
- No TypeScript: every new file is `.js`/`.jsx`.
- **Material UI stays installed.** Do not remove `@material-ui/core` or `@material-ui/icons`, do not touch `src/App.jsx`, and do not touch anything under `src/components/play/`.
- Files that may be changed: the thirteen migrated components and their tests (listed under **File structure**), plus exactly four others — `src/components/ui/button.jsx` (one new size, one new variant), `src/index.css` (three rules that the generated components cannot be given props for), `docs/ui-baseline/capture.py` (selector and input-event updates) and `package.json`/`yarn.lock` (dropping `react-color`). Nothing else.
  - **Amendment to the controller's list, with its reason:** `src/components/fields/OutlinedField.jsx` and its test are also in scope. PR 1 shipped it with an always-floating label, a 35 % outline and 16 px side padding; MUI floats the label only when the field is filled or focused, its outline is white at 23 %, and its padding is 14 px. Screen `03-signin-email` photographs two *empty* outlined fields with the label sitting inside the box, so PR 2 cannot pass its own pixel gate without changing this file. Task 1 owns the change.
- `react-loader-spinner` stays (the play route uses it). `react-color` is removed in Task 5, once `ColorGrid` has replaced its last import.
- No visual change: the pixel gate in Task 5 must report every one of the thirteen baseline screens within 0.5 % changed pixels, **or** the residual must be inspected by eye and listed in the PR body as an intended difference with its `diff-*.png`.
- Test output must be pristine (no `act()` warnings, no Radix "Missing Description" warning, no PropTypes warning, no Tone banner). Every existing test keeps passing through its `data-test`/role queries; only assertions on MUI class names may be rewritten, and there are none today.
- Commits: imperative subject under 72 chars, a body that says why, ending with these two lines exactly:
  `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`
  `Claude-Session: https://claude.ai/code/session_01Rb8iHgPPsGgjMsPQnrsYYd`
  Commit with `git -c user.name="Meriç Dağlı" -c user.email="mericda@gmail.com" commit ...`.
- Do not run `firebase`, `gh`, or `git push`. Do not edit `.github/`, `firebase.json`, `firestore.rules`, `functions/`, or `cypress/`.

## Hooks that must survive, verbatim

`data-test`: `app`, `header`, `location`, `button-get-started`, `button-sign-in-out` (carrying `signed-in` on the avatar button and `signed-out` on the Sign in button — the Cypress `login` command waits on `[data-test=button-sign-in-out].signed-in`), `button-sign-out`, `button-email`, `button-guest`, `input-email`, `input-password`, `button-sign-in`, `input-name`, `button-name`, `button-back-to-rounds`, `button-new-round`, `list-item-round`, `voice-chat`.

`aria-label`: `Back to my rounds`, `Share this round`, `More options`, `QR code for this round's link`.

DOM ids: `#header-menu-list`, `#menu-list-grow` (avatar menu and rounds-list menu), `#project-name-menu`, `#share-dialog-title`, `#rename-dialog-title`, `#delete-dialog-title`, `#orientation-dialog-title`, `#simple-dialog-title`, `#tempo-slider-label`, `#share-link` (on the `<input>` itself), `#QRCanvas`.

Classes and attributes `capture.py` selects on: `.circle-picker` and `[title="#f44336"]` on the swatches, `.round`.

`data-test` on the three sign-in fields and on the share link field stays on the **wrapper element**, which is where MUI's `TextField` puts unrecognised props today (`capture.py` reads `[data-test=input-name] input`, and `SignInDialog.test.jsx` does `within(getByTestId('input-name')).getByRole('textbox')`). Do not move it onto the `<input>`.

**Both header menus must be `Popover`, never `DropdownMenu`.** `capture.py` opens them with `element.click()`, which dispatches only a `click` event; Radix's `DropdownMenuTrigger` opens on `pointerdown` and would never fire.

---

## File structure

```
src/components/dialogs/AppDialog.jsx            new: MUI-shaped Dialog + title strip + body/content/actions
src/components/dialogs/AppDialog.test.jsx       new
src/components/header/AppMenu.jsx               new: MUI-shaped Popover menu + AppMenuItem
src/components/header/AppMenu.test.jsx          new
src/components/header/ColorGrid.jsx             new: the fifteen user colours, replaces CirclePicker
src/components/header/ColorGrid.test.jsx        new
src/components/ui/button.jsx                    + size "icon-round", + variant "plain"
src/components/fields/OutlinedField.jsx         label floats only when filled/focused; 23% outline; 14px padding; forwardRef
src/components/fields/OutlinedField.test.jsx    the three new behaviours
src/index.css                                   3 unlayered rules (dialog overlay, dialog title font, body letter-spacing)
src/components/header/Header.jsx                migrated
src/components/header/Header.test.jsx           unchanged assertions; kept green
src/components/header/HeaderAvatar.jsx          migrated (+ HeaderAvatar.test.jsx, new)
src/components/header/HeaderMenu.jsx            migrated (+ HeaderMenu.test.jsx, new)
src/components/header/ProjectName.jsx           migrated (+ ProjectName.test.jsx, new)
src/components/header/TempoSlider.jsx           migrated (+ TempoSlider.test.jsx, new)
src/components/landing-page/LandingPageRoute.jsx    migrated (+ LandingPageRoute.test.jsx, new)
src/components/rounds-list-route/RoundsListRoute.jsx migrated (+ RoundsListRoute.test.jsx, new)
src/components/dialogs/SignInDialog.jsx         migrated (SignInDialog.test.jsx unchanged)
src/components/dialogs/RenameDialog.jsx         migrated, controlled input (RenameDialog.test.jsx unchanged)
src/components/dialogs/DeleteRoundDialog.jsx    migrated (DeleteRoundDialog.test.jsx + one Escape test)
src/components/dialogs/ShareDialog.jsx          migrated (ShareDialog.test.jsx + one Escape test)
src/components/dialogs/OrientationDialog.jsx    migrated (+ OrientationDialog.test.jsx, new)
src/components/ErrorBoundary.jsx                migrated (+ ErrorBoundary.test.jsx, new)
docs/ui-baseline/capture.py                     real key/mouse events, non-MUI selectors
package.json, yarn.lock                         react-color removed (Task 5)
src/App.jsx                                     UNCHANGED — see below
```

### Why `src/App.jsx` is untouched

Its only Material UI usage is `unstable_createMuiStrictModeTheme`, `ThemeProvider` and `CssBaseline`, and all three must survive PR 2 because `PlayRoute`, `LayerSettings`, `EffectsSidebar` and `JitsiComponent` still render MUI components that read the theme. The theme object and the two providers go in PR 3. The grep gate in Task 5 therefore excludes `src/App.jsx` explicitly, with that reason written next to the command.

---

## Measured values

Everything below was read out of `node_modules/@material-ui/core/esm/` and out of the baseline PNGs. The implementer must not re-derive any of it.

### Theme facts that change the arithmetic

- `shape.borderRadius: 32`. MUI applies it to `Button` (making every button a pill: a 36.5 px-tall button with a 32 px radius is scaled by the browser to 18.25 px, exactly half its height), to `Paper` (so `RenameDialog`, `DeleteRoundDialog` and `OrientationDialog` have **32 px** corners) and to `OutlinedInput` (overridden to 8 px by the JSS in `SignInDialog` and `ShareDialog`). `SignInDialog` and `ShareDialog` override their own paper to **8 px**. `docs/ui-baseline/10-share-dialog.png` shows 8 px corners because of `ShareDialog`'s `paper: { borderRadius: 8 }`, not because of the theme.
- `breakpoints.values`: `xs 0, sm 500, md 900, lg 1200, xl 1536`. So `Container`'s default `maxWidth="lg"` is **1200 px**, not MUI's stock 1280.
- Palette: `text.primary #EAEAEA`, `primary.main #EAEAEA` / `primary.dark #AAAAAA`, `secondary.main #474747`, `action.active #EAEAEA`, `background.paper` = `grey[800]` = `#424242`, `background.default #303030`, `divider rgba(255,255,255,0.12)`, `action.hover rgba(255,255,255,0.08)`, `action.disabled rgba(255,255,255,0.3)`, dark `text.secondary rgba(255,255,255,0.7)`, Backdrop `rgba(0,0,0,0.5)`.
- `typography.button.textTransform: 'none'` — buttons are sentence case.

### Typography (14 px base, Roboto→Helvetica stack)

| variant | size | weight | line-height | letter-spacing |
|---|---|---|---|---|
| h5 | 1.5rem (24) | 400 | 1.334 | 0 |
| h6 (DialogTitle) | 1.25rem (20) | 500 | 1.6 | 0.0075em |
| body1 (MenuItem, ListItemText primary, InputBase) | 1rem (16) | 400 | 1.5 | 0.00938em |
| body2 (CssBaseline body, ListItemText secondary) | 0.875rem (14) | 400 | 1.43 | 0.01071em |
| button | 0.875rem (14) | 500 | 1.75 | 0.02857em |
| caption | 0.75rem (12) | 400 | 1.66 | 0.03333em |

`CssBaseline` sets `body { font-family: "Roboto","Helvetica","Arial",sans-serif; font-size: 0.875rem; line-height: 1.43; letter-spacing: 0.01071em }` **unlayered**, so it beats `src/index.css`'s `@layer base` rules. Two consequences: bare `<h1>`/`<p>` are 2em/1em **of 14 px** with the inherited 1.43 line-height (a landing headline is 28 px, not 30 px, on 40 px lines), and any Tailwind utility that names a font family (`font-heading` on the generated `DialogTitle`) would switch that element to the system stack and change its glyphs. Task 1 pins both.

### Button and IconButton

- `Button` root: `min-width 64; padding 6px 16px; border-radius 32 (→ pill); border 0; box-shadow none (disableElevation)`; typography `button`. Height = 6 + 24.5 + 6 = **36.5 px**.
- `contained` + `color="primary"`: `background #EAEAEA`, `color rgba(0,0,0,0.87)`.
- `contained` + `color="secondary"`: `background #474747`, `color #FFFFFF`.
- text variant: `padding 6px 8px`, `color #EAEAEA`, hover `rgba(255,255,255,0.08)`.
- `startIcon`: `margin-right 8; margin-left -4`; `endIcon`: `margin-left 8; margin-right -4`; icon size 20 px at the default (medium) size.
- `IconButton`: `padding 12; font-size 24; border-radius 50%` → **48 × 48**, `color #EAEAEA`, hover `rgba(255,255,255,0.08)`.

### Dialog family

- Backdrop `rgba(0,0,0,0.5)`, no blur. Over the `#1b1b1b` body that measures `rgb(13,13,13)` on `03-signin-email.png`.
- Paper: `background #424242`, `margin 32`, `max-height calc(100% - 64px)`, `max-width 500` (the `sm` breakpoint), elevation 24 → `box-shadow: 0px 11px 15px -7px rgba(0,0,0,0.2), 0px 24px 38px 3px rgba(0,0,0,0.14), 0px 9px 46px 8px rgba(0,0,0,0.12)`. Width is shrink-to-fit, **not** a fixed `sm:max-w-sm`.
- `DialogTitle`: `margin 0; padding 16px 24px`, h6 typography. Strip height = 16 + 32 + 16 = **64 px** (verified: on `03-signin-email.png` the paper starts at y 303 and the rule under the title is at y 367).
- There is **no separate `#383838` title strip**. Title and body are both `#424242`; what separates them is the JSS `body { border-top: solid 1px rgba(255,255,255,0.1) }`, which measures `rgb(85,85,85)` over `#424242`.
- `DialogContent`: `padding 8px 24px`. `DialogContentText`: `margin-bottom 12`. `DialogActions`: `display flex; align-items center; justify-content flex-end; padding 8`, and `& > :not(:first-child) { margin-left: 8 }`.
- The sign-in dialog's back `IconButton` is `position: absolute; left: 4; top: 8` and resolves against the **paper** (`DialogTitle` is static, the paper is `position: relative`). On `03-signin-email.png` the paper's left edge is x 484 and the arrow is centred at x 512 = 484 + 4 + 24.

### Outlined text field (`SignInDialog`, `ShareDialog`)

- Height **56 px** = 18.5 + 19 (`line-height: 1.1876em` on a 16 px input) + 18.5. `padding: 18.5px 14px`. Radius 8 px (the JSS overrides the theme's 32).
- Outline: `1px solid rgba(255,255,255,0.23)`. Verified: the field's top border on `03-signin-email.png` measures `rgb(109,109,109)`, which is white at 22.75 % over `#424242`. **Not 35 %.**
- Hover outline `#EAEAEA`; focused outline `2px #EAEAEA`; error `#f44336`.
- Label (`FormLabel` + `InputLabel outlined`): `color rgba(255,255,255,0.7)`, body1 16 px, `line-height: 1`, `transform-origin: top left`, `pointer-events: none`, `z-index: 1`.
  - not shrunk: `transform: translate(14px, 20px) scale(1)` — the label sits **inside** the box.
  - shrunk: `transform: translate(14px, -6px) scale(0.75)` — 12 px, sitting on the border.
  - shrunk when `filled || focused`. `03-signin-email.png` is the proof: both fields are empty and unfocused and both labels are inside the box.
- The notch is a `<legend>` at `font-size: 0.75em` with `padding: 0 5px`; `OutlinedField` fakes it with a background patch behind the label, which is correct because the field's background and the paper are the same `#424242`.

### Popper menus (`HeaderMenu`, `HeaderAvatar`, `ProjectName`, `RoundsListRoute`)

- `Paper` elevation 1 → `box-shadow: 0px 2px 1px -1px rgba(0,0,0,0.2), 0px 1px 1px 0px rgba(0,0,0,0.14), 0px 1px 3px 0px rgba(0,0,0,0.12)`; background `#424242`; the JSS sets `border-radius: 8` and `margin-right: 16` on all four.
- `MenuList` is a `List`: `padding: 8px 0`.
- `MenuItem`: body1, `padding: 6px 16px`, `min-height: 48` **below** the `sm` breakpoint and `auto` at ≥ 500 px, so a plain item is 6 + 24 + 6 = **36 px** on desktop and 48 px on the phone shot. `HeaderMenu` and `HeaderAvatar` override the vertical padding to 16 px → **56 px** items. `textAlign: 'center'` on the avatar menu's item is a no-op (MenuItem is a flex row), so "Sign out" is left-aligned; keep it left-aligned.
- `ListItemIcon`: `min-width: 56`, `color #EAEAEA`; `fontSize="small"` icon = 20 px.
- `Divider`: `height 1; background rgba(255,255,255,0.12)`.
- `Grow` runs for `getAutoHeightDuration(height)` ≈ 240–310 ms for these menus (opacity), transform at 0.666×, from `scale(0.75, 0.5625)`, `transform-origin: center top`. The spec settles on a 200 ms Radix animation; captures are taken 1.2 s after the state change so this cannot show up in the gate. Record it in the PR body as an intended difference.
- Placement (MUI `Popper` default `bottom`, i.e. **centred**, with `preventOverflow`, on a paper that carries a 16 px right margin):
  - header menu, `09-header-menu.png`: paper x 888–1278, y 56–188. The trigger is x 1236–1284, y 8–56. → Radix `side="bottom" align="end" sideOffset={0} alignOffset={-6}`.
  - avatar menu, `11-avatar-menu.png`: paper x 997–1234, y 64–340. The trigger (a 64 px `IconButton` around a 40 px avatar) is x 1092–1155, y 0–64; the paper's *margin box* is centred on it, which puts the paper 8 px left of centre. → Radix `side="bottom" align="center" sideOffset={0} alignOffset={-8}`.

### Slider (`TempoSlider`)

- Root: `height 2; padding 13px 0; box-sizing content-box` → **28 px tall**; the JSS sets `width: 300` and `color: #ffffff`.
- Rail: full width, `height 2`, `border-radius 1`, `background currentColor`, `opacity 0.38`. Track (the filled part): same but opaque.
- Thumb: `12 × 12`, `border-radius 50%`, `background #fff` (JSS), `margin-left -6; margin-top -5`.
- Value label (`valueLabelDisplay="on"`, always visible): an offset span at `top: -34; left: calc(-50% - 4px)` (i.e. −10 px from a 12 px thumb), `transform-origin: bottom center`, `transform: scale(1) translateY(-10px)`, `font-size 12px; line-height 1.2`; inside it a `32 × 32` span with `border-radius: 50% 50% 50% 0`, `background currentColor` (white), `transform: rotate(-45deg)`; inside that the number with `transform: rotate(45deg)` and `color: rgba(0,0,0,0.87)`.
- Checked against `09-header-menu.png`: at bpm 120 on a 50–200 range the bubble is centred at x ≈ 1102, which is the thumb's centre.

### Avatar, list, container, grid, spinner

- `Avatar`: `40 × 40`, `font-size 1.25rem (20px)`, `line-height 1`, `border-radius 50%`, `overflow hidden`. `colorDefault` (the rounds list) = `grey[600] #757575`. The header avatar's JSS adds `border: solid 2px <user colour>` when there is an image and `background: <user colour>; color: #FFFFFF` when there is not.
- `List`: `padding 8px 0`. `ListItem`: `padding 8px 16px`, `+ padding-right 48` when it has a secondary action. `ListItemAvatar`: `min-width 56`. `ListItemText`: `margin 4px 0` (6 px when both lines are present), primary = body1, secondary = body2 in `rgba(255,255,255,0.7)`. `ListItemSecondaryAction`: `position absolute; right 16; top 50%; translateY(-50%)`.
- `Container`: `padding 0 16`, `0 24` at ≥ 500 px; `max-width 1200` (lg). At the 1300 px capture width the content column is x 74–1226.
- `Grid container spacing={3}`: `margin -12px; width calc(100% + 24px)`, items `padding 12px`. `md={6}` = `flex-basis/max-width 50%` at ≥ 900 px, 100 % below.
- `CircularProgress size={24}`: 24 px, `thickness 3.6` on a 44-unit viewBox, `color: primary.main #EAEAEA`. Note it renders on a `#EAEAEA` contained-primary button, i.e. it is invisible today; keep it invisible rather than "fixing" it.

### `react-color` `CirclePicker` (the avatar menu's colour grid)

Fifteen colours from `Colors` in `src/utils/constants.js`, `circleSize 28`, `circleSpacing 14`. Its wrapper carries the class `circle-picker`, an inline `width: 252px` and `margin-right: -14px; margin-bottom: -14px`; the app's JSS adds `padding: 1rem`. Each swatch carries `title="<hex>"`.

Measured on `11-avatar-menu.png`: swatch columns start at x 1013, 1055, 1097, 1139, 1181 and rows at y 142, 184, 226 — a **42 px pitch of 28 px circles, five per row, three rows**. The menu paper is x 997–1234 = **238 px wide**, which is exactly the picker's `252 − 14` margin box; reproduce the negative margin or the whole menu narrows by 14 px.

### Baseline geometry to hit

| screen | element | measured box (1300 × 900 frame) |
|---|---|---|
| 01, 05, 09–13 | header bar | y 0–63, `rgb(45,45,45)` = `rgba(47,47,47,0.9)` over `#1b1b1b` — it is **translucent**, keep the alpha |
| 05 | back button svg / its 48 px button | x 28–47 / x 16–64 |
| 05 | own avatar (40 px) | x 1104–1143 |
| 05 | share button (48 px, `#474747`) | x 1172–1219 |
| 05 | More options button (48 px) | x 1236–1284, icon centred at 1260 |
| 02 | dialog paper | x 414–885 (472 w), y 280–619 (340 h) |
| 02 | first pill button (`#474747`) | x 431–868 (438 w), y 361–397 (36.5 h); 16 px gaps |
| 03 | dialog paper | x 484–815 (**332 w**), y 303–596 |
| 03 | rule under the title / field top border | y 367 `rgb(85,85,85)` / y 384 `rgb(109,109,109)` |
| 04 | dialog paper | x 484–815 (332 w), y 303–602 |
| 09 | menu paper | x 888–1278 (391 w), y 56–188 (133 h) |
| 09 | "Fullscreen" icon / label | x 904 / x 960 (16 gutter + 56 `ListItemIcon`) |
| 10 | dialog paper | x 471–828 (358 w), y 243–656 |
| 11 | menu paper / first swatch | x 997–1234 (238 w), y 64–340 / x 1013, y 142 |
| 12 | New round button | x 1100–1226, y 85–120 |
| 12 | list row avatar left edge | x 90 (74 content + 16 gutter) |

**The 472 px trap on screen 02.** The sign-in choice step's paper is 472 px wide because MUI's `ButtonBase` is `display: inline-flex`: the three `fullWidth` buttons are inline-level siblings of one block, so the paper's shrink-to-fit width is the **sum** of their max-content widths (175 + 148 + 121 ≈ 444) plus the body's 32 px padding, not the width of the widest one. Screens 03 and 04 are 332 px because the form fields carry `min-width: 300px`. If the migrated body wraps those buttons in a flex column the dialog collapses to about 200 px and screen 02 fails by a wide margin. Keep the body a plain block `<div>` whose children are `inline-flex w-full` buttons with no whitespace between them in JSX.

---

### Task 1: The dialog, menu and colour-grid shells

**Files:**
- Create: `src/components/dialogs/AppDialog.jsx`, `src/components/dialogs/AppDialog.test.jsx`
- Create: `src/components/header/AppMenu.jsx`, `src/components/header/AppMenu.test.jsx`
- Create: `src/components/header/ColorGrid.jsx`, `src/components/header/ColorGrid.test.jsx`
- Modify: `src/components/ui/button.jsx`, `src/index.css`
- Modify: `src/components/fields/OutlinedField.jsx`, `src/components/fields/OutlinedField.test.jsx`

**Interfaces:**
- Produces `MUI_BUTTON` (the class string every migrated pill button uses), `<AppDialog open onOpenChange titleId title onBack className>`, `AppDialogBody`, `AppDialogContent`, `AppDialogActions`, `<AppMenu open onOpenChange trigger listId align alignOffset contentClassName>`, `AppMenuItem`, `<ColorGrid value onChange className>`, `Button` size `icon-round` and variant `plain`, and an `OutlinedField` whose label floats only when the field is filled or focused and whose wrapper takes a ref.

- [ ] **Step 1: Give `Button` the 48 px round icon size and the transparent variant**

In `src/components/ui/button.jsx` add to `variants.variant`:

```js
        // MUI's IconButton and text Button: no fill, foreground glyph, white-at-8% hover.
        plain: "text-foreground hover:bg-white/8",
```

and to `variants.size`:

```js
        // MUI's IconButton: 12px padding around a 24px glyph.
        "icon-round": "size-12 rounded-full [&_svg:not([class*='size-'])]:size-6",
```

The `[&_svg…]:size-6` is load-bearing: the generated base class forces every unsized `svg` to `size-4`, and `src/components/icons/*` render at 24 px without a `size-` class.

- [ ] **Step 2: Three unlayered rules in `src/index.css`**

Append **after** the `@layer base` block (unlayered rules beat anything inside a cascade layer, which is how these win against the generated components' own utilities):

```css
/* The generated DialogContent renders its own DialogOverlay with no props, so its
   `bg-black/10 supports-backdrop-filter:backdrop-blur-xs` cannot be overridden from JSX.
   MUI's Backdrop is a flat 50% black with no blur, and every dialog screenshot is taken
   over it. Drop this rule in PR 3 only if the backdrop is redesigned on purpose. */
[data-slot="dialog-overlay"] {
  background-color: rgba(0, 0, 0, 0.5);
  backdrop-filter: none;
}

/* CssBaseline still owns the app's font: it sets Roboto/Helvetica/Arial on `body` unlayered,
   so it beats `--font-sans` in the base layer and every glyph in the app is Helvetica today.
   The generated DialogTitle asks for `--font-heading`, which is the system stack, and would
   render the five dialog titles in a different typeface from the rest of the app. Until
   CssBaseline goes in PR 3 the title inherits like everything else. */
[data-slot="dialog-title"] {
  font-family: inherit;
}
```

and add one line inside the existing `@layer base` `body` rule, with the comment:

```css
  /* MUI's body2 tracking, which CssBaseline sets unlayered today and everything inherits.
     Spelling it out here means PR 3 can delete CssBaseline without moving the type. */
  letter-spacing: 0.01071em;
```

- [ ] **Step 3: Write the failing `OutlinedField` tests**

Add to `src/components/fields/OutlinedField.test.jsx`:

```jsx
    it('keeps the label inside the box until the field is filled or focused', async () => {
        const user = userEvent.setup()
        render(<OutlinedField id="email" label="Email address" />)
        const label = screen.getByText('Email address')
        expect(label).toHaveClass('translate-y-5', 'scale-100')
        await user.click(screen.getByLabelText('Email address'))
        expect(label).toHaveClass('-translate-y-1.5', 'scale-75')
    })

    it('floats the label straight away for a field that already has a value', () => {
        render(<OutlinedField id="link" label="Link" value="https://rounds.studio/play/x" onChange={() => {}} />)
        expect(screen.getByText('Link')).toHaveClass('-translate-y-1.5', 'scale-75')
    })

    it('floats the label when something types into an uncontrolled field from outside React', () => {
        // capture.py fills the guest name with the native value setter plus an input event.
        render(<OutlinedField id="name" label="Name" inputProps={{ 'data-test': 'input-name' }} />)
        const input = screen.getByTestId('input-name')
        Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(input, 'shots')
        fireEvent.input(input, { target: { value: 'shots' } })
        expect(screen.getByText('Name')).toHaveClass('-translate-y-1.5', 'scale-75')
    })

    it('hands its wrapper to a ref so callers can read the input out of the DOM', () => {
        const ref = React.createRef()
        render(<OutlinedField ref={ref} id="email" label="Email address" />)
        expect(ref.current.querySelectorAll('input')[0]).toBe(screen.getByLabelText('Email address'))
    })

    it('draws MUI\'s outline, not a lighter one', () => {
        render(<OutlinedField id="link" label="Link" />)
        expect(screen.getByLabelText('Link')).toHaveClass('border-white/23', 'px-[14px]')
    })
```

Import `fireEvent` from `@testing-library/react` and `React` from `react`. Run `corepack yarn -s vitest run src/components/fields` and watch these five fail.

- [ ] **Step 4: Rewrite `OutlinedField`**

```jsx
import * as React from 'react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

/**
 * MUI's outlined TextField: a 56px box with an 8px radius, a white-at-23% outline that goes to
 * the foreground colour on hover and focus, and a label that starts inside the box and floats
 * onto the border once the field is filled or focused. Works controlled or uncontrolled; the
 * wrapper takes the ref, which is where MUI's TextField puts one, so callers can go on reading
 * the input with `ref.current.querySelectorAll('input')[0]`. onChange gets the native event.
 *
 * forwardRef is only needed on React 18; drop it with the React 19 upgrade in PR 3.
 */
export const OutlinedField = React.forwardRef(function OutlinedField(
    { id, label, value, defaultValue, onChange, onFocus, onBlur, type = 'text', placeholder, autoFocus, disabled, error = false, helperText, className, inputProps = {}, ...rest },
    ref
) {
    const [focused, setFocused] = React.useState(false)
    const [filled, setFilled] = React.useState(() => !!(value ?? defaultValue))
    React.useEffect(() => {
        if (value !== undefined) setFilled(!!value)
    }, [value])
    const shrink = focused || filled
    const helperId = helperText ? `${id}-helper` : undefined
    return (
        <div ref={ref} className={cn('relative w-full', className)} {...rest}>
            <label
                htmlFor={id}
                className={cn(
                    'pointer-events-none absolute left-0 top-0 z-10 origin-top-left translate-x-[14px] text-base leading-none transition-transform duration-200 ease-out',
                    shrink ? '-translate-y-1.5 scale-75 px-[6.67px] bg-input' : 'translate-y-5 scale-100',
                    error ? 'text-destructive' : 'text-white/70'
                )}
            >
                {label}
            </label>
            {/* md:text-base and focus-visible:border-destructive are spelled out to beat the
                generated Input's md:text-sm and focus-visible:border-ring, which the class merge
                leaves standing: MUI's InputBase is 16px at every width, and a field that is wrong
                stays red while it has the caret. */}
            <Input
                {...inputProps}
                id={id}
                type={type}
                value={value}
                defaultValue={defaultValue}
                onChange={(event) => { setFilled(!!event.target.value); onChange && onChange(event) }}
                onFocus={(event) => { setFocused(true); onFocus && onFocus(event) }}
                onBlur={(event) => { setFocused(false); onBlur && onBlur(event) }}
                placeholder={placeholder}
                autoFocus={autoFocus}
                disabled={disabled}
                aria-invalid={error || undefined}
                aria-describedby={helperId}
                className={cn(
                    'h-14 rounded-lg border bg-input px-[14px] py-0 text-base md:text-base text-foreground shadow-none',
                    error ? 'border-destructive focus-visible:border-destructive' : 'border-white/23 hover:border-foreground focus-visible:border-foreground',
                    'focus-visible:ring-0 aria-invalid:ring-0',
                    inputProps.className
                )}
            />
            {helperText && <p id={helperId} className={cn('mt-1 px-3 text-xs', error ? 'text-destructive' : 'text-muted-foreground')}>{helperText}</p>}
        </div>
    )
})
```

`value` and `onChange` are now both optional, so the three sign-in fields stay uncontrolled exactly as their MUI `TextField`s are today.

- [ ] **Step 5: Write the failing `AppDialog` test**

`src/components/dialogs/AppDialog.test.jsx`:

```jsx
import { describe, it, expect, vi } from 'vitest'
import React from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AppDialog, AppDialogBody } from './AppDialog'

function Harness({ onOpenChange = () => {}, onBack }) {
    const [open, setOpen] = React.useState(false)
    return (
        <>
            <button onClick={() => setOpen(true)}>open</button>
            <AppDialog open={open} onOpenChange={(next) => { setOpen(next); onOpenChange(next) }} titleId="t" title="Sign in" onBack={onBack}>
                <AppDialogBody><button>inside</button></AppDialogBody>
            </AppDialog>
        </>
    )
}

describe('AppDialog', () => {
    it('opens, labels itself by its title and closes on Escape, giving focus back to the trigger', async () => {
        const user = userEvent.setup()
        render(<Harness />)
        const trigger = screen.getByRole('button', { name: 'open' })
        await user.click(trigger)
        const dialog = await screen.findByRole('dialog')
        expect(dialog).toHaveAttribute('aria-labelledby', 't')
        expect(screen.getByText('Sign in')).toHaveAttribute('id', 't')
        await user.keyboard('{Escape}')
        expect(screen.queryByRole('dialog')).toBeNull()
        expect(trigger).toHaveFocus()
    })

    it('traps Tab inside the dialog', async () => {
        const user = userEvent.setup()
        render(<Harness />)
        await user.click(screen.getByRole('button', { name: 'open' }))
        await screen.findByRole('dialog')
        await user.tab()
        await user.tab()
        expect(screen.getByRole('button', { name: 'open' })).not.toHaveFocus()
    })

    it('shows a back arrow in the title strip only when it is given one', async () => {
        const user = userEvent.setup()
        const onBack = vi.fn()
        const { rerender } = render(<Harness onBack={onBack} />)
        await user.click(screen.getByRole('button', { name: 'open' }))
        await user.click(await screen.findByTestId('dialog-back'))
        expect(onBack).toHaveBeenCalled()
        rerender(<Harness />)
        expect(screen.queryByTestId('dialog-back')).toBeNull()
    })
})
```

- [ ] **Step 6: Implement `AppDialog`**

`src/components/dialogs/AppDialog.jsx`. Note the four things the generated `DialogContent` gets told: `showCloseButton={false}` (MUI has no close X), an explicit `aria-labelledby` (Radix wires its own generated title id, and the app's ids are load-bearing for `capture.py`), `aria-describedby={undefined}` (otherwise Radix logs a "Missing `Description`" warning and the suite stops being pristine), and a className that undoes `sm:max-w-sm`, `p-4`, `gap-4`, `rounded-xl` and `ring-1`.

```jsx
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { ArrowBackIcon } from '@/components/icons'
import { cn } from '@/lib/utils'

/** MUI's Button, which the theme's 32px radius turns into a pill. */
export const MUI_BUTTON = 'h-auto min-w-16 rounded-full border-0 px-4 py-1.5 text-sm font-medium leading-[1.75] tracking-[0.02857em] shadow-none'

/** MUI's Dialog paper: elevation 24, shrink-to-fit up to the sm breakpoint, 32px away from the edges. */
const PAPER = 'block w-auto max-w-[min(500px,calc(100%-64px))] max-h-[calc(100%-64px)] overflow-y-auto gap-0 rounded-lg bg-popover p-0 text-sm text-popover-foreground ring-0 shadow-[0px_11px_15px_-7px_rgba(0,0,0,0.2),0px_24px_38px_3px_rgba(0,0,0,0.14),0px_9px_46px_8px_rgba(0,0,0,0.12)]'

export function AppDialog({ open, onOpenChange, titleId, title, titleClassName, onBack, backLabel = 'close', className, children }) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent showCloseButton={false} aria-labelledby={titleId} aria-describedby={undefined} className={cn(PAPER, className)}>
                {/* Not `relative`: MUI's DialogTitle is static and the back arrow is positioned
                    against the paper, 4px in and 8px down from its top-left corner. */}
                <DialogTitle id={titleId} className={cn('m-0 px-6 py-4 text-[1.25rem] font-medium leading-[1.6] tracking-[0.0075em] text-foreground', titleClassName)}>
                    {onBack && (
                        <Button type="button" variant="plain" size="icon-round" aria-label={backLabel} data-test="dialog-back" className="absolute left-1 top-2" onClick={onBack}>
                            <ArrowBackIcon />
                        </Button>
                    )}
                    {title}
                </DialogTitle>
                {children}
            </DialogContent>
        </Dialog>
    )
}

/** The sign-in and share dialogs' body: 1rem of padding under a white-at-10% rule. */
export function AppDialogBody({ className, ...props }) {
    return <div className={cn('border-t border-white/10 p-4', className)} {...props} />
}

/** MUI's DialogContent. */
export function AppDialogContent({ className, ...props }) {
    return <div className={cn('px-6 py-2', className)} {...props} />
}

/** MUI's DialogActions. */
export function AppDialogActions({ className, ...props }) {
    return <div className={cn('flex flex-none items-center justify-end p-2 [&>*+*]:ml-2', className)} {...props} />
}
```

- [ ] **Step 7: Write the failing `AppMenu` test**

`src/components/header/AppMenu.test.jsx`:

```jsx
import { describe, it, expect, vi } from 'vitest'
import React from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AppMenu, AppMenuItem } from './AppMenu'
import { Button } from '@/components/ui/button'

function Harness({ onPick = vi.fn() }) {
    const [open, setOpen] = React.useState(false)
    return (
        <AppMenu open={open} onOpenChange={setOpen} listId="menu-list-grow" trigger={<Button aria-label="More options">…</Button>}>
            <AppMenuItem onClick={() => onPick('one')}>One</AppMenuItem>
            <AppMenuItem onClick={() => onPick('two')}>Two</AppMenuItem>
        </AppMenu>
    )
}

describe('AppMenu', () => {
    it('opens from a programmatic click, the way capture.py opens it', async () => {
        render(<Harness />)
        screen.getByRole('button', { name: 'More options' }).click()
        expect(await screen.findByRole('menu')).toHaveAttribute('id', 'menu-list-grow')
    })

    it('walks its items with the arrow keys and wraps', async () => {
        const user = userEvent.setup()
        render(<Harness />)
        await user.click(screen.getByRole('button', { name: 'More options' }))
        await screen.findByRole('menu')
        await user.keyboard('{ArrowDown}')
        expect(screen.getByRole('menuitem', { name: 'One' })).toHaveFocus()
        await user.keyboard('{ArrowDown}')
        expect(screen.getByRole('menuitem', { name: 'Two' })).toHaveFocus()
        await user.keyboard('{ArrowDown}')
        expect(screen.getByRole('menuitem', { name: 'One' })).toHaveFocus()
    })

    it('closes on Escape and gives focus back to its trigger', async () => {
        const user = userEvent.setup()
        render(<Harness />)
        const trigger = screen.getByRole('button', { name: 'More options' })
        await user.click(trigger)
        await screen.findByRole('menu')
        await user.keyboard('{Escape}')
        expect(screen.queryByRole('menu')).toBeNull()
        expect(trigger).toHaveFocus()
    })

    it('runs an item and lets the caller close the menu', async () => {
        const user = userEvent.setup()
        const onPick = vi.fn()
        render(<Harness onPick={onPick} />)
        await user.click(screen.getByRole('button', { name: 'More options' }))
        await user.click(await screen.findByRole('menuitem', { name: 'Two' }))
        expect(onPick).toHaveBeenCalledWith('two')
    })
})
```

- [ ] **Step 8: Implement `AppMenu`**

`src/components/header/AppMenu.jsx`:

```jsx
import * as React from 'react'
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover'
import { cn } from '@/lib/utils'

/** MUI's Paper at elevation 1, with the 8px radius the app's JSS gives all four menus. */
const PAPER = 'w-auto min-w-0 gap-0 rounded-lg bg-popover p-0 text-sm text-popover-foreground ring-0 shadow-[0px_2px_1px_-1px_rgba(0,0,0,0.2),0px_1px_1px_0px_rgba(0,0,0,0.14),0px_1px_3px_0px_rgba(0,0,0,0.12)]'

/**
 * MUI's Popper + Grow + ClickAwayListener + Paper + MenuList, on Radix's Popover.
 *
 * Popover, not DropdownMenu: DropdownMenu's trigger opens on pointerdown, and both capture.py
 * and anything else driving the app from script open these menus with element.click(). The
 * arrow-key roving focus that MenuList gave us is re-implemented here so the menus stay
 * keyboard-navigable.
 */
export function AppMenu({ open, onOpenChange, trigger, listId, align = 'center', alignOffset = 0, sideOffset = 0, contentClassName, listClassName, children }) {
    const onKeyDown = (event) => {
        if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return
        const items = [...event.currentTarget.querySelectorAll('[data-menu-item]')]
        if (items.length === 0) return
        event.preventDefault()
        const at = items.indexOf(document.activeElement)
        const next =
            event.key === 'Home' ? 0 :
            event.key === 'End' ? items.length - 1 :
            event.key === 'ArrowDown' ? (at + 1) % items.length :
            (at - 1 + items.length) % items.length
        items[next].focus()
    }
    return (
        <Popover open={open} onOpenChange={onOpenChange}>
            <PopoverTrigger asChild>{trigger}</PopoverTrigger>
            <PopoverContent side="bottom" align={align} alignOffset={alignOffset} sideOffset={sideOffset} className={cn(PAPER, contentClassName)}>
                <div id={listId} role="menu" className={cn('py-2', listClassName)} onKeyDown={onKeyDown}>
                    {children}
                </div>
            </PopoverContent>
        </Popover>
    )
}

/**
 * MUI's MenuItem: body1 at 6px/16px, 48px minimum height below the sm breakpoint and
 * content height above it. `max-sm` is 500px here, matching the theme.
 */
export const AppMenuItem = React.forwardRef(function AppMenuItem({ className, ...props }, ref) {
    return (
        <button
            ref={ref}
            type="button"
            role="menuitem"
            data-menu-item=""
            tabIndex={-1}
            className={cn(
                'flex w-full items-center overflow-hidden whitespace-nowrap px-4 py-1.5 text-left text-base leading-6 tracking-[0.00938em] text-foreground outline-none hover:bg-white/8 focus-visible:bg-white/8 max-sm:min-h-12',
                className
            )}
            {...props}
        />
    )
})
```

`AppMenu` renders no divider of its own; `HeaderMenu` and `HeaderAvatar` put a `<Separator className="bg-white/12" />` inside the list where MUI has one, so the list's 8 px bottom padding stays below it (that is what makes the header menu 133 px tall).

- [ ] **Step 9: Write the failing `ColorGrid` test**

`src/components/header/ColorGrid.test.jsx`:

```jsx
import { describe, it, expect, vi } from 'vitest'
import React from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ColorGrid, SWATCH_CLASS } from './ColorGrid'
import { Colors } from '../../utils/constants'

describe('ColorGrid', () => {
    it('draws one swatch per user colour, keeping the hooks capture.py selects on', () => {
        const { container } = render(<ColorGrid onChange={() => {}} />)
        expect(container.querySelector('.circle-picker')).not.toBeNull()
        expect(screen.getAllByRole('button')).toHaveLength(Colors.length)
        for (const hex of Colors) {
            expect(container.querySelector(`.circle-picker [title="${hex}"]`)).not.toBeNull()
        }
    })

    it('has a static Tailwind class for every colour, so none of them fall out of the build', () => {
        for (const hex of Colors) {
            expect(SWATCH_CLASS[hex]).toBe(`bg-[${hex}]`)
        }
    })

    it('reports the colour that was clicked in the shape react-color used', async () => {
        const onChange = vi.fn()
        const { container } = render(<ColorGrid onChange={onChange} />)
        await userEvent.setup().click(container.querySelector('[title="#f44336"]'))
        expect(onChange).toHaveBeenCalledWith({ hex: '#f44336' })
    })
})
```

- [ ] **Step 10: Implement `ColorGrid`**

`src/components/header/ColorGrid.jsx`. The swatch colours are data, not markup, so they cannot be interpolated into a class name — Tailwind only emits classes it can see as literals. The map below is that literal list; keep it in step with `Colors`, which the second test enforces. The 252 px width with a −14 px right margin is what makes the avatar menu 238 px wide.

```jsx
import { Colors } from '../../utils/constants'
import { cn } from '@/lib/utils'

/** One literal Tailwind class per user colour; `Colors` is the source of truth for the order. */
export const SWATCH_CLASS = {
    '#f44336': 'bg-[#f44336]', '#e91e63': 'bg-[#e91e63]', '#9c27b0': 'bg-[#9c27b0]',
    '#673ab7': 'bg-[#673ab7]', '#3f51b5': 'bg-[#3f51b5]', '#2196f3': 'bg-[#2196f3]',
    '#00bcd4': 'bg-[#00bcd4]', '#009688': 'bg-[#009688]', '#4caf50': 'bg-[#4caf50]',
    '#8bc34a': 'bg-[#8bc34a]', '#cddc39': 'bg-[#cddc39]', '#ffeb3b': 'bg-[#ffeb3b]',
    '#ffc107': 'bg-[#ffc107]', '#ff9800': 'bg-[#ff9800]', '#ff5722': 'bg-[#ff5722]'
}

/**
 * react-color's CirclePicker, in Tailwind: 28px circles on a 42px pitch inside a 252px box with
 * 1rem of padding, and the -14px right margin that pulls the wrapper's margin box back to the
 * 238px the avatar menu is wide. The `circle-picker` class and the `title` attributes are kept
 * because docs/ui-baseline/capture.py forces the guest colour through them.
 */
export function ColorGrid({ onChange, className }) {
    return (
        <div className={cn('circle-picker -mb-[14px] -mr-[14px] flex w-[252px] flex-wrap p-4', className)}>
            {Colors.map((hex) => (
                <button
                    key={hex}
                    type="button"
                    title={hex}
                    aria-label={hex}
                    onClick={() => onChange({ hex })}
                    className={cn('mb-[14px] mr-[14px] size-7 rounded-full outline-none transition-transform hover:scale-110 focus-visible:scale-110', SWATCH_CLASS[hex])}
                />
            ))}
        </div>
    )
}
```

- [ ] **Step 11: Run everything**

```bash
corepack yarn -s vitest run src/components/fields src/components/dialogs/AppDialog.test.jsx src/components/header/AppMenu.test.jsx src/components/header/ColorGrid.test.jsx
corepack yarn -s test && corepack yarn -s lint && corepack yarn -s build
```

Expected: all green, no warnings printed. `src/components/ui/ui-smoke.test.jsx` and the existing dialog tests still pass — nothing renders the new shells yet.

- [ ] **Step 12: Commit**

```bash
git add src/components/dialogs/AppDialog.jsx src/components/dialogs/AppDialog.test.jsx src/components/header/AppMenu.jsx src/components/header/AppMenu.test.jsx src/components/header/ColorGrid.jsx src/components/header/ColorGrid.test.jsx src/components/ui/button.jsx src/components/fields src/index.css
git commit  # subject: "Add the dialog, menu and colour-grid shells the shell migration needs"
```

---

### Task 2: The header

**Files:**
- Modify: `src/components/header/Header.jsx`, `HeaderAvatar.jsx`, `HeaderMenu.jsx`, `ProjectName.jsx`, `TempoSlider.jsx`
- Create: `src/components/header/HeaderAvatar.test.jsx`, `HeaderMenu.test.jsx`, `ProjectName.test.jsx`, `TempoSlider.test.jsx`
- Keep green: `src/components/header/Header.test.jsx` (no assertion changes; it keeps its `ThemeProvider` because `JitsiComponent` is still MUI)

**Interfaces:**
- Consumes `AppMenu`, `AppMenuItem`, `ColorGrid`, `MUI_BUTTON`, `Button`, `Avatar`/`AvatarImage`/`AvatarFallback`, `Separator`, `Tooltip` is **not** used, `@/components/icons` (`ShareIcon`, `MoreHorizIcon`, `FullscreenIcon`, `ExpandMoreIcon`), and `radix-ui`'s `Slider` primitives in `TempoSlider` only.
- Produces: no API change. `Header` keeps its `connect` map and its `FirebaseContext` lifecycle verbatim; only `render()` changes.

- [ ] **Step 1: `Header.jsx`**

Delete the `styles` object, the `withStyles` wrapper, `PropTypes` and the `Header.propTypes` block (it only declared `classes`, and leaving it prints a PropTypes warning once `classes` is gone). Keep `connect`, `withRouter`, `componentDidMount`, `componentWillUnmount`, `redirect`, `onSignInClick`, `onShareClick` and the `BackButton` import from `../play/layer-settings/resources` (it is the app's own SVG, not MUI, and the spec keeps it).

The JSS moves like this:

| JSS rule | Tailwind |
|---|---|
| `root` | `fixed z-[4] flex h-16 w-full flex-row items-center justify-between px-4 bg-[rgba(47,47,47,0.9)]` |
| `rightSide` | `flex items-center` |
| `avatars` | `mr-4 flex items-center` |
| `shareButton` | `mr-4 bg-secondary hover:bg-secondary` |
| `avatar` | `relative` |
| `roundAroundLogoButton` | `font-semibold` |
| the two inline `style={{}}` | `flex flex-row items-center` and `ml-2` |

The header background must stay `rgba(47,47,47,0.9)`, not the opaque `--surface`: on the play route the round is drawn under the fixed header and shows through. Drop the `bgcolor="background.default"` prop, which the JSS was already beating.

`render()` becomes (structure unchanged, `Box` → `div`):

```jsx
	render() {
		const { location, round, users, user } = this.props;
		const isPlayMode = location.pathname.includes('/play/')
		const usersPresent = presentUsers(users, round)
		return (
			<div className="fixed z-[4] flex h-16 w-full flex-row items-center justify-between bg-[rgba(47,47,47,0.9)] px-4">
				{isPlayMode &&
					<>
						<div className="flex flex-row items-center">
							<Button asChild variant="plain" size="icon-round">
								<Link data-test="button-back-to-rounds" aria-label="Back to my rounds" to="/rounds"><BackButton /></Link>
							</Button>
							<div className="ml-2">
								{round && <div><ProjectName name={round.name} /></div>}
								{_.isNil(round) && <p className="m-0 text-base leading-6 tracking-[0.00938em]">Loading...</p>}
							</div>
						</div>
						<div className="flex items-center">
							<div className="mr-4 flex items-center">
								{usersPresent.map((currentUser) => (
									<HeaderAvatar className="relative" key={currentUser.id} user={currentUser} users={users} shouldShowMenu={!_.isNil(user) && (currentUser.id === user.id)} />
								))}
							</div>
							{round && usersPresent.length > 1 && <JitsiComponent />}
							{round &&
								<div>
									<Button aria-label="Share this round" variant="plain" size="icon-round" className="mr-4 bg-secondary hover:bg-secondary" onClick={this.onShareClick}><ShareIcon /></Button>
								</div>
							}
							{round && <div><HeaderMenu /></div>}
						</div>
					</>
				}
				{!isPlayMode &&
					<>
						<div>
							<Button asChild variant="plain" className={cn(MUI_BUTTON, 'px-2 font-semibold')}>
								<Link to="/">RoundAround</Link>
							</Button>
						</div>
						{user && <HeaderAvatar user={user} users={users} shouldShowMenu={true} />}
						{!user &&
							<Button
								className={cn(MUI_BUTTON, 'signed-out bg-secondary text-white hover:bg-secondary/90')}
								onClick={this.onSignInClick}
								data-test="button-sign-in-out"
							>Sign in</Button>
						}
					</>
				}
			</div>
		)
	}
```

`Typography` (body1) becomes an explicit `<p className="m-0 text-base leading-6 tracking-[0.00938em]">`; `<p>`'s default margin has to be zeroed because `src/index.css` hands the browser default back to bare paragraphs. The `signed-out` class must stay on the same element as `data-test="button-sign-in-out"`.

- [ ] **Step 2: `HeaderAvatar.jsx`**

Keep `getInitials`, `onColorChosen` (its argument shape `{ hex }` is what `ColorGrid` reports), `onSignOutClick` and the `connect` map. Replace `makeStyles`, `Popper`/`Grow`/`Paper`/`ClickAwayListener`/`MenuList`/`MenuItem`/`Divider`/`IconButton`/`Avatar` and the `CirclePicker` import.

The user colour is the one inline style the migration allows: `style={{ '--user-color': user.color }}` on the `Avatar` root, consumed by `border-(--user-color)` and `bg-(--user-color)`.

```jsx
	return (
		<div className="flex">
			<div data-test="header">
				{shouldShowMenu &&
					<AppMenu
						open={open}
						onOpenChange={setOpen}
						listId="menu-list-grow"
						align="center"
						alignOffset={-8}
						trigger={
							<Button className="signed-in" variant="plain" size="icon-round" aria-haspopup="true" data-test="button-sign-in-out">
								<Avatar className="size-10 after:hidden" style={{ '--user-color': user.color }}>
									{!_.isNil(user.avatar) && <AvatarImage className="border-2 border-(--user-color)" alt={user.displayName} src={user.avatar} />}
									<AvatarFallback className="bg-(--user-color) text-[20px] leading-none text-white">{getInitials(user.displayName)}</AvatarFallback>
								</Avatar>
							</Button>
						}
						listClassName="py-0"
						contentClassName="w-auto"
					>
						<h2 className="mx-4 mb-0 mt-0 pt-4 text-[1.5em] font-bold">{user.displayName}</h2>
						<h3 className="mx-4 mt-0 text-[1.17em] font-medium">{user.email}</h3>
						<ColorGrid onChange={onColorChosen} />
						<Separator className="bg-white/12" />
						<div className="py-2">
							<AppMenuItem onClick={onSignOutClick} data-test="button-sign-out" className="py-4">Sign out</AppMenuItem>
						</div>
					</AppMenu>
				}
				{!shouldShowMenu &&
					<Button variant="plain" size="icon-round" disabled className="disabled:opacity-100 disabled:text-white/30">
						<Avatar className="size-10 after:hidden" style={{ '--user-color': user.color }}>
							{!_.isNil(user.avatar) && <AvatarImage className="border-2 border-(--user-color)" alt={user.displayName} src={user.avatar} />}
							<AvatarFallback className="bg-(--user-color) text-[20px] leading-none text-white">{getInitials(user.displayName)}</AvatarFallback>
						</Avatar>
					</Button>
				}
			</div>
		</div>
	)
```

Four things that look optional and are not:

1. `after:hidden` on `Avatar` — the generated component draws a `::after` hairline ring that MUI's avatar has no equivalent for.
2. `size-10` — the generated default is `size-8` (32 px); MUI's is 40 px, and the header's 40 px avatar is measured on `05-round.png` at x 1104–1143.
3. The `<h3>` is rendered **unconditionally**, even though a guest has no `user.email` and it comes out empty. An empty `<h3>` still contributes its 1em bottom margin, which is part of the gap between the name and the colour grid on `11-avatar-menu.png`.
4. `listClassName="py-0"` — the avatar menu's `MenuList` wraps only the Sign out item, so the 8 px list padding belongs to the inner `div`, below the divider, not around the whole popover.

`ColorGrid`'s `-mr-[14px]` is what fixes the popover at 238 px; do not add a width to `contentClassName`.

- [ ] **Step 3: `HeaderMenu.jsx`**

Keep `onFullscreenClick` verbatim. The menu becomes:

```jsx
	return (
		<div className="flex">
			<div>
				<AppMenu
					open={open}
					onOpenChange={setOpen}
					listId="header-menu-list"
					align="end"
					alignOffset={-6}
					trigger={<Button variant="plain" size="icon-round" aria-label="More options" aria-haspopup="true"><MoreHorizIcon /></Button>}
					listClassName="py-2"
				>
					<AppMenuItem onClick={onFullscreenClick} className="py-4">
						<span className="inline-flex w-14 shrink-0 items-center text-foreground"><FullscreenIcon className="size-5" /></span>
						Fullscreen
					</AppMenuItem>
					<Separator className="bg-white/12" />
				</AppMenu>
				{/* outside the list, exactly where MUI has it: the list's 8px bottom padding
				    sits between the divider and the slider */}
			</div>
		</div>
	)
```

`TempoSlider` goes after the `</div>` that closes the list — pass it as a second child of `AppMenu` after the list by giving `AppMenu` its children in order; the `Separator` is the last child *inside* the list and `TempoSlider` the first *after* it. Implement that by rendering `<AppMenu … footer={<TempoSlider />}>`, adding a `footer` prop to `AppMenu` that renders after the list `div`, or by moving the `Separator` and `TempoSlider` into a single fragment child and letting the list wrap only the item — pick one and say which in the commit body. The measured target is the whole paper at 391 × 133 px: 8 (list top) + 56 (item) + 1 (divider) + 8 (list bottom) + 60 (tempo row).

`aria-controls` is dropped: Radix wires `aria-controls` and `aria-expanded` on the trigger itself.

- [ ] **Step 4: `TempoSlider.jsx`**

Keep `persistTempo`, the throttle, the `isDragging` ref and the collaborator-follow effect exactly as they are; only the markup and the two handler signatures change:

```jsx
    const handleChange = ([bpm]) => { isDragging.current = true; setValue(bpm); AudioEngine.setTempo(bpm); persistTempo(bpm) }
    const handleChangeCommitted = () => { isDragging.current = false; persistTempo.flush() }
```

The slider is composed from `radix-ui`'s primitives rather than `@/components/ui/slider`, because the always-on value bubble is a child of the thumb and the generated `Slider` renders its thumbs itself with no slot for children (and `src/components/ui/slider.jsx` is out of scope for this PR). Say that in the commit body.

```jsx
import { Slider as SliderPrimitive } from 'radix-ui'
...
    return (
        <div className="flex items-center justify-center p-4">
            <div id="tempo-slider-label" className="mr-4">Tempo</div>
            <SliderPrimitive.Root
                className="relative flex h-7 w-[300px] touch-none select-none items-center"
                value={[value]}
                min={50}
                max={200}
                onValueChange={handleChange}
                onValueCommit={handleChangeCommitted}
                aria-labelledby="tempo-slider-label"
            >
                <SliderPrimitive.Track className="relative h-0.5 w-full grow rounded-[1px] bg-white/38">
                    <SliderPrimitive.Range className="absolute h-full rounded-[1px] bg-white" />
                </SliderPrimitive.Track>
                <SliderPrimitive.Thumb className="relative block size-3 rounded-full bg-white outline-none">
                    {/* MUI's value label: a 32px teardrop 34px above the thumb, pulled up another
                        10px, with the number rotated back level. */}
                    <span className="absolute -left-[10px] -top-[34px] z-10 block origin-bottom -translate-y-[10px] text-[12px] leading-[1.2]">
                        <span className="flex size-8 rotate-[-45deg] items-center justify-center rounded-[50%_50%_50%_0] bg-white">
                            <span className="rotate-45 text-[rgba(0,0,0,0.87)]">{value}</span>
                        </span>
                    </span>
                </SliderPrimitive.Thumb>
            </SliderPrimitive.Root>
        </div>
    )
```

- [ ] **Step 5: `ProjectName.jsx`**

Keep every handler. The trigger is a text `Button` with the chevron as an end icon; the paper is 130 px wide (100 px below 500 px, which is `theme.breakpoints.down('xs')`):

```jsx
        <AppMenu
            open={open}
            onOpenChange={(next) => { setOpen(next); setSelectedRoundId(next ? round.id : null) }}
            listId="project-name-menu"
            align="start"
            contentClassName="w-[130px] max-sm:w-[100px]"
            trigger={
                <Button variant="plain" aria-haspopup="true" className={cn(MUI_BUTTON, 'gap-2 pl-2 pr-1')}>
                    {name}
                    <ExpandMoreIcon className="size-5" />
                </Button>
            }
        >
            <AppMenuItem onClick={onDuplicateClick}>Duplicate</AppMenuItem>
            <AppMenuItem onClick={onRenameClick}>Rename</AppMenuItem>
            <AppMenuItem onClick={onDeleteClick}>Delete</AppMenuItem>
        </AppMenu>
```

`onRenameClick`, `onDeleteClick` and `onDuplicateClick` each `setOpen(false)` already; keep that.

- [ ] **Step 6: Tests for the four new behaviours**

Write the four files. The essential assertions:

- `HeaderAvatar.test.jsx`: rendering with `user={{ id:'me', displayName:'Ada Lovelace', color:'#f44336' }}` shows `AL`; `container.querySelector('[data-test=button-sign-in-out]')` carries `signed-in`; clicking it with `element.click()` opens the menu (proving `capture.py`'s path); clicking `[title="#2196f3"]` calls `firebase.updateUser('me', { color: '#2196f3' })` and leaves `store.getState().user.color` as `#2196f3`; clicking `[data-test=button-sign-out]` calls `firebase.signOut()` and empties `rounds`, `user`, `round`, `users`.
- `HeaderMenu.test.jsx`: `screen.getByRole('button', { name: 'More options' }).click()` renders `#header-menu-list`; Escape closes it and returns focus; the Fullscreen item calls `document.documentElement.requestFullscreen` (stub it with `vi.fn()` on the element).
- `ProjectName.test.jsx`: opening the menu dispatches `setSelectedRoundId('r1')`; Rename sets `display.isShowingRenameDialog`; Delete sets `display.isShowingDeleteRoundDialog`; Duplicate calls `firebase.createRound` and pushes `/play/<new id>` (assert through `LocationProbe`).
- `TempoSlider.test.jsx`: the slider has `aria-valuenow="120"` for a round at 120 bpm and shows `120`; `await user.keyboard('{ArrowRight}')` after focusing the thumb raises it to 121 and calls `AudioEngine.setTempo` (mock `../../audio-engine/AudioEngine` and `tone` the way `Header.test.jsx` does).

- [ ] **Step 7: Run the suite, then the pixel check for the header**

```bash
corepack yarn -s test && corepack yarn -s lint && corepack yarn -s build
(npx -y serve@14 -s build -l 3100 >/dev/null 2>&1 &)
python3 docs/ui-baseline/capture.py --base http://localhost:3100 --out /tmp/pr2-header --port 9342
python3 docs/ui-baseline/compare.py /tmp/pr2-header
pkill -f 'serve -s build -l 3100'
```

`capture.py` will not get past screen 05 yet: it forces the guest colour through `.circle-picker [title="#f44336"]` and then asserts `[data-test=button-sign-in-out] .MuiAvatar-root`, which no longer exists. Fix that assertion here rather than in Task 5 — change `AVATAR_IS_SWATCH` to accept either markup:

```python
AVATAR_IS_SWATCH = """(() => {
  const a = document.querySelector('[data-test=button-sign-in-out] .MuiAvatar-root, [data-test=button-sign-in-out] [data-slot=avatar-fallback]');
  return a !== null && getComputedStyle(a).backgroundColor === %s;
})()""" % json.dumps(SWATCH_RGB)
```

and replace the two `document.body.click()` menu closes with a real mouse press, because Radix dismisses on `pointerdown` and MUI's `ClickAwayListener` on `click`, and only a dispatched mouse event produces both. Add to `Browser`:

```python
    def press(self, x, y):
        """A real left click at a point, so both ClickAwayListener and Radix see it."""
        for kind in ('mousePressed', 'mouseReleased'):
            self.send('Input.dispatchMouseEvent', type=kind, x=x, y=y, button='left', clickCount=1)

    def key(self, key, code, vk):
        for kind in ('rawKeyDown', 'keyUp'):
            self.send('Input.dispatchKeyEvent', type=kind, key=key, code=code,
                      windowsVirtualKeyCode=vk, nativeVirtualKeyCode=vk)
```

then use `b.press(400, 32)` (empty header, outside every menu and every trigger) followed by `b.js('document.activeElement && document.activeElement.blur()')` wherever `document.body.click()` closed a menu. The blur is what stops Radix's focus restore from leaving a focus ring on the trigger in the shot; it is a no-op for the MUI build.

Expected after those edits: screens 01–08 and 12–13 under 0.5 %; 09 and 11 will move until the menu geometry is right. Iterate on 09 (`391 × 133` at x 888, y 56) and 11 (`238 × 276` at x 997, y 64) by reading `/tmp/pr2-header/diff-09-header-menu.png` and `diff-11-avatar-menu.png` next to the baselines, adjusting `alignOffset`, the item padding and the colour-grid margins until both are under 0.5 %. Record the per-screen numbers.

- [ ] **Step 8: Commit**

```bash
git add src/components/header docs/ui-baseline/capture.py
git commit  # subject: "Move the header, its menus and the tempo slider to shadcn"
```

---

### Task 3: The landing page and the rounds list

**Files:**
- Modify: `src/components/landing-page/LandingPageRoute.jsx`, `src/components/rounds-list-route/RoundsListRoute.jsx`
- Create: `src/components/landing-page/LandingPageRoute.test.jsx`, `src/components/rounds-list-route/RoundsListRoute.test.jsx`

**Interfaces:**
- Consumes `Button`, `MUI_BUTTON`, `AppMenu`, `AppMenuItem`, `Avatar`/`AvatarFallback`, `@/components/icons` (`ImageIcon`, `AddIcon`, `MoreHorizIcon`).
- Produces: no API change; both keep their `connect` maps, their `FirebaseContext` use and their handlers.

- [ ] **Step 1: `LandingPageRoute.jsx`**

Drop `withStyles`, `PropTypes` and the `propTypes` block. `classes.left`, `classes.right` and `classes.video` are dead (nothing ever used them) — do not port them. `Container` (max-width 1200, 24 px gutters) and the two-column `Grid spacing={3}` become:

```jsx
            <div className="mx-auto flex h-full w-full max-w-[1200px] items-center justify-center px-4 pt-16 sm:px-6">
                <div className="-m-3 flex w-[calc(100%+24px)] flex-wrap">
                    <div className="w-full p-3 md:w-1/2">
                        <h1 className="my-[18.76px] text-[28px] font-bold leading-[1.43]">Gather around, make music, and have fun.</h1>
                        <p className="my-[14px]">Rounds is a multi-person live-sampling step-sequencer with social features.  It runs in the browser or as a Native iOS application, with the following steps: compose a pattern (or "Round"), make variations and save presets, share a link to have someone join you with additional layers.  Rounds is best on a recent iPad.</p>
                        <div className="mt-8 w-full text-center">
                            <Button
                                className={cn(MUI_BUTTON, 'mt-4 bg-primary text-primary-foreground hover:bg-primary/90')}
                                onClick={this.onGetStartedClick}
                                data-test="button-get-started"
                            >
                                Get started
                            </Button>
                        </div>
                    </div>
                    <div className="w-full p-3 md:w-1/2">
                        <video width="100%" controls poster="…unchanged…">
                            <source src="…unchanged…" type="video/mp4" />
                            Your browser does not support the video tag.
                        </video>
                    </div>
                </div>
            </div>
```

The copy, the `poster` URL and the `<source src>` are copied over character for character. `sm:px-6` is the theme's 500 px breakpoint, which `src/index.css` already defines. The h1's numbers come from the browser default (2em of the inherited 14 px = 28 px, margin 0.67em of its own size = 18.76 px) with the inherited 1.43 line-height, which is why the headline sits on 40 px lines on `01-landing.png`; the `<p>`'s `my-[14px]` is the same default at 1em of 14 px.

- [ ] **Step 2: `RoundsListRoute.jsx`**

Drop `withStyles`, `PropTypes` and the `propTypes` block, and the `Popper`/`Grow`/`Paper`/`ClickAwayListener`/`MenuList`/`MenuItem` imports. Replace the imperative `anchorElement` state with one `openRoundId` in state and one `AppMenu` per row. Keep `onNewRoundClick`, `onLaunchRoundClick`, `getCreatedString`, `onRenameClick`, `onDuplicateClick`, `onDeleteClick` and the `connect` map, and **keep the second `<SignInDialog />`** at the bottom: `App.jsx` renders one too, so on `/rounds` there are two mounted today; removing one is a behaviour change that belongs in PR 3 (note it in the PR body).

```jsx
            <div className="mx-auto w-full max-w-[1200px] px-4 pt-16 sm:px-6">
                <div className="flex w-full items-center justify-between">
                    <div><h1 className="my-[18.76px] text-[28px] font-bold leading-[1.43]">My rounds</h1></div>
                    <div>
                        <Button data-test="button-new-round" onClick={this.onNewRoundClick} className={cn(MUI_BUTTON, 'gap-2 bg-secondary pl-3 pr-4 text-white hover:bg-secondary/90 [&_svg]:size-5')}>
                            <AddIcon />New round
                        </Button>
                    </div>
                </div>
                <div>
                    <ul className="relative m-0 list-none p-0 py-2">
                        {rounds.map((round) => (
                            <li key={round.id} className="relative">
                                <button
                                    type="button"
                                    data-test="list-item-round"
                                    onClick={this.onLaunchRoundClick.bind(this, round.id)}
                                    className="flex w-full items-center justify-start px-4 py-2 pr-12 text-left hover:bg-white/8"
                                >
                                    <span className="w-14 shrink-0">
                                        <Avatar className="size-10 after:hidden">
                                            <AvatarFallback className="bg-[#757575] text-background"><ImageIcon className="size-6" /></AvatarFallback>
                                        </Avatar>
                                    </span>
                                    <span className="my-1.5 min-w-0 flex-auto">
                                        <span className="block text-base leading-6 tracking-[0.00938em]">{round.name}</span>
                                        <span className="block text-sm leading-[1.43] tracking-[0.01071em] text-white/70">{this.getCreatedString(round)}</span>
                                    </span>
                                </button>
                                <span className="absolute right-4 top-1/2 -translate-y-1/2">
                                    <AppMenu
                                        open={this.state.openRoundId === round.id}
                                        onOpenChange={(next) => { this.setState({ openRoundId: next ? round.id : null }); this.props.setSelectedRoundId(next ? round.id : null) }}
                                        listId="menu-list-grow"
                                        align="center"
                                        alignOffset={-8}
                                        trigger={<Button variant="plain" size="icon-round" aria-haspopup="true" aria-label="Round options"><MoreHorizIcon /></Button>}
                                    >
                                        <AppMenuItem onClick={this.onRenameClick}>Rename</AppMenuItem>
                                        <AppMenuItem onClick={this.onDuplicateClick}>Duplicate</AppMenuItem>
                                        <AppMenuItem onClick={this.onDeleteClick}>Delete</AppMenuItem>
                                    </AppMenu>
                                </span>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
```

`data-test="list-item-round"` must stay on the clickable element (Cypress clicks it and `capture.py` counts it). The three `setState({ menuIsOpen: false })` calls in the handlers become `setState({ openRoundId: null })`.

- [ ] **Step 3: Tests**

`LandingPageRoute.test.jsx`: with no user in the store, clicking `button-get-started` sets `display.redirectAfterSignIn` to `/rounds` and `display.isShowingSignInDialog` to true; with a non-guest user it navigates to `/rounds` (assert with `LocationProbe`); with a guest user it calls `firebase.createRound` and navigates to `/play/<id>`. Mock `tone` and `../../audio-engine/Instruments` the way `Header.test.jsx` does.

`RoundsListRoute.test.jsx`: two rounds render two `list-item-round` rows with their names and created strings; clicking a row navigates to `/play/<id>`; `button-new-round` calls `firebase.createRound` and navigates; opening a row's menu sets `display.selectedRoundId`, and Rename/Delete set the two dialog flags.

- [ ] **Step 4: Run the suite and the pixel check for screens 01 and 12**

```bash
corepack yarn -s test && corepack yarn -s lint && corepack yarn -s build
(npx -y serve@14 -s build -l 3100 >/dev/null 2>&1 &)
python3 docs/ui-baseline/capture.py --base http://localhost:3100 --out /tmp/pr2-routes --port 9343
python3 docs/ui-baseline/compare.py /tmp/pr2-routes
pkill -f 'serve -s build -l 3100'
```

Iterate on `01-landing` and `12-rounds-list` against the measured targets (Get started centred in the left half; New round at x 1100–1226, y 85–120; the list avatar's left edge at x 90) by reading the diff images.

- [ ] **Step 5: Commit**

```bash
git add src/components/landing-page src/components/rounds-list-route
git commit  # subject: "Move the landing page and the rounds list to shadcn"
```

---

### Task 4: The five dialogs and the error boundary

**Files:**
- Modify: `src/components/dialogs/SignInDialog.jsx`, `RenameDialog.jsx`, `DeleteRoundDialog.jsx`, `ShareDialog.jsx`, `OrientationDialog.jsx`, `src/components/ErrorBoundary.jsx`
- Modify: `src/components/dialogs/DeleteRoundDialog.test.jsx`, `ShareDialog.test.jsx` (one new test each)
- Create: `src/components/dialogs/OrientationDialog.test.jsx`, `src/components/ErrorBoundary.test.jsx`
- Keep unchanged: `src/components/dialogs/SignInDialog.test.jsx`, `RenameDialog.test.jsx`

**Interfaces:**
- Consumes `AppDialog`, `AppDialogBody`, `AppDialogContent`, `AppDialogActions`, `MUI_BUTTON`, `Button`, `Spinner`, `OutlinedField`.
- Produces: no API change. Every dialog keeps its redux flag, its title id and its `data-test` hooks.

- [ ] **Step 1: `SignInDialog.jsx`**

Delete `makeStyles` and every MUI import. The four branches keep their exact structure, their copy and their handlers; `emailAddressInput`, `passwordInput`, `emailAddressSignupInput`, `passwordSignupInput`, `displayNameSignupInput` and `displayNameGuestInput` stay `useRef()` and go on the `OutlinedField`s, whose wrapper takes the ref, so `…current.querySelectorAll("input")[0].value` keeps working untouched.

The JSS maps to:

| JSS rule | Tailwind |
|---|---|
| `paper` (8 px) | `AppDialog`'s default `rounded-lg` |
| `title` | `text-center` via `titleClassName` |
| `body` | `AppDialogBody` |
| `button` | `mb-4 text-center` |
| `emailFormItem` | `mb-4 min-w-[300px]` |
| `input` / `& fieldset` | `OutlinedField`'s own 8 px radius |
| `signUpButton` | `font-semibold` |
| `backButton` | `AppDialog`'s `onBack` |
| `error` | `mb-8 text-center font-semibold` |

The choice branch:

```jsx
            <AppDialog open={isShowingSignInDialog} onOpenChange={(next) => { if (!next) onClose() }} titleId="simple-dialog-title" title="Sign in" titleClassName="text-center">
                <AppDialogBody>
                    <Button className={cn(MUI_BUTTON, 'mb-4 w-full bg-secondary text-white hover:bg-secondary/90')} onClick={onGoogleSigninClick}>Continue with Google</Button>
                    <Button className={cn(MUI_BUTTON, 'mb-4 w-full bg-secondary text-white hover:bg-secondary/90')} onClick={onShowEmailSigninClick} data-test="button-email">Sign in with email</Button>
                    <Button className={cn(MUI_BUTTON, 'mb-4 w-full bg-secondary text-white hover:bg-secondary/90')} onClick={onUseAsGuestClick} data-test="button-guest">Use as guest</Button>
                    <p className="my-[14px] text-center">Don't have an account yet?</p>
                    <Button variant="plain" className={cn(MUI_BUTTON, 'mb-4 w-full font-semibold')} onClick={onShowEmailSignupClick}>Sign up</Button>
                </AppDialogBody>
            </AppDialog>
```

**Do not wrap those buttons in a flex column and do not put whitespace between them in JSX.** They are `inline-flex` (the generated `Button`'s base class) inside a block, and the sum of their intrinsic widths is what makes the paper 472 px wide on `02-signin-choice.png`; a flex column collapses it to about 200 px.

The email, guest and signup branches each pass `onBack={onBackClick}` and `backLabel="close"` to `AppDialog` (the label stays `close` — `capture.py` selects the back arrow with it) and keep their `<form onSubmit>` so Enter still submits. Each field becomes:

```jsx
                            <OutlinedField ref={emailAddressInput} className="mb-4 min-w-[300px]" id="signin-email" label="Email address" type="email" data-test="input-email" />
```

`data-test` lands on the wrapper, which is where MUI's `TextField` puts it today; `id` lands on the `<input>`, which is what makes `getByLabelText` work. The `<form>` keeps `className="flex flex-col"`, `noValidate` and `autoComplete="off"`. The submit buttons keep `data-test="button-sign-in"` / `data-test="button-name"`, `<strong>` around their labels, and `className={cn(MUI_BUTTON, 'mb-4 w-full bg-primary text-primary-foreground hover:bg-primary/90')}`.

- [ ] **Step 2: `ShareDialog.jsx`**

Keep both effects, `getFullUrl`, `onCopyClick` and the `connect` map. `inputRef` becomes a ref on the `OutlinedField` wrapper, and the `execCommand` fallback reads the input out of it:

```jsx
            } else if (fieldRef.current) {
                const input = fieldRef.current.querySelectorAll('input')[0]
                input.focus()
                input.select()
                document.execCommand('copy')
                input.blur()
            }
```

Markup:

```jsx
        <AppDialog open={isShowingShareDialog} onOpenChange={(next) => { if (!next) handleClose() }} titleId="share-dialog-title" title="Share project" titleClassName="text-center">
            <AppDialogBody>
                <p className="my-[14px]">Use the QR code or link to join the collaboration.</p>
                <div className="flex items-center justify-center p-4">
                    <canvas ref={canvasRef} id="QRCanvas" aria-label="QR code for this round's link" role="img"></canvas>
                </div>
                <div className="flex">
                    <OutlinedField ref={fieldRef} className="mr-4" id="share-link" label="Link" value={link} onChange={() => {}} inputProps={{ readOnly: true }} />
                    <Button className={cn(MUI_BUTTON, 'min-w-[100px] shrink-0 bg-secondary text-white hover:bg-secondary/90')} onClick={onCopyClick}>{copied ? 'Copied' : 'Copy'}</Button>
                </div>
            </AppDialogBody>
        </AppDialog>
```

`id="QRCanvas"` and the input's `id="share-link"` are what `capture.py` masks; the canvas must keep its intrinsic size (do not give it a Tailwind width or the capture aborts on `QR_SIZES`). The dialog is 358 px wide on the baseline because the link row's intrinsic width (a default 20-character input plus 16 px plus a 100 px button) drives it — keep `min-w-[100px]` on Copy and no width on the field.

- [ ] **Step 3: `RenameDialog.jsx`**

The input becomes controlled, because `@/components/ui/input` is a plain function component and cannot take a ref on React 18. Replace `inputRef` with state seeded from `currentName`:

```jsx
    const [name, setName] = React.useState(currentName)
    React.useEffect(() => { setName(currentName) }, [currentName, isShowingRenameDialog])
```

and read `name.trim()` in `onOkClick`. `RenameDialog.test.jsx` needs no change: it queries `getByLabelText('Round name')`, clears, types and submits.

MUI's field here is the **standard** variant, not outlined, so use `Label` + `Input` rather than `OutlinedField`: a 1 px bottom border in `rgba(255,255,255,0.7)` that becomes 2 px `#EAEAEA` on focus, the label above at `rgba(255,255,255,0.7)`, and `margin="dense"`:

```jsx
        <AppDialog open={isShowingRenameDialog} onOpenChange={(next) => { if (!next) handleClose() }} titleId="rename-dialog-title" title="Rename" className="rounded-[32px]">
            <form onSubmit={onSubmit} noValidate>
                <AppDialogContent>
                    <Label htmlFor="name" className="mt-1 block text-xs font-normal text-white/70">Round name</Label>
                    <Input id="name" value={name} onChange={(e) => setName(e.target.value)} autoFocus className="mb-1 h-8 w-full rounded-none border-0 border-b border-white/70 bg-transparent px-0 text-base md:text-base focus-visible:border-b-2 focus-visible:border-foreground focus-visible:ring-0" />
                </AppDialogContent>
                <AppDialogActions>
                    <Button type="button" variant="plain" className={cn(MUI_BUTTON, 'px-2')} onClick={handleClose}>Cancel</Button>
                    <Button type="submit" className={cn(MUI_BUTTON, 'bg-primary text-primary-foreground hover:bg-primary/90')}>Rename</Button>
                </AppDialogActions>
            </form>
        </AppDialog>
```

`className="rounded-[32px]"` is not a typo: this dialog never overrode `Paper`'s radius, so it takes the theme's `shape.borderRadius: 32` today. Same for the next two. No baseline screen photographs any of the three, so the corners are the only thing keeping them honest — say so in the PR body.

- [ ] **Step 4: `DeleteRoundDialog.jsx`**

Keep `onOkClick` and its error handling. The `disableFocusRipple` comment and prop go away with `ButtonBase`; keep `autoFocus` on Cancel.

```jsx
        <AppDialog open={isShowingDeleteRoundDialog} onOpenChange={(next) => { if (!next) handleClose() }} titleId="delete-dialog-title" title="Are you sure you want to delete this round?" className="rounded-[32px]">
            <AppDialogContent>
                <p className="mb-3 mt-0 text-white/70">This removes the round and all of its layers for everyone. It cannot be undone.</p>
                {errorMessage && <p className="mb-3 mt-0 text-destructive" role="alert">{errorMessage}</p>}
            </AppDialogContent>
            <AppDialogActions>
                <Button type="button" variant="plain" className={cn(MUI_BUTTON, 'px-2')} onClick={handleClose} autoFocus disabled={isDeleting}>Cancel</Button>
                <Button className={cn(MUI_BUTTON, 'bg-primary text-primary-foreground hover:bg-primary/90')} onClick={onOkClick} disabled={isDeleting}>
                    {!isDeleting && <span>Delete</span>}
                    {isDeleting && <Spinner className="size-6 text-primary" />}
                </Button>
            </AppDialogActions>
        </AppDialog>
```

`text-primary` on the spinner keeps it the same colour as the button it sits on, i.e. invisible, which is what `CircularProgress color="primary"` on a `#EAEAEA` button does today. Do not "fix" it here.

Add one test to `DeleteRoundDialog.test.jsx`:

```jsx
    it('closes on Escape without deleting anything', async () => {
        const { store, firebase } = setup({ deleteRound: vi.fn().mockResolvedValue() })
        await userEvent.keyboard('{Escape}')
        await waitFor(() => expect(store.getState().display.isShowingDeleteRoundDialog).toBe(false))
        expect(firebase.deleteRound).not.toHaveBeenCalled()
    })
```

- [ ] **Step 5: `OrientationDialog.jsx`**

```jsx
        <AppDialog open={isShowingOrientationDialog} onOpenChange={(next) => { if (!next) handleClose() }} titleId="orientation-dialog-title" title="Please rotate your device to landscape mode" className="rounded-[32px]">
            <AppDialogContent>
                <p className="mb-3 mt-0 text-white/70">The round needs the wider layout. Tap outside this message to continue anyway.</p>
            </AppDialogContent>
        </AppDialog>
```

`OrientationDialog.test.jsx`: with the flag set it renders the title carrying `id="orientation-dialog-title"`; Escape clears the flag; with the flag unset nothing renders. `capture.py` asserts `gone('#orientation-dialog-title')` on screen 13, so the id is load-bearing.

- [ ] **Step 6: `ErrorBoundary.jsx`**

Only `render()` changes; `getDerivedStateFromError`, `componentDidCatch` and the `FirebaseContext` use stay.

```jsx
                <div role="alert" className="px-8 py-16 text-center">
                    <p className="mb-[0.35em] mt-0 text-2xl leading-[1.334]">Something went wrong.</p>
                    <p className="mb-[0.35em] mt-0 text-base leading-6 tracking-[0.00938em] text-white/70">{message}</p>
                    <Button className={cn(MUI_BUTTON, 'bg-primary text-primary-foreground hover:bg-primary/90')} onClick={() => window.location.assign('/rounds')}>
                        Back to my rounds
                    </Button>
                </div>
```

`text-2xl leading-[1.334]` is MUI's `h5`; `mb-[0.35em]` is `gutterBottom`. `ErrorBoundary.test.jsx`: a child that throws renders the message and a "Back to my rounds" button, and `firebase.reportError` is called with `{ fatal: true, context: 'render' }`; silence `console.error` for the test the way `DeleteRoundDialog.test.jsx` does.

- [ ] **Step 7: Add a Share-dialog Escape test and run everything**

```jsx
    it('closes on Escape', async () => {
        const store = openDialogWith({ id: 'r1', name: 'Jam', layers: [], currentUsers: [], shortLink: 'https://bit.ly/stored' })
        renderWithProviders(<ShareDialog />, { store, firebase: { createShortLink: vi.fn() } })
        await userEvent.keyboard('{Escape}')
        await waitFor(() => expect(store.getState().display.isShowingShareDialog).toBe(false))
    })
```

```bash
corepack yarn -s test && corepack yarn -s lint && corepack yarn -s build
```

Expected: green and silent. If Radix logs `Warning: Missing 'Description' or 'aria-describedby'`, `AppDialog` is not passing `aria-describedby={undefined}` through.

- [ ] **Step 8: Teach `capture.py` the new dialog markup, then check screens 02, 03, 04 and 10**

Two more selector changes:

```python
b.click('[data-test=dialog-back], .MuiDialogTitle-root button[aria-label=close]', 'the dialog back button')
```

and replace the share dialog's backdrop click with a real Escape, which closes both implementations (MUI's `Modal` calls `onClose` on `escapeKeyDown`, Radix dismisses):

```python
b.key('Escape', 'Escape', 27)
b.must(gone('#share-dialog-title'), 'the share dialog closing')
```

Then:

```bash
(npx -y serve@14 -s build -l 3100 >/dev/null 2>&1 &)
python3 docs/ui-baseline/capture.py --base http://localhost:3100 --out /tmp/pr2-dialogs --port 9344
python3 docs/ui-baseline/compare.py /tmp/pr2-dialogs
pkill -f 'serve -s build -l 3100'
```

Iterate against the measured targets: paper 472 × 340 at x 414/y 280 on 02; 332 wide at x 484/y 303 with the title rule at y 367 and the field's top border at y 384 on 03; 332 wide on 04 with the "Name" label floated; 358 wide at x 471/y 243 on 10 with the "Link" label floated and notched. If 02 comes out near 230 px wide, the choice buttons have been wrapped in a flex container — see the 472 px trap above.

- [ ] **Step 9: Commit**

```bash
git add src/components/dialogs src/components/ErrorBoundary.jsx docs/ui-baseline/capture.py
git commit  # subject: "Move the dialogs and the error boundary to shadcn"
```

---

### Task 5: Drop react-color, run the gate

**Files:**
- Modify: `package.json`, `yarn.lock`
- Modify: `src/index.css` (only if the pixel pass asks for it)

- [ ] **Step 1: Remove `react-color`**

```bash
grep -rn "react-color" src cypress docs || echo "no imports left"
CYPRESS_INSTALL_BINARY=0 corepack yarn remove react-color
```

Expected: the grep prints nothing (the only import was `HeaderAvatar.jsx`'s `CirclePicker`), and `package.json`/`yarn.lock` lose the dependency. `react-loader-spinner` stays — `PlayRoute` still uses it.

- [ ] **Step 2: The grep gate**

```bash
# App.jsx is excluded on purpose: it still owns ThemeProvider, CssBaseline and the MUI theme
# object, which the play route needs until PR 3.
grep -rn "@material-ui\|withStyles\|makeStyles\|style={{" \
  src/components/header src/components/landing-page src/components/rounds-list-route \
  src/components/dialogs src/components/ErrorBoundary.jsx src/components/fields
```

Expected output: exactly the two `style={{ '--user-color': user.color }}` lines in `HeaderAvatar.jsx`, and nothing else. `Header.test.jsx` legitimately imports `@material-ui/core/styles` for the theme `JitsiComponent` reads; keep it out of the grep by scoping to non-test files if it fires, and say why in the PR body.

Then confirm the migrated files reach for the right modules:

```bash
grep -rln "@/components/ui/\|@/components/icons\|@/components/fields/OutlinedField\|@/lib/utils" \
  src/components/header src/components/landing-page src/components/rounds-list-route \
  src/components/dialogs src/components/ErrorBoundary.jsx
```

- [ ] **Step 3: Prune the base-layer typography shim if it is no longer load-bearing**

```bash
grep -rn "<h[1-6]\|<p[ >]\|<p$" src/components --include=*.jsx | grep -v "/header/\|/landing-page/\|/rounds-list-route/\|/dialogs/\|/fields/\|ErrorBoundary"
```

If that prints nothing, every bare heading and paragraph now carries explicit Tailwind sizes, and the `h1, h2, h3, h4, h5, h6, p { font-size: revert; font-weight: revert; margin: revert }` rule in `src/index.css` can go (the migrated files zero their own margins, so leaving it in would be harmless but misleading). If it prints anything under `src/components/play/`, keep the rule and narrow its comment to name those files. The `input:not([data-slot="input"])…` and `img:not([data-slot])` rules stay either way — both are about the play route.

Whatever is decided, the next step is the proof.

- [ ] **Step 4: The full pixel pass**

```bash
corepack yarn -s lint && corepack yarn -s test && corepack yarn -s build
(npx -y serve@14 -s build -l 3100 >/dev/null 2>&1 &)
python3 docs/ui-baseline/capture.py --base http://localhost:3100 --out /tmp/pr2-final --port 9345
python3 docs/ui-baseline/compare.py /tmp/pr2-final
pkill -f 'serve -s build -l 3100'
```

Record the number for every one of the thirteen screens in the report and in the PR body. For any screen over 0.5 %, open `/tmp/pr2-final/diff-<name>.png` beside `docs/ui-baseline/<name>.png` and the candidate, name the rule that moved, and fix it in the component (or, if it is a preflight interaction, in `src/index.css` scoped to the affected element — never a blanket un-reset). Re-run until every screen holds, or until the residual is understood and can be written up.

Screens 05, 06, 07, 08 and 13 are play-route screens that PR 2 changes only through the header strip at y 0–63; a diff concentrated below y 64 on those means something leaked out of the header and has to be chased down rather than accepted.

Differences that are expected, and that go in the PR body with their diff images if they cost more than the threshold:

- menu and dialog open/close motion is Radix's 200 ms fade+zoom instead of MUI's `Grow` (240–310 ms, from `scale(0.75, 0.5625)`). Settled screenshots cannot see it.
- contained-primary label is `#1b1b1b` where MUI uses `rgba(0,0,0,0.87)`, and contained-secondary is `#EAEAEA` where MUI uses `#FFFFFF`; both are inside `compare.py`'s 24-per-channel tolerance and both come from the spec's token table.
- the rename field is a controlled input; the rename, delete and orientation dialogs are unphotographed.

- [ ] **Step 5: Keyboard check by hand**

On the served build: every dialog closes on Escape, keeps Tab inside itself and puts focus back on the control that opened it; every menu opens with Enter or Space, walks with the arrow keys, closes on Escape and returns focus. This is an improvement over MUI's `Popper` + `ClickAwayListener`, which had no Escape at all, and the spec asks for it per PR.

- [ ] **Step 6: Commit**

```bash
git add package.json yarn.lock src/index.css
git commit  # subject: "Drop react-color now the colour grid replaces it"
```

- [ ] **Step 7: Hand over**

Report: the thirteen per-screen percentages, the gzip size from the last build, the list of intended differences with their diff images, and the two open items for PR 3 — the duplicate `<SignInDialog />` that `RoundsListRoute` still mounts, and the fact that deleting `CssBaseline` will change the app's font family from Roboto/Helvetica/Arial to the system stack unless `src/index.css` is made to carry MUI's stack instead. The two-browser collaboration check on the preview channel is the controller's to run.
