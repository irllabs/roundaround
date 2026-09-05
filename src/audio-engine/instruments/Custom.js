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
    async load (sampleId) {
        const sample = await CustomSamples.get(sampleId)
        if (_.isNil(sample)) {
            throw new Error(`Custom sample ${sampleId} was not found`)
        }
        const sampleMap = this.getSampleMap(sample)
        this.sampleMap = _.cloneDeep(sampleMap)
        await this.loadSamples(sampleMap)
    }
    calculateMidiNoteFromVelocity (velocity) {
        return 60
    }
}
