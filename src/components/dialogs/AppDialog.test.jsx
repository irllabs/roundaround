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

    // MUI's TrapFocus parks focus on the paper and lets a child's autoFocus win; Radix's
    // FocusScope walks to the first tabbable control, which lit up the share dialog's read-only
    // link field with the focused outline on 10-share-dialog.png.
    it('parks focus on the paper rather than on the first control inside it', async () => {
        const user = userEvent.setup()
        render(<Harness />)
        await user.click(screen.getByRole('button', { name: 'open' }))
        const dialog = await screen.findByRole('dialog')
        expect(dialog).toHaveFocus()
        expect(screen.getByRole('button', { name: 'inside' })).not.toHaveFocus()
    })

    it('traps Tab inside the dialog', async () => {
        const user = userEvent.setup()
        render(<Harness />)
        // Take hold of the trigger before opening: Radix aria-hides everything outside the
        // dialog, so getByRole cannot see it again until the dialog closes.
        const trigger = screen.getByRole('button', { name: 'open' })
        await user.click(trigger)
        await screen.findByRole('dialog')
        await user.tab()
        await user.tab()
        expect(trigger).not.toHaveFocus()
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

    // src/index.css targets these two generated data-slot names with unlayered rules -- the flat
    // 50% backdrop and the inherited title font. A `shadcn add dialog` that renamed either would
    // silently drop both rules, so the names are asserted here rather than left to the pixel gate.
    it('keeps the data-slot names the unlayered index.css rules hang off', async () => {
        const user = userEvent.setup()
        render(<Harness />)
        await user.click(screen.getByRole('button', { name: 'open' }))
        await screen.findByRole('dialog')
        // the overlay carries no role or text of its own; the attribute is the whole point
        // eslint-disable-next-line testing-library/no-node-access
        expect(document.querySelectorAll('[data-slot="dialog-overlay"]')).toHaveLength(1)
        expect(screen.getByText('Sign in')).toHaveAttribute('data-slot', 'dialog-title')
    })

    // MUI's paper is shrink-to-fit up to 500px; the sign-in choice step measures 472px wide.
    // The generated DialogContent's `sm:max-w-sm` is 384px and survives an unprefixed max-w in
    // the class merge, so the sm: override has to be there and sm:max-w-sm has to be gone.
    it('is shrink-to-fit up to 500px rather than the generated 24rem', async () => {
        const user = userEvent.setup()
        render(<Harness />)
        await user.click(screen.getByRole('button', { name: 'open' }))
        const dialog = await screen.findByRole('dialog')
        expect(dialog).toHaveClass('w-fit', 'max-w-[min(500px,calc(100%-64px))]', 'sm:max-w-[min(500px,calc(100%-64px))]')
        expect(dialog).not.toHaveClass('sm:max-w-sm', 'w-full', 'max-w-[calc(100%-2rem)]')
    })

    // MUI centres the paper with flexbox and Chrome pixel-snaps the fractional position it lands
    // on; the generated -50% translate is applied after layout, so the layer rasterises off the
    // grid and every edge and glyph softens. Centring has to stay in the layout.
    it('is centred by layout, not by a translate', async () => {
        const user = userEvent.setup()
        render(<Harness />)
        await user.click(screen.getByRole('button', { name: 'open' }))
        const dialog = await screen.findByRole('dialog')
        expect(dialog).toHaveClass('inset-0', 'm-auto', 'h-fit', 'translate-x-0', 'translate-y-0')
        expect(dialog).not.toHaveClass('top-1/2', 'left-1/2', '-translate-x-1/2', '-translate-y-1/2')
    })
})
