import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

// The stylesheet is not applied under Vitest (css: false, and a `?raw` import comes back as an
// object), so this reads the rules as text. It guards one promise: nothing in the app is
// selectable text, except what the user types in.
const css = readFileSync(resolve(__dirname, 'index.css'), 'utf8')

const rule = (selector) => {
    const m = css.match(new RegExp(`\\n\\s*${selector.replace(/[[\]()*+?.,\\^$|#]/g, '\\$&')}\\s*\\{([^}]*)\\}`))
    return m ? m[1] : null
}

describe('index.css', () => {
    it('turns text selection off for the whole app at the root', () => {
        expect(rule('html')).toMatch(/user-select:\s*none/)
        expect(rule('html')).toMatch(/-webkit-user-select:\s*none/)
    })

    it('keeps what the user types selectable: inputs, text areas and editable regions', () => {
        const fields = rule('input, textarea, [contenteditable="true"]')
        expect(fields).toMatch(/user-select:\s*text/)
        expect(fields).toMatch(/-webkit-user-select:\s*text/)
    })
})
