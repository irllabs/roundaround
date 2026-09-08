import { describe, it, expect, vi } from 'vitest'
import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
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

    it('shows a plain red outline on error, not a red glow', () => {
        render(<OutlinedField id="email" label="Email" value="x" onChange={() => {}} error />)
        expect(screen.getByLabelText('Email')).toHaveClass('aria-invalid:ring-0', 'border-destructive')
    })

    it('keeps MUI\'s 16px text at desktop widths', () => {
        // the generated Input drops to 14px from the md breakpoint up; MUI's InputBase never does
        render(<OutlinedField id="link" label="Link" value="" onChange={() => {}} />)
        const input = screen.getByLabelText('Link')
        expect(input).toHaveClass('text-base', 'md:text-base')
        expect(input).not.toHaveClass('md:text-sm')
    })

    it('keeps a focused field that is wrong red, rather than letting it light up', () => {
        render(<OutlinedField id="email" label="Email" value="x" onChange={() => {}} error />)
        const input = screen.getByLabelText('Email')
        expect(input).toHaveClass('focus-visible:border-destructive')
        expect(input).not.toHaveClass('focus-visible:border-ring')
    })

    it('lets its own id and classes win over inputProps overrides', () => {
        render(<OutlinedField id="name" label="Name" value="" onChange={() => {}} inputProps={{ id: 'wrong', className: 'extra' }} />)
        const input = screen.getByLabelText('Name')
        expect(input).toHaveAttribute('id', 'name')
        expect(input).toHaveClass('extra', 'h-14')
    })

    it('keeps the label inside the box until the field is filled or focused', async () => {
        const user = userEvent.setup()
        render(<OutlinedField id="email" label="Email address" />)
        const label = screen.getByText('Email address')
        expect(label).toHaveClass('translate-y-5', 'scale-100')
        await user.click(screen.getByLabelText('Email address'))
        expect(label).toHaveClass('-translate-y-1.5', 'scale-75')
    })

    it('floats the label straight away for a field that already has a value', () => {
        render(<OutlinedField id="link" label="Link" value="https://rounds.studio/play/x" onChange={() => {}} />)
        expect(screen.getByText('Link')).toHaveClass('-translate-y-1.5', 'scale-75')
    })

    it('floats the label when something types into an uncontrolled field from outside React', () => {
        // capture.py fills the guest name with the native value setter plus an input event.
        render(<OutlinedField id="name" label="Name" inputProps={{ 'data-test': 'input-name' }} />)
        const input = screen.getByTestId('input-name')
        Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(input, 'shots')
        fireEvent.input(input, { target: { value: 'shots' } })
        expect(screen.getByText('Name')).toHaveClass('-translate-y-1.5', 'scale-75')
    })

    it('hands its wrapper to a ref so callers can read the input out of the DOM', () => {
        const ref = React.createRef()
        render(<OutlinedField ref={ref} id="email" label="Email address" />)
        // reading the input off the wrapper ref is the behaviour under test: it is what the
        // callers of MUI's TextField do today
        // eslint-disable-next-line testing-library/no-node-access
        expect(ref.current.querySelectorAll('input')[0]).toBe(screen.getByLabelText('Email address'))
    })

    it('draws MUI\'s outline, not a lighter one, and insets the text by MUI\'s 14px', () => {
        render(<OutlinedField id="link" label="Link" />)
        // 13px + the 1px border this component draws itself = MUI's 14px, where the outline is
        // an overlaid <legend> and the padding is the whole inset
        expect(screen.getByLabelText('Link')).toHaveClass('border-white/23', 'px-[13px]')
    })

    it('puts the floated label on MUI\'s 14px, patch included', () => {
        render(<OutlinedField id="link" label="Link" value="x" onChange={() => {}} />)
        // translate 9px + the patch's 6.67px at scale 0.75 = 14px of text inset
        expect(screen.getByText('Link')).toHaveClass('translate-x-[9px]', 'px-[6.67px]', 'scale-75')
    })
})
