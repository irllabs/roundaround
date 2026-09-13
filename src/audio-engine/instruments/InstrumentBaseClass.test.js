import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as ToneMock from 'tone'
import InstrumentBaseClass from './InstrumentBaseClass'
import Instruments from '../Instruments'

vi.mock('tone', () => {
    class Sampler {
        constructor(urls, options) {
            this.urls = urls
            this.options = options
            this.context = {}
            this.attacks = []
            this.releases = []
            Sampler.instances.push(this)
        }
        connect() {}
        dispose() {}
        releaseAll() {}
        triggerAttack(note, time, velocity) { this.attacks.push({ note, time, velocity }) }
        triggerAttackRelease(note, duration, time, velocity) { this.releases.push({ note, duration, time, velocity }) }
    }
    Sampler.instances = []
    class Part {
        constructor(callback, events) {
            this.callback = callback
            this.events = events
            Part.instances.push(this)
        }
        start() {}
        dispose() {}
    }
    Part.instances = []
    return {
        Sampler,
        Part,
        Midi: (n) => n,
        getTransport: () => ({ PPQ: 192, bpm: { value: 120 } })
    }
})

const { Sampler, Part } = ToneMock

class TestInstrument extends InstrumentBaseClass {
    constructor() {
        super('Test', { hit: { samples: [{ sample: 'hit.wav', lovel: 0, hivel: 127 }] } }, 'Test')
    }
}

describe('InstrumentBaseClass.load', () => {
    beforeEach(() => {
        Sampler.instances.length = 0
        vi.useFakeTimers()
    })
    afterEach(() => vi.useRealTimers())

    it('resolves once the sampler reports its buffers loaded', async () => {
        const instrument = new TestInstrument()
        const loading = instrument.load('hit')
        expect(Sampler.instances).toHaveLength(1)
        expect(Sampler.instances[0].urls).toEqual({ C0: '/samples/Test/hit.wav' })
        Sampler.instances[0].options.onload()
        await expect(loading).resolves.toBeUndefined()
    })

    it('rejects when a buffer fails to load', async () => {
        const instrument = new TestInstrument()
        const loading = instrument.load('hit')
        Sampler.instances[0].options.onerror(new Error('404 hit.wav'))
        await expect(loading).rejects.toThrow('404 hit.wav')
    })

    it('rejects after the timeout when the sampler never reports back', async () => {
        const instrument = new TestInstrument()
        const loading = instrument.load('hit')
        vi.advanceTimersByTime(20000)
        await expect(loading).rejects.toThrow(/Timed out/)
    })

    it('rejects an unknown articulation before touching the sampler', async () => {
        const instrument = new TestInstrument()
        await expect(instrument.load('nope')).rejects.toThrow(/Unknown articulation/)
        expect(Sampler.instances).toHaveLength(0)
    })
})

describe('Instruments.create', () => {
    it('rejects unknown instruments and articulations instead of hanging', async () => {
        Instruments.init()
        await expect(Instruments.create('Nope', 'x')).rejects.toThrow(/Unknown instrument/)
        await expect(Instruments.create('Kicks', 'not-a-kick')).rejects.toThrow(/Unknown articulation/)
    })
})

describe('InstrumentBaseClass.loadPart', () => {
    beforeEach(() => {
        Sampler.instances.length = 0
        Part.instances.length = 0
    })

    // A drum hit plays to the end of its sample. Before, the part released every note after its
    // step, so on a busy round each hit was cut at the next step (125 ms at 120 bpm plus the
    // sampler's 100 ms fade) and no drum ever rang out.
    it('lets a hit ring out: attack at the callback time, no release', async () => {
        const instrument = new TestInstrument()
        const loading = instrument.load('hit')
        Sampler.instances[0].options.onload()
        await loading
        instrument.loadPart([{ time: 0, duration: 48, midi: 60, velocity: 1, probability: 1 }], 1)
        const part = Part.instances[0]
        expect(part.events).toEqual([{ time: '0i', duration: '48i', midi: 12, velocity: 1, probability: 1 }])
        part.callback(1.234, part.events[0])
        expect(Sampler.instances[0].attacks).toEqual([{ note: 12, time: 1.234, velocity: 1 }])
        expect(Sampler.instances[0].releases).toEqual([])
    })

    it('leaves a step out when its probability says so', async () => {
        const instrument = new TestInstrument()
        const loading = instrument.load('hit')
        Sampler.instances[0].options.onload()
        await loading
        instrument.loadPart([{ time: 0, duration: 48, midi: 60, velocity: 1, probability: 0 }], 1)
        const part = Part.instances[0]
        part.callback(0.5, part.events[0])
        expect(Sampler.instances[0].attacks).toEqual([])
    })
})
