import { vi, describe, it, expect } from 'vitest'
import React from 'react'
import { fireEvent, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import EffectsSidebar from './EffectsSidebar'
import { renderWithProviders, makeStore } from '../../test/test-utils'
import { setRound, setUser } from '../../redux/actions'

vi.mock('tone', () => ({}))
vi.mock('../../audio-engine/AudioEngine', () => ({ default: { busesByUser: {} } }))
// The switch itself is an SVG.js drawing with no DOM to assert on; it has its own coverage
// through the 19-effects-on baseline screen.
vi.mock('./EffectThumbControl', () => ({ default: ({ name }) => <div data-test={`fx-${name}`} /> }))

// Not `setup`: eslint-plugin-testing-library resolves the `setup` in `userEvent.setup()` to
// whatever `setup` this scope binds, and a local one that returns a render makes every
// `const user = userEvent.setup()` below read as an undestructured render result.
function mountSidebar() {
    const store = makeStore()
    store.dispatch(setUser({ id: 'me', color: '#f44336' }))
    store.dispatch(setRound({ id: 'r1', currentUsers: ['me'], layers: [], userBuses: { me: { id: 'me', fx: [{ id: 'reverb', name: 'reverb', isOn: true, isOverride: false }] } } }))
    return renderWithProviders(<EffectsSidebar />, { store, firebase: { updateUserBus: vi.fn() } })
}

describe('EffectsSidebar', () => {
    it('lists the user\'s effects', () => {
        mountSidebar()
        expect(screen.getByTestId('fx-reverb')).toBeInTheDocument()
    })

    it('slides itself off the edge and back from its chevron', async () => {
        const user = userEvent.setup()
        const { container } = mountSidebar()
        // The assertion is the sidebar root's own class, which is how it slides: no role or
        // text query can observe it, so the rule against node access does not apply here.
        // eslint-disable-next-line testing-library/no-node-access
        const root = container.firstChild
        expect(root).toHaveClass('right-0')
        await user.click(screen.getByRole('button', { name: 'Hide the effects' }))
        expect(root).toHaveClass('-right-[120px]')
        await user.click(screen.getByRole('button', { name: 'Show the effects' }))
        expect(root).toHaveClass('right-0')
    })

    it('minimizes on Space without letting the key reach PlayUI', () => {
        // PlayUI toggles playback from a keydown listener on `window` (KEY_MAPPINGS.playToggle is
        // ' '), and React delegates from the root container, which is below window. Without the
        // stopPropagation in onMinimizeKeyDown, minimizing the sidebar from the keyboard would
        // start the sequencer as well. Only a spy on window can see that; no screenshot can.
        const atWindow = vi.fn()
        window.addEventListener('keydown', atWindow)
        try {
            const { container } = mountSidebar()
            // eslint-disable-next-line testing-library/no-node-access
            const root = container.firstChild
            fireEvent.keyDown(screen.getByRole('button', { name: 'Hide the effects' }), { key: ' ' })

            expect(root).toHaveClass('-right-[120px]')
            expect(screen.getByRole('button', { name: 'Show the effects' })).toBeInTheDocument()
            expect(atWindow).not.toHaveBeenCalled()
        } finally {
            window.removeEventListener('keydown', atWindow)
        }
    })
})
