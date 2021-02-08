import InstrumentBaseClass from './InstrumentBaseClass';
import Samples from '../../samples/Clap [CP]/index'

export default class Clap extends InstrumentBaseClass {
    static instrumentName = 'Clap';
    static label = 'Clap';
    static folder = 'Clap [CP]';
    static articulations = Samples
    static defaultArticulation = Object.entries(Clap.articulations)[0];
    constructor () {
        super(Clap.instrumentName, Clap.articulations, Clap.folder)
        this.parameters.articulation = Clap.defaultArticulation;
    }
}
