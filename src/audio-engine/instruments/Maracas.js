import InstrumentBaseClass from './InstrumentBaseClass';
import Samples from '../../samples/Maracas [MA]/index'

export default class Maracas extends InstrumentBaseClass {
    static instrumentName = 'Maracas';
    static label = 'Maracas';
    static articulations = Samples
    static folder = 'Maracas [MA]';
    static defaultArticulation = Object.entries(Maracas.articulations)[0];
    constructor () {
        super(Maracas.instrumentName, Maracas.articulations, Maracas.folder)
        this.parameters.articulation = Maracas.defaultArticulation;
    }
}
