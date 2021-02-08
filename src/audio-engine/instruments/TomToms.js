import InstrumentBaseClass from './InstrumentBaseClass';
import Samples from '../../samples/Tom Toms [LT-MT-HT]/index'

export default class TomToms extends InstrumentBaseClass {
    static instrumentName = 'TomToms';
    static label = 'TomToms';
    static articulations = Samples
    static folder = 'Tom Toms [LT-MT-HT]';
    static defaultArticulation = Object.entries(TomToms.articulations)[0];
    constructor () {
        super(TomToms.instrumentName, TomToms.articulations, TomToms.folder)
        this.parameters.articulation = TomToms.defaultArticulation;
    }
}
