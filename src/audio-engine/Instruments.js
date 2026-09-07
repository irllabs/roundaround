
import _ from "lodash";
import { createSampleInstrument } from './instruments/sampleInstrument'
import Custom from './instruments/Custom'
import CustomSamples from './CustomSamples'
import HiHatSamples from '../samples/HiHats/index'
import KickSamples from '../samples/Kicks/index'
import SnareSamples from '../samples/Snares/index'
import PercSamples from '../samples/Perc/index'
import { randomInt } from "../utils/helpers";

const HiHats = createSampleInstrument({ instrumentName: 'HiHats', label: 'Hi-hat', folder: 'HiHats', samples: HiHatSamples })
const Kicks = createSampleInstrument({ instrumentName: 'Kicks', label: 'Kick', folder: 'Kicks', samples: KickSamples })
const Snares = createSampleInstrument({ instrumentName: 'Snares', label: 'Snare', folder: 'Snares', samples: SnareSamples })
const Perc = createSampleInstrument({ instrumentName: 'Perc', label: 'Perc', folder: 'Perc', samples: PercSamples })

// the order decides the order of Instruments.classes(), which is what new layers pick from
const INSTRUMENT_CLASSES = [
    HiHats,
    Kicks,
    Snares,
    Perc,
    Custom
];

const Instruments = {
    instrumentClasses: {},
    instruments: [],
    init() {
        for (let instrumentClass of INSTRUMENT_CLASSES) {
            this.instrumentClasses[instrumentClass.instrumentName] = instrumentClass;
        }
    },
    async getRandomArticulation(instrumentName) {
        const instruments = await this.classes();
        let randomSoundNo = 0;
        const instrument = instruments[instrumentName];
        const sampleKeys = instrument['sampleKeys'];
        randomSoundNo = randomInt(0, sampleKeys.length - 1);
        return sampleKeys[randomSoundNo];
    },
    async classes() {
        const inst = {};
        for (let instrument of INSTRUMENT_CLASSES) {
            inst[instrument.instrumentName] = {
                instrumentName: instrument.instrumentName,
                name: instrument.name,
                label: instrument.label,
                samples: instrument.articulations,
                sampleKeys: Object.keys(instrument.articulations)
            };
        }
        return inst;
    },

    /** Rejects when the instrument is unknown or its samples fail to load. */
    async create(instrumentName, articulation) {
        const InstrumentClass = this.instrumentClasses[instrumentName];
        if (_.isNil(InstrumentClass)) {
            throw new Error(`Unknown instrument "${instrumentName}"`);
        }
        const instrument = new InstrumentClass();
        try {
            await instrument.load(articulation);
        } catch (error) {
            instrument.dispose();
            throw error;
        }
        this.instruments.push(instrument);
        return instrument;
    },
    dispose(id) {
        let instrument = _.find(this.instruments, {
            id
        });
        if (!_.isNil(instrument)) {
            instrument.dispose();
        }
    },
    updateParameter(instrumentId, parameter, value) {
        _.find(this.instruments, {
            id: instrumentId
        }).updateParameter(parameter, value);
    },
    getInstrumentOptions(includeCustom = true) {
        let options = [];
        for (let [, instrument] of Object.entries(this.instrumentClasses)) {
            if (instrument.instrumentName !== 'custom' || includeCustom) {
                options.push({
                    label: instrument.label,
                    name: instrument.instrumentName,
                    articulations: instrument.articulations
                });
            }
        }
        options = _.sortBy(options, "label");
        return options;
    },
    getInstrumentArticulationOptions(instrumentName, userId) {
        if (instrumentName !== 'custom') {
            let options = [];
            for (let [, value] of Object.entries(
                this.instrumentClasses[instrumentName].articulations
            )) {
                let option = {
                    name: value.label,
                    value: value.id
                };
                options.push(option);
            }
            return options;
        } else {
            let options = []
            for (let [id, sample] of Object.entries(CustomSamples.samples)) {
                if (sample.createdBy === userId) {
                    options.push({
                        name: sample.name,
                        value: id
                    })
                }
            }
            return options
        }
    },
    getLabel(instrumentName) {
        return this.instrumentClasses[instrumentName].label;
    },
    getArticulationLabel(instrumentName, articulation) {
        return this.instrumentClasses[instrumentName].articulations[articulation];
    },
    getInstrumentLabel(instrumentName) {
        return this.instrumentClasses[instrumentName].label
    },
    getDefaultArticulation(instrumentName) {
        return this.instrumentClasses[instrumentName].defaultArticulation
        /*return !_.isNil(this.instrumentClasses[instrumentName].defaultArticulation)
            ? this.instrumentClasses[instrumentName].defaultArticulation
            : "none";*/
    }
};

export default Instruments;
