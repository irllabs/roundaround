/**
 * Material UI's Button, as Tailwind class strings.
 *
 * These outlived Material UI itself: the app still draws MUI's pill, its `primary.dark` hover
 * and its `action.disabled` colour-only disabled state, and nothing generates them any more, so
 * the strings are the specification. They lived in `dialogs/AppDialog.jsx` through PR 2 because
 * that is where the dialogs needed them; they are not about dialogs.
 */

/**
 * MUI's Button, which the theme's 32px radius turns into a pill.
 *
 * The two `disabled:` utilities are MUI's disabled Button, which every variant shares through
 * `Button.root`'s `&$disabled { color: theme.palette.action.disabled }`. On a dark palette that
 * is a flat `rgba(255, 255, 255, 0.3)` -- MUI changes the colour and nothing else. The generated
 * Button ships `disabled:opacity-50` instead, which fades the entire element, glyph and fill
 * together, so it has to be turned back off rather than merely overpainted.
 */
export const MUI_BUTTON = 'h-auto min-w-16 rounded-full border-0 px-4 py-1.5 text-sm font-medium leading-[1.75] tracking-[0.02857em] shadow-none disabled:opacity-100 disabled:text-white/30'

/**
 * MUI's `contained` `color="primary"` Button: the pill with a fill.
 *
 * Read off `Button.js` against the theme this app used to build in `src/App.jsx`. That theme
 * was deleted with Material UI; the palette it set is now the `:root` block in
 * `src/index.css`, and the theme tokens are written up in
 * `docs/superpowers/specs/2026-09-07-shadcn-ui-migration-design.md`:
 *
 * - background is `palette.primary.main`, `#EAEAEA`, which is the `--primary` token.
 * - hover is `palette.primary.dark`. The theme sets `dark` itself, `#AAAAAA`, so there is no
 *   `darken(main, tonalOffset)` to derive -- MUI only computes `dark` for a palette colour given
 *   as a bare `main`. `--muted-foreground` is that same `#AAAAAA`, so the hover is a token too.
 *   `hover:bg-primary/90` was `#EAEAEA` at 90% over whatever is behind the button, which is
 *   lighter than the button itself on this app's dark ground; MUI's hover is darker.
 * - text is `palette.primary.contrastText`, which the theme does not set, so MUI computed it:
 *   `getContrastText('#EAEAEA')` measures the contrast ratio against white, gets 1.20, which is
 *   under the default threshold of 3, and returns `light.text.primary`, `rgba(0, 0, 0, 0.87)`.
 *   Composited on `#EAEAEA` that is (31,31,31); `--primary-foreground` is `#1b1b1b`, 4/255 away
 *   and inside the pixel gate's own 24-per-channel tolerance, and it is the token the rest of the
 *   app already uses, so the token stays.
 * - disabled is `contained`'s own `&$disabled`: `palette.action.disabled` on
 *   `palette.action.disabledBackground`, `rgba(255,255,255,0.3)` on `rgba(255,255,255,0.12)`,
 *   with no opacity change anywhere.
 */
export const MUI_PRIMARY = 'bg-primary text-primary-foreground hover:bg-muted-foreground disabled:opacity-100 disabled:bg-white/12 disabled:text-white/30'

/**
 * MUI's `contained` `color="secondary"` Button, read the same way.
 *
 * Background is `palette.secondary.main`, `#474747`, the `--secondary` token; hover is
 * `palette.secondary.dark`, which the theme sets to `#333333`. No token holds `#333333`, so it is
 * spelled as a hex. Text is `palette.secondary.contrastText`, again computed:
 * `getContrastText('#474747')` measures 9.29 against white, over the threshold of 3, so it is
 * `dark.text.primary`, plain white. The disabled trio is the same shared `contained` rule.
 */
export const MUI_SECONDARY = 'bg-secondary text-white hover:bg-[#333333] disabled:opacity-100 disabled:bg-white/12 disabled:text-white/30'
