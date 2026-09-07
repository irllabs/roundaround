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
