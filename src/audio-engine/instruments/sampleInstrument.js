import InstrumentBaseClass from './InstrumentBaseClass';

/**
 * The sampled kit instruments (kicks, snares, hi-hats, perc) behave identically and differ
 * only in their name, label, sample folder and sample map, so they are built from this
 * template instead of one near-identical file each.
 */
export function createSampleInstrument ({ instrumentName, label, folder, samples }) {
    const SampleInstrument = class extends InstrumentBaseClass {
        static instrumentName = instrumentName;
        static label = label;
        static folder = folder;
        static articulations = samples;
        static defaultArticulation = Object.entries(samples)[0][0];
        constructor () {
            super(instrumentName, samples, folder)
            this.parameters.articulation = SampleInstrument.defaultArticulation;
        }
    }
    // Instruments.classes() reports the class name, which used to be the name of its file.
    Object.defineProperty(SampleInstrument, 'name', { value: instrumentName })
    return SampleInstrument
}
