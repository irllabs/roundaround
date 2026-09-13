import kick from '../../assets/instrument-icons/kick.svg?raw'
import snare from '../../assets/instrument-icons/snare.svg?raw'
import hiHat from '../../assets/instrument-icons/hi-hat.svg?raw'
import percussion from '../../assets/instrument-icons/percussion.svg?raw'

/**
 * The instrument icons, from the Rounds-SoT file's "Icons & Illustrations" library (components
 * kick, snare, hi-hat, percussion), 16x16, committed as exported. Keyed by the sampler's key on
 * a layer, which is how a round names its instrument.
 */
const FILES = { Kicks: kick, Snares: snare, HiHats: hiHat, Perc: percussion }

/** The side of the box the icons are drawn in. */
export const ICON_BOX = 16

/**
 * The paths of an instrument's icon, or null when there is none: each with its `d` and whether it
 * is filled even-odd. The colour is left to whoever draws it, so an icon can take its round's.
 */
export function instrumentIcon(sampler) {
    const svg = FILES[sampler]
    if (!svg) return null
    const paths = [...svg.matchAll(/<path\b([^>]*)\/>/g)].map(([, attrs]) => ({
        d: attrs.match(/\bd="([^"]*)"/)[1],
        evenOdd: /fill-rule="evenodd"/.test(attrs),
    }))
    return paths.length > 0 ? paths : null
}
