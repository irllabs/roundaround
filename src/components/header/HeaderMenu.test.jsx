import { vi, describe, it, expect, afterEach } from 'vitest'
import React from 'react'
import { act, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import HeaderMenu from './HeaderMenu'
import { renderWithProviders, makeStore } from '../../test/test-utils'
import { setRound } from '../../redux/actions'

// The menu holds the tempo slider, which reaches Tone.js through the audio engine. Nothing here
// makes a sound, and loading Tone only buys a banner on stdout.
vi.mock('tone', () => ({}))
vi.mock('../../audio-engine/AudioEngine', () => ({ default: { setTempo: vi.fn() } }))

function renderMenu() {
    const store = makeStore()
    store.dispatch(setRound({ id: 'r1', name: 'Jam', bpm: 120, layers: [] }))
    return renderWithProviders(<HeaderMenu />, { store, firebase: { updateRound: vi.fn() }, route: '/play/r1' })
}

afterEach(() => {
    delete document.documentElement.requestFullscreen
})

describe('HeaderMenu', () => {
    it('opens from a programmatic click, the way capture.py opens it', async () => {
        renderMenu()

        await act(async () => { screen.getByRole('button', { name: 'More options' }).click() })

        expect(await screen.findByRole('menu')).toHaveAttribute('id', 'header-menu-list')
        expect(screen.getByRole('menuitem', { name: 'Fullscreen' })).toBeInTheDocument()
    })

    it('keeps the tempo slider out of the menu list, where MUI had it', async () => {
        renderMenu()

        await act(async () => { screen.getByRole('button', { name: 'More options' }).click() })
        const list = await screen.findByRole('menu')

        // The list's 8px bottom padding is the gap between the divider and the tempo row.
        expect(list.contains(screen.getByRole('slider'))).toBe(false)
        expect(screen.getByText('Tempo')).toBeInTheDocument()
    })

    // Radix's FocusScope walks to the first tabbable control inside a popover on open, and the
    // tempo thumb is the only tabbable thing in this menu -- so it opened with focus on the
    // slider, past every menu item and on a control that eats the arrow keys before the menu's
    // roving handler sees them. It also lit the thumb's focus halo on 09-header-menu.png.
    it('opens with focus on the paper, not on the tempo slider', async () => {
        const user = userEvent.setup()
        renderMenu()

        await user.click(screen.getByRole('button', { name: 'More options' }))
        const paper = await screen.findByRole('dialog', { name: 'Round options' })

        expect(paper).toHaveFocus()
        expect(screen.getByRole('slider')).not.toHaveFocus()

        // and the arrow keys still reach the menu items rather than the slider
        await user.keyboard('{ArrowDown}')
        expect(screen.getByRole('menuitem', { name: 'Fullscreen' })).toHaveFocus()
    })

    it('closes on Escape and gives focus back to its trigger', async () => {
        const user = userEvent.setup()
        renderMenu()
        const trigger = screen.getByRole('button', { name: 'More options' })
        await user.click(trigger)
        await screen.findByRole('menu')

        await user.keyboard('{Escape}')

        expect(screen.queryByRole('menu')).toBeNull()
        expect(trigger).toHaveFocus()
    })

    it('asks the document to go fullscreen', async () => {
        const user = userEvent.setup()
        const requestFullscreen = vi.fn()
        document.documentElement.requestFullscreen = requestFullscreen
        renderMenu()
        await user.click(screen.getByRole('button', { name: 'More options' }))

        await user.click(await screen.findByRole('menuitem', { name: 'Fullscreen' }))

        expect(requestFullscreen).toHaveBeenCalled()
    })
})
