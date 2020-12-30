'use strict';
import InstrumentBaseClass from './InstrumentBaseClass';
import Samples from '../../samples/Claves [CL]/index'

export default class Claves extends InstrumentBaseClass {
    static name = 'Claves';
    static label = 'Claves';
    static folder = 'Claves [CL]';
    static articulations = Samples
    static defaultArticulation = Object.entries(Claves.articulations)[0];
    constructor () {
        super(Claves.name, Claves.articulations, Claves.folder)
        this.parameters.articulation = Claves.defaultArticulation;
    }
}
