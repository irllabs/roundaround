import React, { useContext, useEffect, useMemo, useRef } from 'react';
import { connect } from "react-redux";
import { Slider as SliderPrimitive } from 'radix-ui'
import AudioEngine from '../../audio-engine/AudioEngine'
import { setRoundBpm } from '../../redux/actions';
import { FirebaseContext } from '../../firebase';
import _ from 'lodash'

// Radix's primitives rather than @/components/ui/slider: MUI's always-on value bubble is a child
// of the thumb, and the generated Slider renders its own thumbs from the value array with no slot
// to put anything inside them. src/components/ui/slider.jsx is out of scope for this PR.
function TempoSlider({ round, setRoundBpm }) {
    const firebase = useContext(FirebaseContext);
    const roundBpm = round ? round.bpm : 120
    const roundId = round ? round.id : null
    const [value, setValue] = React.useState(roundBpm);
    const isDragging = useRef(false)

    const latest = useRef({})
    latest.current = { setRoundBpm, firebase, roundId }

    const persistTempo = useMemo(() => _.throttle((bpm) => {
        const { setRoundBpm, firebase, roundId } = latest.current
        if (_.isNil(roundId)) return
        setRoundBpm(bpm)
        firebase.updateRound(roundId, { bpm }).catch(error => console.error('Could not save tempo', error))
    }, 1000), []);

    useEffect(() => () => persistTempo.cancel(), [persistTempo])

    // Follow tempo changes made by collaborators unless this user is mid-drag.
    useEffect(() => {
        if (!isDragging.current) {
            setValue(roundBpm)
        }
    }, [roundBpm])

    const handleChange = ([bpm]) => {
        isDragging.current = true
        setValue(bpm);
        AudioEngine.setTempo(bpm)
        persistTempo(bpm)
    };

    const handleChangeCommitted = () => {
        isDragging.current = false
        persistTempo.flush()
    }

    return (
        <div className="flex items-center justify-center p-4">
            <div id="tempo-slider-label" className="mr-4">Tempo</div>
            <SliderPrimitive.Root
                className="relative flex h-7 w-[300px] touch-none select-none items-center"
                value={[value]}
                min={50}
                max={200}
                onValueChange={handleChange}
                onValueCommit={handleChangeCommitted}
            >
                <SliderPrimitive.Track className="relative h-0.5 w-full grow rounded-[1px] bg-white/38">
                    <SliderPrimitive.Range className="absolute h-full rounded-[1px] bg-white" />
                </SliderPrimitive.Track>
                {/* aria-labelledby goes on the thumb, not on the root: Radix puts role="slider"
                    on the thumb, and MUI put the label on the element carrying that role. On the
                    root it would name a span with no role and the slider would stay unnamed. */}
                <SliderPrimitive.Thumb aria-labelledby="tempo-slider-label" className="relative block size-3 rounded-full bg-white outline-none">
                    {/* MUI's value label: a 32px teardrop 34px above the thumb, pulled up another
                        10px, with the number rotated back level. */}
                    <span className="absolute -left-[10px] -top-[34px] z-10 block origin-bottom -translate-y-[10px] text-[12px] leading-[1.2]">
                        <span className="flex size-8 rotate-[-45deg] items-center justify-center rounded-[50%_50%_50%_0] bg-white">
                            <span className="rotate-45 text-[rgba(0,0,0,0.87)]">{value}</span>
                        </span>
                    </span>
                </SliderPrimitive.Thumb>
            </SliderPrimitive.Root>
        </div>
    )
}
const mapStateToProps = state => {
    return {
        round: state.round
    };
};

export default connect(
    mapStateToProps,
    {
        setRoundBpm
    }
)(TempoSlider);
