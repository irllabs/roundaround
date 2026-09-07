# shadcn migration, PR 1 (foundation) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Put the new UI engine in place (React 18, Tailwind 4, shadcn 4 with the app's own theme tokens, copied icons, the outlined-field wrapper, jsdom shims, pixel-comparison tooling) while Material UI keeps rendering every screen, so the deploy shows no visual change.

**Architecture:** The app stays a Vite + React SPA. Tailwind 4 is added through `@tailwindcss/vite`; shadcn 4 generates JavaScript components into `src/components/ui/` on the `radix-ui` package; the theme is a hand-written `:root` block of hex tokens in `src/index.css` that replaces the preset's oklch values. Nothing in `src/components/**` other than `App.jsx` (the CSS import) consumes the new pieces yet; PR 2 and PR 3 migrate the screens. React goes to 18 now because MUI 4 depends on `findDOMNode`, which React 19 removed; React 19 follows in PR 3 when MUI is deleted.

**Tech Stack:** React 18.3.1, react-redux 9.3, Redux Toolkit 2.12, @testing-library/react 16.3 + user-event 14.6 + jest-dom 7, Vite 7, Vitest 3, Tailwind 4.3 (`@tailwindcss/vite`), shadcn 4.21 (`radix-ui` 1.6, `class-variance-authority` 0.7, `cn` 0.2, `tw-animate-css` 1.4, `lucide-react` as an internal dependency of the generated components), Python 3 + Pillow + websocket-client for the screenshot tooling (already on the QA machine), Google Chrome headless.

**Spec:** `docs/superpowers/specs/2026-09-07-shadcn-ui-migration-design.md`

## Global Constraints

- Node 22 (`.nvmrc`), yarn 1 via `corepack yarn`. After every task these pass from the repo root: `corepack yarn -s lint`, `corepack yarn -s test`, `corepack yarn -s build`. After any `package.json` change run `CYPRESS_INSTALL_BINARY=0 corepack yarn install` and commit `yarn.lock` (CI installs with `--frozen-lockfile`).
- No TypeScript: `components.json` has `"tsx": false`; every new file is `.js`/`.jsx`.
- No visual change in this PR: the pixel comparison in Task 7 must report every screen within 0.5% changed pixels of the baseline.
- Theme tokens are exactly the values in the spec's token table (hex). Font stack stays `-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif`. Breakpoints `sm 500px`, `md 900px`, `lg 1200px`, `xl 1536px`.
- Material UI stays installed and untouched in this PR; do not edit any file under `src/components/` except `src/App.jsx` (one import line) and new files under `src/components/ui/`, `src/components/icons/`, `src/components/fields/`.
- Test output must be pristine (no act() warnings, no React 18 deprecation warnings, no Tone banner).
- Commits: imperative subject under 72 chars, a body that says why, ending with these two lines exactly:
  `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`
  `Claude-Session: https://claude.ai/code/session_01Rb8iHgPPsGgjMsPQnrsYYd`
  Commit with `git -c user.name="Meriç Dağlı" -c user.email="mericda@gmail.com" commit ...`.
- Do not run `firebase`, `gh`, or `git push`. Do not edit `.github/`, `firebase.json`, `firestore.rules`, `functions/`, `cypress/`.

---

## File structure

```
package.json, yarn.lock                 upgraded React/Redux/Testing Library; Tailwind + shadcn deps
jsconfig.json                           "@/*" → "./src/*" (editor + shadcn CLI)
vite.config.js                          tailwindcss() plugin, "@" alias, unchanged test block
components.json                         shadcn config (style radix-nova, tsx false, css src/index.css)
src/index.css                           Tailwind imports, @theme (breakpoints, radii), :root tokens, base rules (absorbs App.css)
src/App.css                             deleted (rules moved into index.css)
src/App.jsx                             the `./App.css` import removed (only change)
src/index.jsx                           createRoot
src/setupTests.js                       jest-dom v7 import, Radix shims
src/lib/utils.js                        `export { cn } from "cn"` (generated)
src/components/ui/*.jsx                 generated: button, dialog, popover, dropdown-menu, input, label, slider, avatar, separator, spinner, tooltip
src/components/ui/ui-smoke.test.jsx     proves the generated components render and open under jsdom
src/components/icons/index.js + *.jsx   the twelve copied Material glyphs
src/components/icons/icons.test.jsx     each glyph equals the MUI path data
src/components/fields/OutlinedField.jsx floating-label wrapper around Input
src/components/fields/OutlinedField.test.jsx
docs/ui-baseline/capture.py             (existing) gains a deterministic user colour + a --base flag
docs/ui-baseline/compare.py             per-screen changed-pixel ratio + diff images
docs/ui-baseline/README.md              how to capture and compare
docs/ui-baseline/*.png                  re-captured baseline with the deterministic colour
```

---

### Task 1: React 18, Redux 5, Testing Library 16

**Files:**
- Modify: `package.json`, `yarn.lock`
- Modify: `src/index.jsx`
- Modify: `src/setupTests.js`
- Modify: `src/components/dialogs/SignInDialog.test.jsx`, `ShareDialog.test.jsx`, `RenameDialog.test.jsx`, `DeleteRoundDialog.test.jsx` (user-event 14 is async)
- Modify: `src/test/test-utils.jsx` only if it imports from `react-dom` directly

**Interfaces:**
- Produces: the app renders through `createRoot`; `react-redux` 9 `connect` and `Provider` keep their API; RTK 2 `configureStore`/`createReducer` (the reducers already use the builder callback).

- [ ] **Step 1: Upgrade the packages**

```bash
corepack yarn add react@18.3.1 react-dom@18.3.1 react-redux@9.3.0 @reduxjs/toolkit@2.12.0 redux@5
corepack yarn add -D @testing-library/react@16.3.3 @testing-library/dom@10.4.1 @testing-library/jest-dom@7.0.1 @testing-library/user-event@14.6.7
```

Then remove `redux` from `dependencies` only if nothing imports it directly (`grep -rn "from 'redux'" src`); `@reduxjs/toolkit` 2 depends on redux 5 itself. Keep `react-router-dom` at 5 (peer `react >=15`).

- [ ] **Step 2: Switch the entry point to createRoot**

`src/index.jsx`:

```jsx
import React from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { Provider } from 'react-redux';
import store from './redux/store'
import { FirebaseContext, Firebase } from './firebase/index';

const firebase = new Firebase()
// keep the existing error/unhandledrejection listeners exactly as they are today

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Provider store={store}>
      <FirebaseContext.Provider value={firebase}>
        <App />
      </FirebaseContext.Provider>
    </Provider>
  </React.StrictMode>
);

reportWebVitals();
```

Read the current `src/index.jsx` first and keep every line that is not `ReactDOM.render` (the `reportError` listeners added in #312 must survive).

- [ ] **Step 3: jest-dom v7 setup**

`src/setupTests.js`: replace the `matchers` import and `expect.extend` with

```js
import '@testing-library/jest-dom/vitest'
```

and keep `configure({ testIdAttribute: 'data-test' })` and the `cleanup` hook.

- [ ] **Step 4: Run the suite and fix what React 18 / RTL 16 / user-event 14 change**

Run: `corepack yarn -s test`
Expected failures to fix, nothing else:
- `userEvent.click/type/clear` now return promises: prefix each call with `await` and make the test callbacks `async` in the four dialog tests (`grep -rn "userEvent\." src`).
- `act()` warnings from RTL 16 on state updates after `await`: wrap with `await waitFor(...)` or use `findBy*` queries; do not add `act` around user-event calls.
- `ReactDOM.render` deprecation is gone with Step 2; if `src/test/test-utils.jsx` renders via `react-dom`, switch it to RTL's `render`.
- MUI 4 under React 18 in StrictMode logs `findDOMNode is deprecated in StrictMode` warnings: the app already uses `unstable_createMuiStrictModeTheme`; if a test still prints the warning, silence exactly that message in `setupTests.js` with a `console.error` filter that rethrows anything else (keep the filter narrow and commented; it is removed in PR 3).

Expected: all 20 files / 224 tests pass, no warnings printed.

- [ ] **Step 5: Lint and build**

Run: `corepack yarn -s lint && corepack yarn -s build`
Expected: lint silent; build prints the gzip size (record it in the report).

- [ ] **Step 6: Commit**

```bash
git add package.json yarn.lock src/index.jsx src/setupTests.js src/components/dialogs/*.test.jsx src/test
git commit  # subject: "Move the app to React 18 and the current Redux and Testing Library"
```

---

### Task 2: Tailwind 4, shadcn config, and the theme tokens

**Files:**
- Modify: `package.json`, `yarn.lock`, `vite.config.js`
- Create: `jsconfig.json`, `components.json`, `src/lib/utils.js`
- Modify: `src/index.css` (rewritten), `src/App.jsx` (remove the `./App.css` import)
- Delete: `src/App.css`

**Interfaces:**
- Produces: `@/` alias to `src/`; `cn` from `@/lib/utils`; CSS tokens `--background --foreground --surface --card --card-foreground --popover --popover-foreground --primary --primary-foreground --secondary --secondary-foreground --muted --muted-foreground --accent --accent-foreground --border --input --ring --destructive --radius`, Tailwind screens `sm/md/lg/xl`, and the utility `text-muted-foreground` etc. that Tasks 3–5 use.

- [ ] **Step 1: Install and wire Tailwind**

```bash
corepack yarn add -D tailwindcss@4.3.3 @tailwindcss/vite@4.3.3
```

`vite.config.js`: add `import tailwindcss from '@tailwindcss/vite'` and `import path from 'node:path'`; set `plugins: [react(), tailwindcss()]` and `resolve: { alias: { '@': path.resolve(__dirname, 'src') } }`. Leave the `server`, `preview`, `build` and `test` blocks as they are.

`jsconfig.json`:

```json
{ "compilerOptions": { "baseUrl": ".", "paths": { "@/*": ["./src/*"] } } }
```

- [ ] **Step 2: Initialise shadcn non-interactively**

```bash
npx -y shadcn@4.21.0 init -y -b radix -p nova --pointer </dev/null
```

It writes `components.json`, `src/lib/utils.js` (`export { cn } from "cn"`), rewrites `src/index.css`, and installs `radix-ui`, `class-variance-authority`, `cn`, `lucide-react`, `tw-animate-css`, `shadcn` and `@fontsource-variable/geist`. Then:

```bash
corepack yarn remove @fontsource-variable/geist
```

Verify `components.json` reads `"style": "radix-nova"`, `"tsx": false`, `"css": "src/index.css"`, `"cssVariables": true`, aliases `@/components`, `@/lib/utils`, `@/components/ui`, `@/lib`, `@/hooks`. If the CLI asks anything, it did not get `-y`; rerun with stdin closed as above.

- [ ] **Step 3: Rewrite `src/index.css` with the app's tokens**

Replace the generated file with exactly this (the `@theme inline` colour and radius mappings are kept from the generated file; only what is listed changes):

```css
@import "tailwindcss";
@import "tw-animate-css";
@import "shadcn/tailwind.css";

@theme {
  --breakpoint-sm: 500px;
  --breakpoint-md: 900px;
  --breakpoint-lg: 1200px;
  --breakpoint-xl: 1536px;
  --font-sans: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
  --font-mono: source-code-pro, Menlo, Monaco, Consolas, 'Courier New', monospace;
}

@theme inline {
  --font-heading: var(--font-sans);
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-surface: var(--surface);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-popover: var(--popover);
  --color-popover-foreground: var(--popover-foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-destructive: var(--destructive);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);
  --radius-sm: calc(var(--radius) * 0.6);
  --radius-md: calc(var(--radius) * 0.8);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) * 1.4);
  --radius-2xl: calc(var(--radius) * 1.8);
  --radius-3xl: calc(var(--radius) * 2.2);
  --radius-4xl: calc(var(--radius) * 2.6);
}

/* Dark only. Values come from the MUI theme in App.jsx, the JSS blocks and docs/ui-baseline. */
:root {
  --background: #1b1b1b;
  --foreground: #EAEAEA;
  --surface: #2d2d2d;
  --card: #424242;
  --card-foreground: #EAEAEA;
  --popover: #424242;
  --popover-foreground: #EAEAEA;
  --primary: #EAEAEA;
  --primary-foreground: #1b1b1b;
  --secondary: #474747;
  --secondary-foreground: #EAEAEA;
  --muted: rgba(255, 255, 255, 0.1);
  --muted-foreground: #AAAAAA;
  --accent: rgba(255, 255, 255, 0.2);
  --accent-foreground: #EAEAEA;
  --destructive: #F44336;
  --border: rgba(255, 255, 255, 0.1);
  --input: #424242;
  --ring: #EAEAEA;
  --radius: 8px;
  color-scheme: dark;
}

@layer base {
  * {
    @apply border-border outline-ring/50;
  }
  html, body, #root, .App {
    height: 100%;
  }
  body {
    margin: 0;
    background-color: var(--background);
    color: var(--foreground);
    font-family: var(--font-sans);
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }
  code {
    font-family: var(--font-mono);
  }
  button:not(:disabled), [role="button"]:not(:disabled) {
    cursor: pointer;
  }
}
```

Remove the generated `.dark { ... }` block, the `--chart-*` and `--sidebar-*` tokens, the `@custom-variant dark` line and the Geist import: the app has one theme. Delete `src/App.css` and the `import './App.css'` line in `src/App.jsx` (its rules are the `height: 100%` and `background-color` lines above; `!important` is no longer needed because MUI's `CssBaseline` sets `background-color` on `body` via a class with the same specificity as ours; if the pixel comparison in Task 7 shows the body colour changed, add `!important` back to that one line).

- [ ] **Step 4: Prove Tailwind is active without changing the app**

Run: `corepack yarn -s build && grep -c 'height:100%' build/assets/*.css`
Expected: the CSS bundle exists and contains the base rule (count ≥ 1). Then `corepack yarn -s test` and `corepack yarn -s lint` pass.

- [ ] **Step 5: Commit**

```bash
git add package.json yarn.lock vite.config.js jsconfig.json components.json src/lib/utils.js src/index.css src/App.jsx
git rm src/App.css
git commit  # subject: "Add Tailwind 4 and shadcn with the app's own theme tokens"
```

---

### Task 3: Generate the shadcn components and make them run under jsdom

**Files:**
- Create: `src/components/ui/{button,dialog,popover,dropdown-menu,input,label,slider,avatar,separator,spinner,tooltip}.jsx` (generated)
- Modify: `src/components/ui/button.jsx` (forwardRef, see Step 2)
- Modify: `src/setupTests.js` (Radix shims)
- Create: `src/components/ui/ui-smoke.test.jsx`

**Interfaces:**
- Produces: `Button` (`variant`: default | outline | secondary | ghost | destructive | link; `size`: default | xs | sm | lg | icon | icon-xs | icon-sm | icon-lg; `asChild`), `Dialog` family (`Dialog`, `DialogTrigger`, `DialogContent` with `showCloseButton`, `DialogHeader`, `DialogTitle`, `DialogDescription`, `DialogFooter`, `DialogClose`), `Popover` family, `DropdownMenu` family, `Input`, `Label`, `Slider`, `Avatar`/`AvatarImage`/`AvatarFallback`, `Separator`, `Spinner`, `Tooltip` family, all exported from their files exactly as generated.

- [ ] **Step 1: Generate**

```bash
npx -y shadcn@4.21.0 add -y button dialog popover dropdown-menu input label slider avatar separator spinner tooltip </dev/null
```

Expected: eleven files under `src/components/ui/`, each importing `cn` from `"cn"` and primitives from `"radix-ui"`. Do not hand-edit them beyond Step 2.

- [ ] **Step 2: Forward refs on Button for React 18**

The generated `Button` is a plain function component (React 19 passes `ref` as a prop; React 18 drops it). Radix's `asChild` pattern (`<PopoverTrigger asChild><Button/></PopoverTrigger>`) needs the ref to reach the DOM node, so wrap it:

```jsx
const Button = React.forwardRef(function Button(
  { className, variant = "default", size = "default", asChild = false, ...props },
  ref
) {
  const Comp = asChild ? Slot.Root : "button"
  return (
    <Comp
      ref={ref}
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
})
```

Add the comment `// forwardRef is only needed on React 18; drop it with the React 19 upgrade in PR 3.` above it. Leave every other generated component untouched (their primitives forward refs internally).

- [ ] **Step 3: Write the failing smoke test**

`src/components/ui/ui-smoke.test.jsx`:

```jsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Button } from '@/components/ui/button'
import { Dialog, DialogTrigger, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover'
import { Slider } from '@/components/ui/slider'

describe('generated shadcn components under jsdom', () => {
    it('renders a button with the variant data attributes', () => {
        render(<Button variant="secondary" size="icon">x</Button>)
        const button = screen.getByRole('button', { name: 'x' })
        expect(button).toHaveAttribute('data-variant', 'secondary')
        expect(button).toHaveAttribute('data-size', 'icon')
    })

    it('opens a dialog from its trigger and closes it with Escape', async () => {
        const user = userEvent.setup()
        render(
            <Dialog>
                <DialogTrigger asChild><Button>open</Button></DialogTrigger>
                <DialogContent showCloseButton={false}><DialogTitle>Hello</DialogTitle></DialogContent>
            </Dialog>
        )
        await user.click(screen.getByRole('button', { name: 'open' }))
        expect(await screen.findByRole('dialog')).toHaveTextContent('Hello')
        await user.keyboard('{Escape}')
        expect(screen.queryByRole('dialog')).toBeNull()
    })

    it('opens a popover anchored to a Button trigger', async () => {
        const user = userEvent.setup()
        render(
            <Popover>
                <PopoverTrigger asChild><Button>menu</Button></PopoverTrigger>
                <PopoverContent>content</PopoverContent>
            </Popover>
        )
        await user.click(screen.getByRole('button', { name: 'menu' }))
        expect(await screen.findByText('content')).toBeInTheDocument()
    })

    it('renders a slider with its value', () => {
        render(<Slider defaultValue={[40]} min={0} max={100} aria-label="volume" />)
        expect(screen.getByRole('slider')).toHaveAttribute('aria-valuenow', '40')
    })
})
```

- [ ] **Step 4: Run it and watch it fail**

Run: `corepack yarn -s vitest run src/components/ui/ui-smoke.test.jsx`
Expected: failures such as `ResizeObserver is not defined`, `hasPointerCapture is not a function`, or `scrollIntoView is not a function` from Radix under jsdom.

- [ ] **Step 5: Add the jsdom shims**

Append to `src/setupTests.js`:

```js
// Radix UI (behind the shadcn components) uses browser APIs jsdom lacks.
if (typeof window !== 'undefined') {
    if (!window.ResizeObserver) {
        window.ResizeObserver = class {
            observe() {}
            unobserve() {}
            disconnect() {}
        }
    }
    if (!Element.prototype.hasPointerCapture) {
        Element.prototype.hasPointerCapture = () => false
        Element.prototype.setPointerCapture = () => {}
        Element.prototype.releasePointerCapture = () => {}
    }
    if (!Element.prototype.scrollIntoView) {
        Element.prototype.scrollIntoView = () => {}
    }
    if (!window.matchMedia) {
        window.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} })
    }
}
```

- [ ] **Step 6: Run the smoke test, then the whole suite**

Run: `corepack yarn -s vitest run src/components/ui/ui-smoke.test.jsx` → 4 passed.
Run: `corepack yarn -s test && corepack yarn -s lint && corepack yarn -s build` → green; if eslint flags the generated files (unused React import, `"use client"` directive), add `src/components/ui/**` to an `overrides` entry in `.eslintrc` (or the `eslintConfig` block of `package.json`) that turns off exactly the rules that fire, listing them.

- [ ] **Step 7: Commit**

```bash
git add src/components/ui src/setupTests.js package.json yarn.lock .eslintrc* 2>/dev/null
git commit  # subject: "Generate the shadcn components and shim Radix for jsdom"
```

---

### Task 4: The twelve Material icons as local components

**Files:**
- Create: `src/components/icons/{Add,ArrowBack,Call,CallEnd,ChevronRight,ExpandMore,Fullscreen,Image,Mic,MicOff,MoreHoriz,Share}.jsx`, `src/components/icons/index.js`
- Create: `src/components/icons/icons.test.jsx`

**Interfaces:**
- Produces: `import { ArrowBackIcon, ShareIcon, ... } from '@/components/icons'`; each is `function XIcon({ className, ...props })` rendering `<svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor" aria-hidden="true" className={cn('inline-block shrink-0', className)} {...props}><path d="..."/></svg>`.

- [ ] **Step 1: Write the failing equivalence test**

`src/components/icons/icons.test.jsx`:

```jsx
import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import * as icons from '@/components/icons'
import MuiAdd from '@material-ui/icons/Add'
import MuiArrowBack from '@material-ui/icons/ArrowBack'
import MuiCall from '@material-ui/icons/Call'
import MuiCallEnd from '@material-ui/icons/CallEnd'
import MuiChevronRight from '@material-ui/icons/ChevronRight'
import MuiExpandMore from '@material-ui/icons/ExpandMore'
import MuiFullscreen from '@material-ui/icons/Fullscreen'
import MuiImage from '@material-ui/icons/Image'
import MuiMic from '@material-ui/icons/Mic'
import MuiMicOff from '@material-ui/icons/MicOff'
import MuiMoreHoriz from '@material-ui/icons/MoreHoriz'
import MuiShare from '@material-ui/icons/Share'

const pairs = [
    ['AddIcon', MuiAdd], ['ArrowBackIcon', MuiArrowBack], ['CallIcon', MuiCall], ['CallEndIcon', MuiCallEnd],
    ['ChevronRightIcon', MuiChevronRight], ['ExpandMoreIcon', MuiExpandMore], ['FullscreenIcon', MuiFullscreen],
    ['ImageIcon', MuiImage], ['MicIcon', MuiMic], ['MicOffIcon', MuiMicOff], ['MoreHorizIcon', MuiMoreHoriz], ['ShareIcon', MuiShare]
]

const pathData = (container) => [...container.querySelectorAll('path')].map(p => p.getAttribute('d')).join('|')

describe('local icons', () => {
    it.each(pairs)('%s draws the same path as the Material icon', (name, MuiIcon) => {
        const ours = render(<icons[name] />)   // see note below
        const theirs = render(<MuiIcon />)
        expect(pathData(ours.container)).toBe(pathData(theirs.container))
        expect(ours.container.querySelector('svg')).toHaveAttribute('viewBox', '0 0 24 24')
    })

    it('passes className and other props through to the svg', () => {
        const { container } = render(<icons.ShareIcon className="size-5" data-test="share-icon" />)
        const svg = container.querySelector('svg')
        expect(svg).toHaveClass('size-5')
        expect(svg).toHaveAttribute('data-test', 'share-icon')
    })
})
```

Note: JSX cannot use `icons[name]` inline; write `const Ours = icons[name]` then `render(<Ours />)`.

- [ ] **Step 2: Run it and watch it fail**

Run: `corepack yarn -s vitest run src/components/icons`
Expected: FAIL, module `@/components/icons` not found.

- [ ] **Step 3: Copy the path data with a one-off script, then write the components**

Extract each glyph's path data from the installed package (do not type it by hand):

```bash
for n in Add ArrowBack Call CallEnd ChevronRight ExpandMore Fullscreen Image Mic MicOff MoreHoriz Share; do
  printf "%s: " "$n"; grep -oE 'd: "[^"]+"' node_modules/@material-ui/icons/$n.js | sed 's/d: //' | tr '\n' ' '; echo
done
```

Each file follows this shape (`ArrowBack.jsx`):

```jsx
import { cn } from '@/lib/utils'

export function ArrowBackIcon({ className, ...props }) {
    return (
        <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor" aria-hidden="true" focusable="false" className={cn('inline-block shrink-0', className)} {...props}>
            <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
        </svg>
    )
}
```

Icons whose source has more than one `path` element get one `<path>` per `d` in the same order. `src/components/icons/index.js` re-exports all twelve.

- [ ] **Step 4: Run the tests**

Run: `corepack yarn -s vitest run src/components/icons` → 13 passed. Then `corepack yarn -s lint`.

- [ ] **Step 5: Commit**

```bash
git add src/components/icons
git commit  # subject: "Copy the twelve Material icons the app uses into local components"
```

---

### Task 5: OutlinedField, the floating-label input wrapper

**Files:**
- Create: `src/components/fields/OutlinedField.jsx`, `src/components/fields/OutlinedField.test.jsx`

**Interfaces:**
- Produces: `<OutlinedField id label value onChange type placeholder autoFocus disabled error helperText className inputProps />` rendering a `<div>` with a `<fieldset>`-like outline, a `<label htmlFor={id}>` that sits on the border like MUI's outlined variant, and the shadcn `Input` inside. `onChange` receives the native event (same as MUI `TextField`).

- [ ] **Step 1: Write the failing test**

`src/components/fields/OutlinedField.test.jsx`:

```jsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { OutlinedField } from '@/components/fields/OutlinedField'

describe('OutlinedField', () => {
    it('labels its input and forwards typing to onChange', async () => {
        const onChange = vi.fn()
        render(<OutlinedField id="link" label="Link" value="" onChange={onChange} />)
        const input = screen.getByLabelText('Link')
        await userEvent.setup().type(input, 'a')
        expect(onChange).toHaveBeenCalled()
        expect(onChange.mock.calls[0][0].target).toBe(input)
    })

    it('shows helper text and marks the field invalid on error', () => {
        render(<OutlinedField id="email" label="Email" value="x" onChange={() => {}} error helperText="Not an email" />)
        expect(screen.getByLabelText('Email')).toHaveAttribute('aria-invalid', 'true')
        expect(screen.getByText('Not an email')).toBeInTheDocument()
    })

    it('spreads inputProps onto the input (data-test hooks)', () => {
        render(<OutlinedField id="name" label="Name" value="" onChange={() => {}} inputProps={{ 'data-test': 'input-name', maxLength: 20 }} />)
        expect(screen.getByTestId('input-name')).toHaveAttribute('maxlength', '20')
    })
})
```

- [ ] **Step 2: Run it and watch it fail**

Run: `corepack yarn -s vitest run src/components/fields` → FAIL, module not found.

- [ ] **Step 3: Implement**

`src/components/fields/OutlinedField.jsx`:

```jsx
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

/**
 * A text field that looks like MUI's outlined TextField: 8px radius, 56px tall, the label
 * sitting on the border in 12px muted text, a white-at-35% outline that turns to the
 * foreground colour on focus. onChange receives the native event.
 */
export function OutlinedField({ id, label, value, onChange, type = 'text', placeholder, autoFocus, disabled, error = false, helperText, className, inputProps = {} }) {
    const helperId = helperText ? `${id}-helper` : undefined
    return (
        <div className={cn('relative w-full', className)}>
            <label htmlFor={id} className={cn('absolute -top-2 left-3 bg-input px-1 text-xs leading-4', error ? 'text-destructive' : 'text-muted-foreground')}>{label}</label>
            <Input
                id={id}
                type={type}
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                autoFocus={autoFocus}
                disabled={disabled}
                aria-invalid={error || undefined}
                aria-describedby={helperId}
                className={cn('h-14 rounded-lg border bg-input px-4 text-base text-foreground shadow-none', error ? 'border-destructive' : 'border-white/35 focus-visible:border-foreground', 'focus-visible:ring-0')}
                {...inputProps}
            />
            {helperText && <p id={helperId} className={cn('mt-1 px-3 text-xs', error ? 'text-destructive' : 'text-muted-foreground')}>{helperText}</p>}
        </div>
    )
}
```

- [ ] **Step 4: Run the tests**

Run: `corepack yarn -s vitest run src/components/fields` → 3 passed; then `corepack yarn -s lint`.

- [ ] **Step 5: Commit**

```bash
git add src/components/fields
git commit  # subject: "Add OutlinedField, the floating-label input for the migrated dialogs"
```

---

### Task 6: Pixel-comparison tooling and a deterministic baseline

**Files:**
- Modify: `docs/ui-baseline/capture.py`
- Create: `docs/ui-baseline/compare.py`, `docs/ui-baseline/README.md`
- Modify: `docs/ui-baseline/*.png` (re-captured)

**Interfaces:**
- Produces: `python3 docs/ui-baseline/capture.py --base https://rounds.studio --out docs/ui-baseline` (default) and `--out <dir>` for candidates; `python3 docs/ui-baseline/compare.py <candidate-dir>` printing one line per screen `name changed=0.12%` and writing `<candidate-dir>/diff-<name>.png`, exit code 1 when any screen exceeds `--threshold` (default 0.5).

- [ ] **Step 1: Make the capture deterministic**

In `capture.py`: add `argparse` with `--base` (default `https://rounds.studio`), `--out` (default the script's directory) and `--port` (default 9336). Right after the guest sign-in succeeds and the round is visible, pick the first colour swatch so every run uses `#F44336`:

```python
js("document.querySelector('[data-test=button-sign-in-out]').click()"); wait("!!document.querySelector('[data-test=button-sign-out]')")
js("""(() => { const s = [...document.querySelectorAll('[title], span[style*="background"]')].find(e => /f44336|244, 67, 54/i.test((e.getAttribute('title')||'') + (e.getAttribute('style')||''))); s && s.click() })()""")
js("document.body.click()"); time.sleep(1.5)
```

(inspect the colour picker's DOM once in a browser to confirm the selector; the swatch is react-color's `CirclePicker`, whose swatches carry the hex in `title`). Keep the thirteen screen names unchanged. Use `--base` in the `Page.navigate` call.

- [ ] **Step 2: Write `compare.py`**

```python
#!/usr/bin/env python3
"""Compare a candidate capture against docs/ui-baseline. Usage: compare.py CANDIDATE_DIR [--threshold 0.5]"""
import argparse, os, sys
from PIL import Image, ImageChops

HERE = os.path.dirname(os.path.abspath(__file__))
ap = argparse.ArgumentParser(); ap.add_argument('candidate'); ap.add_argument('--threshold', type=float, default=0.5); ap.add_argument('--tolerance', type=int, default=24)
a = ap.parse_args()
names = sorted(n for n in os.listdir(HERE) if n.endswith('.png') and not n.startswith('diff-'))
worst = 0.0
for n in names:
    cand = os.path.join(a.candidate, n)
    if not os.path.exists(cand):
        print(f'{n} MISSING'); worst = 100; continue
    base = Image.open(os.path.join(HERE, n)).convert('RGB'); img = Image.open(cand).convert('RGB')
    if base.size != img.size:
        print(f'{n} SIZE {base.size} vs {img.size}'); worst = 100; continue
    diff = ImageChops.difference(base, img).convert('L').point(lambda v: 255 if v > a.tolerance else 0)
    changed = sum(1 for v in diff.getdata() if v) / (diff.width * diff.height) * 100
    worst = max(worst, changed)
    diff.save(os.path.join(a.candidate, f'diff-{n}'))
    print(f'{n} changed={changed:.2f}%')
sys.exit(1 if worst > a.threshold else 0)
```

- [ ] **Step 3: Re-capture the baseline from production with the deterministic colour**

Run: `python3 docs/ui-baseline/capture.py --base https://rounds.studio --out docs/ui-baseline`
Then run it a second time into a scratch dir and compare the two runs: `python3 docs/ui-baseline/capture.py --out /tmp/run2 && python3 docs/ui-baseline/compare.py /tmp/run2`.
Expected: every screen under 0.5% (the two runs differ only by anti-aliasing). If a screen is above, the state is not deterministic (an animation still running, a random colour): fix the capture (longer wait, forced colour) and re-capture.

- [ ] **Step 4: README**

`docs/ui-baseline/README.md`: what the baseline is (13 screens, 1300×900 and one 390×844, guest colour forced to the first swatch), the two commands above, the 0.5% rule, and that a PR that changes a screen on purpose must re-capture the baseline in the same PR.

- [ ] **Step 5: Commit**

```bash
git add docs/ui-baseline
git commit  # subject: "Make the UI baseline deterministic and add the pixel comparison"
```

---

### Task 7: Verify PR 1 changes nothing visible

**Files:**
- No source changes expected; if Tailwind's preflight shifted something, fix it in `src/index.css` only.

- [ ] **Step 1: Build and serve the branch**

```bash
corepack yarn -s build && (npx -y serve@14 -s build -l 3100 >/dev/null 2>&1 &)
```

- [ ] **Step 2: Capture and compare**

```bash
python3 docs/ui-baseline/capture.py --base http://localhost:3100 --out /tmp/pr1-capture
python3 docs/ui-baseline/compare.py /tmp/pr1-capture
```

Expected: every screen under 0.5%. For any screen above: open `diff-<name>.png` and the two PNGs side by side, identify the rule (typical culprits: preflight's `svg { display: block }`, `button { background: transparent }`, `h1-h6 { font-size: inherit }`, `img { max-width: 100% }`), and add a targeted rule under `@layer base` in `src/index.css` scoped to the affected element, never a blanket un-reset. Re-run until green. Record the per-screen numbers in the report.

- [ ] **Step 3: Stop the server, run the full gate, commit any CSS fix**

```bash
pkill -f 'serve -s build -l 3100'
corepack yarn -s lint && corepack yarn -s test && corepack yarn -s build
git add src/index.css && git commit  # only if a fix was needed; subject: "Keep MUI screens pixel-identical under Tailwind's preflight"
```
