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

    it('shows a plain red outline on error, not a red glow', () => {
        render(<OutlinedField id="email" label="Email" value="x" onChange={() => {}} error />)
        expect(screen.getByLabelText('Email')).toHaveClass('aria-invalid:ring-0', 'border-destructive')
    })

    it('lets its own id and classes win over inputProps overrides', () => {
        render(<OutlinedField id="name" label="Name" value="" onChange={() => {}} inputProps={{ id: 'wrong', className: 'extra' }} />)
        const input = screen.getByLabelText('Name')
        expect(input).toHaveAttribute('id', 'name')
        expect(input).toHaveClass('extra', 'h-14')
    })
})
