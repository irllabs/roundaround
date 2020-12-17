'use strict';
import InstrumentBaseClass from './InstrumentBaseClass';
import Samples from '../../samples/Cowbell [CB]/index'

export default class Cowbell extends InstrumentBaseClass {
    static name = 'Cowbell';
    static label = 'Cowbell';
    static articulations = Samples
    static defaultArticulation = Object.entries(Cowbell.articulations)[0];
    constructor () {
        super(Cowbell.name, Cowbell.articulations)
        this.parameters.articulation = Cowbell.defaultArticulation;
    }
}
