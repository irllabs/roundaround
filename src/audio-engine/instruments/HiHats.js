import InstrumentBaseClass from './InstrumentBaseClass';
import Samples from '../../samples/HiHats/index'

export default class HiHats extends InstrumentBaseClass {
    static instrumentName = 'HiHats';
    static label = 'Hi-hat';
    static folder = 'HiHats';
    static articulations = Samples
    static samplesCount = Object.entries(HiHats.articulations).length
    static defaultArticulation = Object.entries(HiHats.articulations)[Math.floor(Math.random() * HiHats.samplesCount)][0];
    constructor () {
        super(HiHats.instrumentName, HiHats.articulations, HiHats.folder)
        this.parameters.articulation = HiHats.defaultArticulation;
    }

}
