/**
 * The look-ahead scheduler. A timer ticks every `interval` seconds; on each tick the scheduler
 * takes the hits of the latest snapshot that fall in the window [cursor, now + lookAhead), hands
 * each one out exactly once through `onStep`, and moves the cursor to the end of the window.
 * Hits are timed from a transport origin in AudioContext seconds, so they are sample-accurate
 * however late the tick itself runs, and a tick that runs late (a hidden tab, a long task) skips
 * what it missed instead of bursting it: the window never starts in the past.
 *
 * Bar starts are handed out through `onBar` before the hits of that bar, and a window that
 * straddles a bar line is scheduled in two halves, so a snapshot swapped by an `onBar` handler
 * (a sequence moving to its next pattern) takes effect exactly on the bar line.
 *
 * The timer lives in a Worker, where browsers do not throttle it, with setInterval as the
 * fallback; both are behind an injectable `timer` so the tests can drive ticks by hand.
 */
import { hitsBetween } from './arrangement'

/** A timer in a Worker: `onTick` every `intervalMs`, unthrottled; returns a function that stops it. */
export function workerTimer (intervalMs, onTick) {
    try {
        const source = `let t = null; onmessage = (e) => { if (e.data === 'start') { t = setInterval(() => postMessage(0), ${Math.max(1, Math.round(intervalMs))}) } else { clearInterval(t) } }`
        const worker = new Worker(URL.createObjectURL(new Blob([source], { type: 'application/javascript' })))
        worker.onmessage = () => onTick()
        worker.postMessage('start')
        return () => {
            worker.postMessage('stop')
            worker.terminate()
        }
    } catch (e) {
        const id = setInterval(onTick, intervalMs)
        return () => clearInterval(id)
    }
}

/**
 * @param {object} o
 * @param {{ currentTime: number }} o.context the AudioContext (or anything with a currentTime in seconds)
 * @param {number} [o.lookAhead] how far ahead of now hits are scheduled, seconds
 * @param {number} [o.interval] how often the timer ticks, seconds
 * @param {(intervalMs: number, onTick: () => void) => () => void} [o.timer] the timer; the Worker one by default
 * @param {() => number} [o.random] for step probability
 */
export function createScheduler ({ context, lookAhead = 0.15, interval = 0.025, timer = workerTimer, random = Math.random } = {}) {
    let snapshot = { bpm: 120, swing: 0, barSeconds: 2, layers: [] }
    let origin = 0
    let cursor = 0
    let running = false
    let stopTimer = null
    let lastBarHandedOut = -Infinity
    const stepListeners = new Set()
    const barListeners = new Set()

    const emitBar = (bar, time) => {
        if (bar <= lastBarHandedOut) return
        lastBarHandedOut = bar
        for (const fn of barListeners) fn({ bar, time })
    }

    const emitHits = (from, to) => {
        for (const hit of hitsBetween(snapshot, from, to, origin)) {
            const plays = hit.on && (hit.probability >= 1 || random() < hit.probability)
            for (const fn of stepListeners) fn({ ...hit, plays })
        }
    }

    /** Schedules everything in [from, to), split at the bar lines so onBar handlers land exactly on them. */
    const schedule = (from, to) => {
        if (!(to > from)) return
        const bar = snapshot.barSeconds
        let at = from
        let nextBar = Math.floor((from - origin) / bar) + 1
        let nextBarStart = origin + nextBar * bar
        // a bar line at exactly `from` belongs to this window
        if (Math.abs(nextBarStart - bar - from) < 1e-9) {
            emitBar(nextBar - 1, from)
        }
        while (nextBarStart < to) {
            emitHits(at, nextBarStart)
            emitBar(nextBar, nextBarStart)
            at = nextBarStart
            nextBar += 1
            nextBarStart = origin + nextBar * snapshot.barSeconds
        }
        emitHits(at, to)
    }

    const tick = () => {
        if (!running) return
        const now = context.currentTime
        const from = Math.max(cursor, now)
        const to = now + lookAhead
        if (to <= from) return
        schedule(from, to)
        cursor = to
    }

    const scheduler = {
        /** A new picture of the round; read from the next window on, or from the next bar line if that comes first. */
        setSnapshot (next) {
            if (next.bpm !== snapshot.bpm && running) {
                scheduler.setTempo(next.bpm)
            }
            snapshot = next
        },
        snapshot () {
            return snapshot
        },
        onStep (fn) {
            stepListeners.add(fn)
            return () => stepListeners.delete(fn)
        },
        onBar (fn) {
            barListeners.add(fn)
            return () => barListeners.delete(fn)
        },
        /** Starts with bar 0 at `originTime` (context seconds). A past origin joins mid-bar: nothing before now is played. */
        start (originTime = context.currentTime) {
            scheduler.stop()
            origin = originTime
            cursor = Math.max(originTime, context.currentTime)
            lastBarHandedOut = Math.floor((cursor - origin) / snapshot.barSeconds) - 1
            running = true
            tick()
            stopTimer = timer(interval * 1000, tick)
        },
        stop () {
            running = false
            if (stopTimer) {
                stopTimer()
                stopTimer = null
            }
        },
        isRunning () {
            return running
        },
        /** Seconds since bar 0; negative before the start. */
        positionSeconds () {
            return context.currentTime - origin
        },
        currentBar () {
            return Math.floor(scheduler.positionSeconds() / snapshot.barSeconds)
        },
        origin () {
            return origin
        },
        /** Keeps the phase: the position in bars at `at` stays what it is while the bar length changes under it. */
        setTempo (bpm, at = context.currentTime) {
            const oldBar = snapshot.barSeconds
            const newBar = (60 / bpm) * 4
            const positionBars = (at - origin) / oldBar
            origin = at - positionBars * newBar
            snapshot = Object.freeze({ ...snapshot, bpm, barSeconds: newBar })
        },
        /**
         * Moves the origin so bar 0 sits at `originTime`, as when a shared start time arrives from the
         * server after a local start. Only the future changes: what is already scheduled stays.
         */
        alignTo (originTime) {
            const bar = snapshot.barSeconds
            // keep the bar count continuous: shift by less than half a bar either way
            let delta = originTime - origin
            delta = delta - Math.round(delta / bar) * bar
            origin += delta
            return delta
        },
        dispose () {
            scheduler.stop()
            stepListeners.clear()
            barListeners.clear()
        }
    }
    return scheduler
}
