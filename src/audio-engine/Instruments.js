
import _ from "lodash";
import HiHats from './instruments/HiHats'
import Kicks from './instruments/Kicks'
import Snares from './instruments/Snares'
import Perc from './instruments/Perc'
import Metal from './instruments/Metal'
import Custom from './instruments/Custom'
import CustomSamples from './CustomSamples'

const Instruments = {
    instrumentClasses: {},
    instruments: [],
    init () {
        const classes = [
            HiHats,
            Kicks,
            Snares,
            Perc,
            Metal,
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
            for (let [, value] of Object.entries(
                this.instrumentClasses[instrumentName].articulations
            )) {
                let option = {
                    name: value.label,
                    value: value.id
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
