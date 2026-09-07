import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import * as icons from '@/components/icons'
import MuiAdd from '@material-ui/icons/Add'
import MuiArrowBack from '@material-ui/icons/ArrowBack'
import MuiCall from '@material-ui/icons/Call'
import MuiCallEnd from '@material-ui/icons/CallEnd'
import MuiChevronRight from '@material-ui/icons/ChevronRight'
import MuiExpandMore from '@material-ui/icons/ExpandMore'
import MuiFullscreen from '@material-ui/icons/Fullscreen'
import MuiImage from '@material-ui/icons/Image'
import MuiMic from '@material-ui/icons/Mic'
import MuiMicOff from '@material-ui/icons/MicOff'
import MuiMoreHoriz from '@material-ui/icons/MoreHoriz'
import MuiShare from '@material-ui/icons/Share'

// This suite compares raw SVG <path> data between our icons and Material UI's, which
// only raw DOM access (not role/text queries) can observe, so the usual
// testing-library lint rules against container/node access don't apply here.
/* eslint-disable testing-library/no-node-access, testing-library/no-container, testing-library/render-result-naming-convention */

const pairs = [
    ['AddIcon', MuiAdd], ['ArrowBackIcon', MuiArrowBack], ['CallIcon', MuiCall], ['CallEndIcon', MuiCallEnd],
    ['ChevronRightIcon', MuiChevronRight], ['ExpandMoreIcon', MuiExpandMore], ['FullscreenIcon', MuiFullscreen],
    ['ImageIcon', MuiImage], ['MicIcon', MuiMic], ['MicOffIcon', MuiMicOff], ['MoreHorizIcon', MuiMoreHoriz], ['ShareIcon', MuiShare]
]

const pathData = (container) => [...container.querySelectorAll('path')].map(p => p.getAttribute('d')).join('|')

describe('local icons', () => {
    it.each(pairs)('%s draws the same path as the Material icon', (name, MuiIcon) => {
        const Ours = icons[name]
        const ours = render(<Ours />)
        const theirs = render(<MuiIcon />)
        expect(pathData(ours.container)).toBe(pathData(theirs.container))
        expect(ours.container.querySelector('svg')).toHaveAttribute('viewBox', '0 0 24 24')
    })

    it('passes className and other props through to the svg', () => {
        const { container } = render(<icons.ShareIcon className="size-5" data-test="share-icon" />)
        const svg = container.querySelector('svg')
        expect(svg).toHaveClass('size-5')
        expect(svg).toHaveAttribute('data-test', 'share-icon')
    })
})
