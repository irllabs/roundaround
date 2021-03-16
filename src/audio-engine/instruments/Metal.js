import InstrumentBaseClass from './InstrumentBaseClass';
import Samples from '../../samples/Metal/index'

export default class Metal extends InstrumentBaseClass {
    static instrumentName = 'Metal';
    static label = 'Metal';
    static folder = 'Metal';
    static articulations = Samples
    static defaultArticulation = Object.entries(Metal.articulations)[0][0];
    constructor () {
        super(Metal.instrumentName, Metal.articulations, Metal.folder)
        this.parameters.articulation = Metal.defaultArticulation;
    }

}
