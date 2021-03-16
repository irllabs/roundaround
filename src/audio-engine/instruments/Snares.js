import InstrumentBaseClass from './InstrumentBaseClass';
import Samples from '../../samples/Snares/index'

export default class Snares extends InstrumentBaseClass {
    static instrumentName = 'Snares';
    static label = 'Snares';
    static folder = 'Snares';
    static articulations = Samples
    static defaultArticulation = Object.entries(Snares.articulations)[0][0];
    constructor () {
        super(Snares.instrumentName, Snares.articulations, Snares.folder)
        this.parameters.articulation = Snares.defaultArticulation;
    }

}
