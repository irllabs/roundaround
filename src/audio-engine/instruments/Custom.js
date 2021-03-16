import InstrumentBaseClass from './InstrumentBaseClass';
import _ from 'lodash'
import CustomSamples from '../CustomSamples'

export default class Custom extends InstrumentBaseClass {
    static instrumentName = 'custom';
    static label = 'Custom';
    static folder = '';
    static articulations = {}
    static defaultArticulation = null;
    constructor () {
        super(Custom.instrumentName, Custom.articulations, Custom.folder)
        this.parameters.articulation = Custom.defaultArticulation;
    }
    getSampleMap (sample) {
        let url = sample.localURL
        if (_.isNil(url)) {
            url = sample.remoteURL
        }
        let map = {
            'C4': url
        }
        return map
    }
    load (sampleId) {
        //  console.log('custom::load()', sampleId);
        const _this = this
        return new Promise(async function (resolve, reject) {
            let sample = await CustomSamples.get(sampleId)
            let sampleMap = _this.getSampleMap(sample)
            _this.sampleMap = _.cloneDeep(sampleMap)
            //   console.log('instrument load()', sampleMap)
            if (!_.isNil(sampleMap)) {
                await _this.loadSamples(sampleMap)
            }
            // console.log('instrument finished loading');
            resolve()
        })
    }
    calculateMidiNoteFromVelocity (velocity) {
        return 60
    }
}
