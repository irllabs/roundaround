
import _ from "lodash";
import HiHats from './instruments/HiHats'
import Kicks from './instruments/Kicks'
import Snares from './instruments/Snares'
import Perc from './instruments/Perc'
import Custom from './instruments/Custom'
import CustomSamples from './CustomSamples'
import { randomInt } from "../utils/helpers";

const Instruments = {
    instrumentClasses: {},
    instruments: [],
    init() {
        const classes = [
            HiHats,
            Kicks,
            Snares,
            Perc,
            Custom
        ];
        for (let instrumentClass of classes) {
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
        const classes = [
            HiHats,
            Kicks,
            Snares,
            Perc,
            Custom
        ];
        const inst = {};
        for (let instrument of classes) {
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
