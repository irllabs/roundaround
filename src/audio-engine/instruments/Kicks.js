import InstrumentBaseClass from './InstrumentBaseClass';
import Samples from '../../samples/Kicks/index'

export default class Kicks extends InstrumentBaseClass {
    static instrumentName = 'Kicks';
    static label = 'Kick';
    static folder = 'Kicks';
    static articulations = Samples
    static samplesCount = Object.entries(Kicks.articulations).length;
    static defaultArticulation = Object.entries(Kicks.articulations)[Math.floor(Math.random() * Kicks.samplesCount)][0];
    constructor() {
        super(Kicks.instrumentName, Kicks.articulations, Kicks.folder)
        this.parameters.articulation = Kicks.defaultArticulation;
    }

}
