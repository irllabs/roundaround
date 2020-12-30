'use strict';
import InstrumentBaseClass from './InstrumentBaseClass';
import Samples from '../../samples/Rimshot [RS]/index'

export default class Rimshot extends InstrumentBaseClass {
    static name = 'Rimshot';
    static label = 'Rimshot';
    static articulations = Samples
    static folder = 'Rimshot [RS]';
    static defaultArticulation = Object.entries(Rimshot.articulations)[0];
    constructor () {
        super(Rimshot.name, Rimshot.articulations, Rimshot.folder)
        this.parameters.articulation = Rimshot.defaultArticulation;
    }
}
