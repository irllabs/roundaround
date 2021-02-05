import InstrumentBaseClass from './InstrumentBaseClass';
import Samples from '../../samples/Congas [HC-MC-LC]/index'

export default class Congas extends InstrumentBaseClass {
    static instrumentName = 'Congas';
    static label = 'Congas';
    static folder = 'Congas [HC-MC-LC]';
    static articulations = Samples
    static defaultArticulation = Object.entries(Congas.articulations)[0];
    constructor () {
        super(Congas.instrumentName, Congas.articulations, Congas.folder)
        this.parameters.articulation = Congas.defaultArticulation;
    }
}
