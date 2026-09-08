# shadcn/ui migration — design

Date: 2026-09-07. Status: approved by Meriç (visual target: same look, new engine; staged in three PRs).

## Goal

Replace Material UI 4, JSS (`withStyles`/`makeStyles`) and every inline style in the React app with shadcn/ui 4 components styled by Tailwind 4, driven by a theme whose values are extracted from the current implementation, so that users see no visual change. The SVG.js drawing of the round (`PlayUI.jsx`) is not DOM UI and stays as it is.

## Non-goals

- No redesign: hierarchy, spacing, copy and layout stay the same. Where shadcn's defaults differ from today, today wins.
- No router upgrade: react-router-dom stays on 5 unless it breaks on React 19.
- No light theme. The app is dark only; the tokens are defined once on `:root`.
- No TypeScript. shadcn is initialised with JavaScript output.

## Theme tokens

All values come from `src/App.jsx` (MUI palette), the JSS blocks, `src/App.css`/`src/index.css`, and the baseline screenshots in `docs/ui-baseline/` (captured from rounds.studio on 2026-09-07 at 1300×900, plus one mobile shot at 390×844).

| Token | Value | Source |
|---|---|---|
| `--background` / `--foreground` | `#1b1b1b` / `#EAEAEA` | App.css body, palette text.primary |
| `--surface` (header, bottom bar base) | `#2d2d2d`; bottom bar = white at 10% over background | screenshots, JSS `rgba(255,255,255,0.1)` |
| `--card`, `--popover`, dialog paper | `#424242`; dialog/popover title strip `#383838` | share and sign-in dialogs |
| `--primary` / `--primary-foreground` | `#EAEAEA` / `#1b1b1b` | light pill buttons |
| `--secondary` / `--secondary-foreground` | `#474747` / `#EAEAEA` | grey pill buttons, S/M toggles |
| `--muted-foreground` | `#AAAAAA` | palette primary.dark |
| `--accent` (selected) | white at 20% | JSS `rgba(255,255,255,0.2)`. This is the app's selected/open tint (`bg-white/20` on an open popup's trigger), not its hover: MUI's `IconButton`/`MenuItem` hover is white at 8%, spelled at the call site as `hover:bg-white/8` in `Button`'s `plain` variant and in `AppMenuItem`. |
| `--border` | white at 10% | JSS. MUI's `Divider` is `divider`, white at 12%, which the app draws at the call site with `bg-white/12` on `Separator` and in `MUI_PRIMARY`/`MUI_SECONDARY`'s disabled fill rather than by moving this token, since `--border` paints every border in the app. |
| `--input` | `#424242` field, outline white at 35% | text fields |
| `--destructive` | `#F44336` | delete flows |
| `--ring` | `#EAEAEA` | palette action.active |
| `--radius` | 8px (dialogs, popovers, inputs' outer shape); buttons, icon buttons, avatars and toggles are full pills | shape.borderRadius 32, screenshots |
| type | `"Roboto", "Helvetica", "Arial", sans-serif`; body 14px, caption 12px, dialog title 20px, landing headline 30px bold; buttons keep sentence case | MUI `CssBaseline`, unlayered on `body`; every screen in `docs/ui-baseline/` was photographed with it, and no Roboto is served, so it renders as Helvetica. The spec originally named the system stack; keeping it would have changed every glyph on every screen, which is a redesign and not this migration. Also index.css, JSS, MUI typography |
| breakpoints | `sm 500px`, `md 900px`, `lg 1200px`, `xl 1536px` | MUI theme |
| motion | 200 ms ease for open/close (Radix `data-state` + Tailwind animation utilities), matching MUI Grow | MUI transitions |

User colours (17 swatches in `src/utils/constants.js`) are runtime data from Firestore, not theme tokens. They are the single permitted inline style, applied as a CSS variable (`style={{ '--user-color': color }}`) and consumed by classes.

Values not documented in code (MUI default shadows, exact paddings) are taken from the baseline screenshots during implementation and confirmed by the pixel comparison.

## Component mapping

| Today (MUI 4) | After |
|---|---|
| `Box`, `Container`, `Grid`, `Typography` | plain elements with Tailwind classes |
| `Button`, `IconButton` | shadcn `Button` with variants `primary`, `secondary`, `ghost`, `icon` (round, 48px) |
| `Dialog`, `DialogTitle`, `DialogContent`, `DialogContentText`, `DialogActions` | shadcn `Dialog` with an app title strip; the sign-in dialog keeps its back arrow in the strip |
| `Popper` + `Grow` + `ClickAwayListener` + `Paper` + `MenuList`/`MenuItem` | `Popover` where the content is more than a menu (header "…" menu with the tempo slider, avatar menu with the colour grid); `DropdownMenu` for plain menus |
| `TextField`, `FormControl` | `Input` + `Label`, wrapped by a small `OutlinedField` that reproduces the floating label of the outlined variant (used by the share link and sign-in fields) |
| `Slider` | shadcn `Slider`; the tempo slider's value bubble becomes a `Tooltip` bound to the thumb |
| `Avatar` | shadcn `Avatar` (image or initials fallback, background from the user colour variable) |
| `Divider` | `Separator` |
| `List`, `ListItem`, `ListItemAvatar`, `ListItemText`, `ListItemSecondaryAction`, `ListItemIcon` | a Tailwind list of `Button` rows |
| `CircularProgress`, react-loader-spinner `Puff` | shadcn `Spinner` |
| `CssBaseline` | Tailwind preflight + `src/index.css` |
| `@material-ui/icons/*` (12 glyphs) | local SVG components in `src/components/icons/` copied from the MUI icon paths, so glyphs are identical; the app's own SVG resources stay; `lucide-react` remains only as a dependency of the generated shadcn components |
| react-color `CirclePicker` | a grid of round colour buttons in the avatar menu |
| `withStyles`/`makeStyles` (19 files), 61 inline `style={{}}` | Tailwind classes composed with `cn()`; dynamic values via CSS variables |

The Jitsi container keeps its markup and gets Tailwind classes. `PlayUI.jsx` keeps drawing with SVG.js; the two JSS class names it puts on SVG nodes (`classes.button`, `classes.buttonIcon`) become Tailwind classes.

## Stack

- React 17 → 18 in PR 1 (`createRoot` in `src/index.jsx`), react-redux 7 → 9, Redux Toolkit 1.9 → 2 (redux 5), @testing-library/react 11 → 16 with user-event 14. React 18 → 19 in PR 3, after Material UI is deleted: MUI 4 calls `findDOMNode` (ButtonBase, Modal, Popover, its transitions), which React 19 removed, so the two cannot coexist. Until then the generated `Button` carries a `forwardRef` so Radix's `asChild` works on React 18. react-router-dom 5 stays. Vite 7, Vitest 3, eslint 8 stay.
- Tailwind 4 via `@tailwindcss/vite`; shadcn 4.21 CLI initialised with `-b radix -p nova --pointer` (`components.json`: style `radix-nova`, `tsx: false`, css `src/index.css`, alias `@/` → `src/`); components are JavaScript, import `cn` from the `cn` package and primitives from `radix-ui`; `lucide-react` and `tw-animate-css` come along as their internal dependencies (the app's own icons are the copied Material glyphs); the preset's Geist font is removed in favour of the system stack; `jsconfig.json` and the Vite alias for `@/`.
- Removed at the end of PR 3: `@material-ui/core`, `@material-ui/icons`, `react-color`, `react-loader-spinner`.

## File layout

```
src/index.css                     Tailwind import, theme tokens (:root), the few global rules
src/lib/utils.js                  cn()
src/components/ui/*.jsx           shadcn-generated components (button, dialog, popover, dropdown-menu, input, label, slider, avatar, separator, spinner, tooltip)
src/components/icons/*.jsx        the twelve copied Material glyphs
src/components/fields/OutlinedField.jsx   floating-label wrapper around Input
components.json, jsconfig.json    shadcn + alias config
docs/ui-baseline/                 baseline screenshots + capture.py (the capture script)
```

Everything else keeps its current path and file name.

## Staging

- PR 1, foundation: React 18 and the library upgrades above; Tailwind + shadcn initialised with the tokens; `cn`, icons, `OutlinedField`, the generated ui components; jsdom shims for Radix in `setupTests.js`. MUI still installed and rendering everything. Pixel comparison must show no change.
- PR 2, shell: `App.jsx` (theme object removed), `Header`, `HeaderAvatar`, `HeaderMenu`, `ProjectName`, `TempoSlider`, `LandingPageRoute`, `RoundsListRoute`, `SignInDialog`, `RenameDialog`, `DeleteRoundDialog`, `ShareDialog`, `ErrorBoundary`, `OrientationDialog`. MUI removed from these files.
- PR 3, play route: `PlayRoute`, `LayerSettings` and every `layer-settings/*` popup, `EffectsSidebar`, `EffectThumbControl`, `JitsiComponent`, `PlayUI`'s class names; then MUI, JSS, react-color, react-loader-spinner and the last inline styles are deleted, and React moves to 19 (drop the `forwardRef` on `Button`). `grep -rn "@material-ui\|withStyles\|makeStyles\|style={{" src` returns only the user-colour variable.

Each PR: unit tests green (data-test hooks kept), Cypress smoke green, pixel comparison reviewed, two-browser collaboration check on the preview, then merge (deploys to production).

## Verification

- Unit tests query by `data-test` and roles; assertions on MUI class names are rewritten to behaviour. Radix needs `ResizeObserver`, `DOMRect`/`getBoundingClientRect` and pointer-capture shims in jsdom; they are added to `src/setupTests.js` in PR 1.
- Pixel comparison: `docs/ui-baseline/capture.py` re-captures the same 13 states against a served build; a diff script (PIL) reports the changed-pixel ratio per screen. Threshold 0.5% after ignoring the round's step colours (random per guest); anything above is inspected by eye and either fixed or listed as an intended difference in the PR body.
- Keyboard: every dialog closes on Escape, traps Tab, and returns focus to its trigger; every menu is keyboard-navigable. This is an improvement over today and is checked per PR.

## Risks

- react-router-dom 5 on React 19: works in a smoke test; if it misbehaves, PR 1 grows a router upgrade to 6.
- MUI defaults that are not in the code (shadows, exact paddings) are only caught by the pixel pass.
- Each merge deploys to production; the three-PR staging is what limits blast radius, and each PR is reverted by reverting one merge commit.

## Decisions taken

- Same look, new engine (Meriç, 2026-09-07). Three staged PRs (Meriç). Latest shadcn and a React bump (Meriç): React 18 now, 19 when MUI is gone, because MUI 4 cannot run on 19. No router upgrade, JavaScript output, local icon copies for the app's glyphs, user colours as the single inline style (controller).
