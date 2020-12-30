'use strict';
import InstrumentBaseClass from './InstrumentBaseClass';
import Samples from '../../samples/Hi Hat Closed [CH]/index'

export default class HiHatClosed extends InstrumentBaseClass {
    static name = 'HiHatClosed';
    static label = 'HiHatClosed';
    static folder = 'Hi Hat Closed [CH]'
    static articulations = Samples
    static defaultArticulation = Object.entries(HiHatClosed.articulations)[0];
    constructor () {
        super(HiHatClosed.name, HiHatClosed.articulations, HiHatClosed.folder)
        this.parameters.articulation = HiHatClosed.defaultArticulation;
    }
}
