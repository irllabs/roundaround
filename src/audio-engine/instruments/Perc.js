import InstrumentBaseClass from './InstrumentBaseClass';
import Samples from '../../samples/Perc/index'

export default class Perc extends InstrumentBaseClass {
    static instrumentName = 'Perc';
    static label = 'Perc';
    static folder = 'Perc';
    static articulations = Samples
    static defaultArticulation = Object.entries(Perc.articulations)[0][0];
    constructor () {
        super(Perc.instrumentName, Perc.articulations, Perc.folder)
        this.parameters.articulation = Perc.defaultArticulation;
    }

}
