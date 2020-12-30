'use strict';
import InstrumentBaseClass from './InstrumentBaseClass';
import Samples from '../../samples/Bass Drum [BD]/index'

export default class BassDrum extends InstrumentBaseClass {
    static name = 'BassDrum';
    static label = 'Bass drum';
    static folder = 'Bass Drum [BD]'
    static articulations = Samples
    static defaultArticulation = Object.entries(BassDrum.articulations)[0];
    constructor () {
        super(BassDrum.name, BassDrum.articulations, BassDrum.folder)
        this.parameters.articulation = BassDrum.defaultArticulation;
    }
}
