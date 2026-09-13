/**
 * Which playback engine the page runs, decided once at load: `?engine=v2` in the URL (or `v1`
 * to force the old one), else the VITE_PLAYBACK_ENGINE build variable, else v1. The choice
 * lives on the page, so a round opened with the switch keeps it through in-app navigation and
 * loses it on the next full load, which is what a switch for trying things out should do.
 */
export function selectedEngine ({ search, env } = {}) {
    const query = search !== undefined ? search : (typeof window !== 'undefined' ? window.location.search : '')
    const param = new URLSearchParams(query).get('engine')
    if (param === 'v2' || param === 'v1') {
        return param
    }
    const fromEnv = env !== undefined ? env : (import.meta.env ? import.meta.env.VITE_PLAYBACK_ENGINE : undefined)
    return fromEnv === 'v2' ? 'v2' : 'v1'
}
