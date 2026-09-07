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
