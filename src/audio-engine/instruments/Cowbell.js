import InstrumentBaseClass from './InstrumentBaseClass';
import Samples from '../../samples/Cowbell [CB]/index'

export default class Cowbell extends InstrumentBaseClass {
    static instrumentName = 'Cowbell';
    static label = 'Cowbell';
    static folder = 'Cowbell [CB]';
    static articulations = Samples
    static defaultArticulation = Object.entries(Cowbell.articulations)[0];
    constructor () {
        super(Cowbell.instrumentName, Cowbell.articulations, Cowbell.folder)
        this.parameters.articulation = Cowbell.defaultArticulation;
    }
}
