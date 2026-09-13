import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import * as icons from '@/components/icons'
import { MATERIAL_PATHS } from './material-paths'

// This suite compares raw SVG <path> data between our icons and Material UI's, which
// only raw DOM access (not role/text queries) can observe, so the usual
// testing-library lint rules against container/node access don't apply here.
/* eslint-disable testing-library/no-node-access, testing-library/no-container */

describe('local icons', () => {
    it.each(Object.keys(MATERIAL_PATHS))('%s draws the Material icon\'s path data', (name) => {
        const Ours = icons[name]
        const { container } = render(<Ours />)
        expect([...container.querySelectorAll('path')].map(p => p.getAttribute('d'))).toEqual(MATERIAL_PATHS[name])
        expect(container.querySelector('svg')).toHaveAttribute('viewBox', '0 0 24 24')
    })

    it('passes className and other props through to the svg', () => {
        const { container } = render(<icons.ShareIcon className="size-5" data-test="share-icon" />)
        const svg = container.querySelector('svg')
        expect(svg).toHaveClass('size-5')
        expect(svg).toHaveAttribute('data-test', 'share-icon')
    })
})
