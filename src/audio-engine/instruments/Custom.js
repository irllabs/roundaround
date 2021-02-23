import InstrumentBaseClass from './InstrumentBaseClass';
import _ from 'lodash'

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
    getSampleMap (url) {
        let map = {
            'C4': url
        }
        return map
    }
    load (sound) {
        console.log('custom::load()', sound);
        const _this = this
        return new Promise(async function (resolve, reject) {
            let sampleMap = _this.getSampleMap(sound)
            _this.sampleMap = _.cloneDeep(sampleMap)
            console.log('instrument load()', sampleMap)
            if (!_.isNil(sampleMap)) {
                await _this.loadSamples(sampleMap)
            }
            console.log('instrument finished loading');
            resolve()
        })
    }
}
