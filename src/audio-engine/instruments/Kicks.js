import InstrumentBaseClass from './InstrumentBaseClass';
import Samples from '../../samples/Kicks/index'

export default class Kicks extends InstrumentBaseClass {
    static instrumentName = 'Kicks';
    static label = 'Kicks';
    static folder = 'Kicks';
    static articulations = Samples
    static defaultArticulation = Object.entries(Kicks.articulations)[0][0];
    constructor () {
        super(Kicks.instrumentName, Kicks.articulations, Kicks.folder)
        this.parameters.articulation = Kicks.defaultArticulation;
    }

}
