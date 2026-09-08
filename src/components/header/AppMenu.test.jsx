import { describe, it, expect, vi } from 'vitest'
import React from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AppMenu, AppMenuItem } from './AppMenu'
import { Button } from '@/components/ui/button'

function Harness({ onPick = vi.fn(), footer }) {
    const [open, setOpen] = React.useState(false)
    return (
        <AppMenu open={open} onOpenChange={setOpen} listId="menu-list-grow" label="Round options" footer={footer} trigger={<Button aria-label="More options" aria-haspopup="menu">…</Button>}>
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

    it('names the popover and lets the trigger say it opens a menu', async () => {
        render(<Harness />)
        const trigger = screen.getByRole('button', { name: 'More options' })
        // Radix's PopoverTrigger writes aria-haspopup="dialog"; the caller's own value has to win,
        // because what opens is a menu.
        expect(trigger).toHaveAttribute('aria-haspopup', 'menu')
        trigger.click()
        expect(await screen.findByRole('dialog', { name: 'Round options' })).toBeInTheDocument()
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

    it('puts a footer below the list rather than inside it', async () => {
        render(<Harness footer={<div data-test="tempo">Tempo</div>} />)
        screen.getByRole('button', { name: 'More options' }).click()
        const list = await screen.findByRole('menu')
        const footer = screen.getByTestId('tempo')
        // The list's own bottom padding has to stay between the last item and the footer, which
        // only happens if the footer is in the popover but outside the list.
        expect(screen.getByRole('dialog', { name: 'Round options' }).contains(footer)).toBe(true)
        expect(list.contains(footer)).toBe(false)
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
