/**
 * The shared clock. The round document carries `playback: { playing, startedAt, bpm, by }`, with
 * `startedAt` a Firestore server timestamp. Every client estimates its offset to the server's
 * clock, and from that and `startedAt` works out where bar 0 sits on its own AudioContext clock.
 * Two clients that do this land on the same bar and the same step, a few tens of milliseconds
 * apart at most: the error of the offset estimate.
 *
 * Pure maths here; the Firestore round trips are injected.
 */

/**
 * The context time of bar 0 for a transport that started at `startedAtServerMs` on the server's
 * clock, given this client's `serverOffsetMs` (server clock minus local Date.now()).
 *
 * @returns {number} the origin in context seconds; in the past when the transport already runs
 */
export function alignedOrigin ({ startedAtServerMs, serverOffsetMs = 0, contextNow, wallNowMs = Date.now() }) {
    const serverNowMs = wallNowMs + serverOffsetMs
    const elapsedSeconds = (serverNowMs - startedAtServerMs) / 1000
    return contextNow - elapsedSeconds
}

/** One round trip, as `{ t0, t1, serverMs }`: sent at t0, acknowledged at t1, stamped serverMs by the server. */
export function offsetFromSample ({ t0, t1, serverMs }) {
    return serverMs - (t0 + t1) / 2
}

/** The median offset of several samples, the usual guard against one slow round trip. */
export function offsetFromSamples (samples) {
    const offsets = samples.filter(s => s && Number.isFinite(s.serverMs)).map(offsetFromSample).sort((a, b) => a - b)
    if (offsets.length === 0) return 0
    const mid = Math.floor(offsets.length / 2)
    return offsets.length % 2 === 1 ? offsets[mid] : (offsets[mid - 1] + offsets[mid]) / 2
}

/**
 * Estimates the server clock offset from `rounds` round trips of `sample()`, which must write a
 * server timestamp, read it back and resolve `{ t0, t1, serverMs }`. A failed trip is skipped;
 * with none left the offset is 0 (the local clock is trusted).
 */
export async function estimateServerOffset ({ sample, rounds = 3 }) {
    const samples = []
    for (let i = 0; i < rounds; i++) {
        try {
            const s = await sample()
            if (s && Number.isFinite(s.serverMs)) {
                samples.push(s)
            } else {
                console.warn('Clock sample came back without a server time', s)
            }
        } catch (error) {
            console.warn('Clock sample failed', error)
        }
    }
    return { offsetMs: offsetFromSamples(samples), samples }
}
