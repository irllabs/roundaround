import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as ToneMock from 'tone'
import InstrumentBaseClass from './InstrumentBaseClass'
import Instruments from '../Instruments'

vi.mock('tone', () => {
    class Sampler {
        constructor(urls, options) {
            this.urls = urls
            this.options = options
            Sampler.instances.push(this)
        }
        connect() {}
        dispose() {}
        releaseAll() {}
    }
    Sampler.instances = []
    return {
        Sampler,
        Part: class { dispose() {} },
        Midi: (n) => n,
        getTransport: () => ({ PPQ: 192, bpm: { value: 120 } })
    }
})

const { Sampler } = ToneMock

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
