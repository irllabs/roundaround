import { vi, describe, it, expect, beforeEach } from 'vitest'
import Instruments from '../Instruments'
import HiHatSamples from '../../samples/HiHats/index'
import KickSamples from '../../samples/Kicks/index'
import SnareSamples from '../../samples/Snares/index'
import PercSamples from '../../samples/Perc/index'

vi.mock('tone', () => ({
    Sampler: class { connect () { } dispose () { } releaseAll () { } },
    Part: class { dispose () { } },
    Midi: (n) => n,
    Transport: { PPQ: 192, bpm: { value: 120 } }
}))

// what the four sampled kit instruments looked like when each had its own file
const expected = [
    { instrumentName: 'HiHats', label: 'Hi-hat', folder: 'HiHats', samples: HiHatSamples },
    { instrumentName: 'Kicks', label: 'Kick', folder: 'Kicks', samples: KickSamples },
    { instrumentName: 'Snares', label: 'Snare', folder: 'Snares', samples: SnareSamples },
    { instrumentName: 'Perc', label: 'Perc', folder: 'Perc', samples: PercSamples }
]

describe('the sampled kit instruments', () => {
    beforeEach(() => {
        Instruments.instrumentClasses = {}
        Instruments.init()
    })

    it('keeps the same statics as the four hand-written classes', () => {
        for (const instrument of expected) {
            const InstrumentClass = Instruments.instrumentClasses[instrument.instrumentName]
            expect(InstrumentClass.instrumentName).toBe(instrument.instrumentName)
            expect(InstrumentClass.name).toBe(instrument.instrumentName)
            expect(InstrumentClass.label).toBe(instrument.label)
            expect(InstrumentClass.folder).toBe(instrument.folder)
            expect(InstrumentClass.articulations).toBe(instrument.samples)
            expect(InstrumentClass.defaultArticulation).toBe(Object.keys(instrument.samples)[0])
            expect(Instruments.getDefaultArticulation(instrument.instrumentName))
                .toBe(Object.keys(instrument.samples)[0])
        }
    })

    it('builds instances that know their name, folder and default articulation', () => {
        for (const instrument of expected) {
            const InstrumentClass = Instruments.instrumentClasses[instrument.instrumentName]
            const instance = new InstrumentClass()
            expect(instance.name).toBe(instrument.instrumentName)
            expect(instance.folder).toBe(instrument.folder)
            expect(instance.articulations).toBe(instrument.samples)
            expect(instance.parameters.articulation).toBe(Object.keys(instrument.samples)[0])
        }
    })

    it('lists them in Instruments.classes() ahead of the custom instrument', async () => {
        const classes = await Instruments.classes()
        expect(Object.keys(classes)).toEqual(['HiHats', 'Kicks', 'Snares', 'Perc', 'custom'])
        for (const instrument of expected) {
            expect(classes[instrument.instrumentName]).toEqual({
                instrumentName: instrument.instrumentName,
                name: instrument.instrumentName,
                label: instrument.label,
                samples: instrument.samples,
                sampleKeys: Object.keys(instrument.samples)
            })
        }
    })

    it('offers them as instrument options, sorted by label', () => {
        expect(Instruments.getInstrumentOptions().map(option => option.label))
            .toEqual(['Custom', 'Hi-hat', 'Kick', 'Perc', 'Snare'])
        expect(Instruments.getInstrumentOptions(false).map(option => option.name))
            .toEqual(['HiHats', 'Kicks', 'Perc', 'Snares'])
    })

    it('labels each articulation for the layer settings menu', () => {
        const options = Instruments.getInstrumentArticulationOptions('Kicks')
        expect(options).toHaveLength(Object.keys(KickSamples).length)
        expect(options[0]).toEqual({
            name: Object.values(KickSamples)[0].label,
            value: Object.values(KickSamples)[0].id
        })
    })
})
