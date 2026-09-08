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
                {/* The halo. MUI's Slider.thumb draws it as a box-shadow:
                    `&$focusVisible,&:hover { boxShadow: 0px 0px 0px 8px alpha(palette.primary.main, 0.16) }`
                    and `&$active { boxShadow: 0px 0px 0px 14px ... }`, transitioning box-shadow
                    over `transitions.duration.shortest` (150ms) on the default easeInOut, which is
                    Tailwind's own default timing function. This slider took MUI's default
                    `color="primary"` -- the JSS only repainted the root and the thumb white -- so
                    the halo is primary.main at 16%, `--primary` (#EAEAEA), not white. A Tailwind
                    ring at width 8 compiles to exactly `0 0 0 8px <colour>` and the thumb carries
                    no other box-shadow, so there is nothing for it to fight with; `outline-none`
                    stays because MUI's thumb sets `outline: 0` and drew the halo instead. The
                    three land in the sheet in that order, hover then focus-visible then active,
                    which is the order the JSS object had them in, so a press wins over a hover.

                    One measured deviation, from what Radix gives us: MUI set `$active` from its
                    own pointer bookkeeping, so it lit up for a drag started anywhere on the rail.
                    Radix exposes no dragging state on the thumb, so this is CSS `:active`, which
                    only fires for a press that started on the thumb.

                    MUI reset the hover halo under `@media (hover: none)` so it never stuck after
                    a tap; Tailwind's `hover:` variant is emitted inside `@media (hover: hover)`,
                    which is the same reset, so nothing extra is needed for touch. */}
                <SliderPrimitive.Thumb aria-labelledby="tempo-slider-label" className="relative block size-3 rounded-full bg-white outline-none ring-primary/16 transition-shadow duration-150 hover:ring-8 focus-visible:ring-8 active:ring-[14px]">
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
