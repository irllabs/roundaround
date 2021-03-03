
import _ from "lodash";
import BassDrum from './instruments/BassDrum'
import HiHatClosed from './instruments/HiHatClosed'
import HitHatOpen from './instruments/HitHatOpen'
import SnareDrum from './instruments/SnareDrum'
import Clap from './instruments/Clap'
import Claves from './instruments/Claves'
import Congas from './instruments/Congas'
import Cowbell from './instruments/Cowbell'
import Cymbal from './instruments/Cymbal'
import Maracas from './instruments/Maracas'
import Rimshot from './instruments/Rimshot'
import TomToms from './instruments/TomToms'
import Custom from './instruments/Custom'
import CustomSamples from './CustomSamples'

const Instruments = {
    instrumentClasses: {},
    instruments: [],
    init () {
        const classes = [
            BassDrum,
            HiHatClosed,
            SnareDrum,
            HitHatOpen,
            Clap,
            Claves,
            Congas,
            Cowbell,
            Cymbal,
            Maracas,
            Rimshot,
            TomToms,
            Custom
        ];
        for (let instrumentClass of classes) {
            this.instrumentClasses[instrumentClass.instrumentName] = instrumentClass;
        }
    },
    create (instrumentName, articulation) {
        if (!_.isNil(instrumentName)) {
            let _this = this;
            return new Promise(async function (resolve, reject) {
                let InstrumentClass = _this.instrumentClasses[instrumentName];
                let instrument = new InstrumentClass();
                await instrument.load(articulation);
                _this.instruments.push(instrument);
                resolve(instrument);
            });
        }
    },
    dispose (id) {
        let instrument = _.find(this.instruments, {
            id
        });
        if (!_.isNil(instrument)) {
            instrument.dispose();
        }
    },
    updateParameter (instrumentId, parameter, value) {
        _.find(this.instruments, {
            id: instrumentId
        }).updateParameter(parameter, value);
    },
    getInstrumentOptions (includeCustom = true) {
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
    getInstrumentArticulationOptions (instrumentName, userId) {
        // console.log('getInstrumentArticulationOptions()', instrumentName);
        if (instrumentName !== 'custom') {
            let options = [];
            for (let [name, value] of Object.entries(
                this.instrumentClasses[instrumentName].articulations
            )) {
                let option = {
                    name,
                    value
                };
                options.push(option);
            }
            //   console.log('got instrument options', options);
            return options;
        } else {
            let options = []
            //   console.log('CustomSamples.samples', CustomSamples.samples);
            for (let [id, sample] of Object.entries(CustomSamples.samples)) {
                if (sample.createdBy === userId) {
                    options.push({
                        name: sample.name,
                        value: id
                    })
                }
            }
            //   console.log('got sample options', options);
            return options
        }
    },
    getLabel (instrumentName) {
        return this.instrumentClasses[instrumentName].label;
    },
    getArticulationLabel (instrumentName, articulation) {
        return this.instrumentClasses[instrumentName].articulations[articulation];
    },
    getDefaultArticulation (instrumentName) {
        //console.log('Instruments::getDefaultArticulation() instrumentName', instrumentName, this.instrumentClasses);
        return this.instrumentClasses[instrumentName].defaultArticulation
        /*return !_.isNil(this.instrumentClasses[instrumentName].defaultArticulation)
            ? this.instrumentClasses[instrumentName].defaultArticulation
            : "none";*/
    }
};

export default Instruments;
