import { describe, it, expect, vi } from 'vitest'
import React from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ColorGrid, SWATCH_CLASS } from './ColorGrid'
import { Colors } from '../../utils/constants'

// These assertions are about the DOM hooks themselves -- the `circle-picker` class and the
// `title` attributes that docs/ui-baseline/capture.py selects the guest colour through. No
// role or text query can observe them, so the testing-library rules against container and
// node access do not apply here, exactly as in icons.test.jsx.
/* eslint-disable testing-library/no-node-access, testing-library/no-container */

describe('ColorGrid', () => {
    it('draws one swatch per user colour, keeping the hooks capture.py selects on', () => {
        const { container } = render(<ColorGrid onChange={() => {}} />)
        expect(container.querySelector('.circle-picker')).not.toBeNull()
        expect(screen.getAllByRole('button')).toHaveLength(Colors.length)
        for (const hex of Colors) {
            expect(container.querySelector(`.circle-picker [title="${hex}"]`)).not.toBeNull()
        }
    })

    it('has a static Tailwind class for every colour, so none of them fall out of the build', () => {
        for (const hex of Colors) {
            expect(SWATCH_CLASS[hex]).toBe(`bg-[${hex}]`)
        }
    })

    it('reports the colour that was clicked in the shape react-color used', async () => {
        const onChange = vi.fn()
        const { container } = render(<ColorGrid onChange={onChange} />)
        await userEvent.setup().click(container.querySelector('[title="#f44336"]'))
        expect(onChange).toHaveBeenCalledWith({ hex: '#f44336' })
    })
})
