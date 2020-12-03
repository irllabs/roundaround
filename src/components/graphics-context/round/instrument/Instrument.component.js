import React, { useMemo, useEffect, useRef } from 'react';
import * as Tone from 'tone';
import * as SamplesCollection from '../../../../samples/index';

function usePrevious(value) {
    const ref = useRef();
    useEffect(() => {
        ref.current = value;
    });
    return ref.current;
}

const InstrumentComponent = ({
    instrument,
    active,
    steps
}) => {
    const prevSteps = usePrevious(steps);

    const playAtTime = (note, time, velocity) => {
        try {
            if (active.instrument.instrument === 'Sampler') {
                active.instrument.triggerAttack(note, time, velocity);
            } else {
                active.instrument.triggerAttackRelease(note, instrument.noteLength, time, velocity);
            }
        } catch (e) {
            console.error( e)
        }
    }

    const scheduleStepActivation = (time, value) => {
        const activeStepObject = active.steps[value.step.id];
        if (!active.layerIsActive || !activeStepObject) return;
        if (activeStepObject.isOn) {
            const play = activeStepObject.probability >= Math.random();
            if (play) {
                playAtTime(activeStepObject.note, time, activeStepObject.velocity);
                Tone.Draw.schedule(() => activeStepObject.setAsActive(), time);
            }
        }
    };

    const stepsToTimedSteps = (steps) => {
        const subdivision = `${steps.length}n`;
        return steps.map((step, i) => {
            const time = i === 0 ? 0 : { [subdivision]: i };
            return { time, step };
        });
    }

    const player = useMemo(() => {
        const tonePart = new Tone.Part(scheduleStepActivation, stepsToTimedSteps(steps));
        tonePart.loop = true;
        tonePart.start(0);
        return tonePart;
    }, [])

    useEffect(() => {
        // active change instrument
        const config = instrument.instrument === 'Sampler'
            ?
            { "C4": SamplesCollection[instrument.sampler][instrument.sample] }
            :
            {};
        const gain = new Tone.Gain(instrument.gain);
        const newInstrument = new Tone[instrument.instrument](config).chain(
            gain,
            Tone.Master
        );
        active.setNewInstrument(newInstrument);
        active.setInstrumentGain(gain);
    }, [instrument.instrument, instrument.sampler, instrument.sample])

    const replaceSteps = (steps) => {
        player.clear();
        const timedSteps = stepsToTimedSteps(steps);
        timedSteps.map(step => {
            player.add(step);
        })
    }

    useEffect(() => {
        if (!prevSteps) return;

        if (steps.length > prevSteps.length || steps.length < prevSteps.length) {
            replaceSteps(steps);
        } else {
            // if amount is the same check if it's copied
            const sameStep = steps.find(step => prevSteps[0].id === step.id)
            if (!sameStep) {
                replaceSteps(steps);
            }
        }
    }, [steps])

    useEffect(() => {
        active.changeGainValue(instrument.gain);
    }, [instrument.gain])

    useEffect(() => {
        return () => {
            // clean up on unmounmt
            active.instrument.dispose();
            player.dispose();
        }
    }, [])
    return null;
}

export default InstrumentComponent;
