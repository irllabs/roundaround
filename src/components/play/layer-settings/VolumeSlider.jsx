import React, { useState, useEffect, useContext, useMemo, useRef } from 'react'
import { useDispatch } from "react-redux";
import { Slider as SliderPrimitive } from 'radix-ui'
import _ from 'lodash'
import AudioEngine from '../../../audio-engine/AudioEngine'
import { convertPercentToDB, convertDBToPercent } from '../../../utils/index'
import { SET_LAYER_GAIN } from '../../../redux/actionTypes'
import { FirebaseContext } from '../../../firebase';
import { cn } from '@/lib/utils'
import { SLIDER_ROOT, SLIDER_TRACK, SLIDER_RANGE, SLIDER_THUMB } from './styles'

export default function VolumeSlider({ selectedLayer, sliderRef, user, roundId, hideText }) {
    const dispatch = useDispatch();
    const firebase = useContext(FirebaseContext);
    const [sliderValue, setSliderValue] = useState(80)
    const isDragging = useRef(false)

    // The throttled writer is created once, so it reads everything that can change through a ref
    // and takes the layer id as an argument. Before this it closed over the first layer ever
    // selected and saved later changes to that layer's document.
    const latest = useRef({})
    latest.current = { dispatch, firebase, roundId, userId: user ? user.id : null }

    const persistGain = useMemo(() => _.throttle((dB, layerId) => {
        const { dispatch, firebase, roundId, userId } = latest.current
        dispatch({ type: SET_LAYER_GAIN, payload: { id: layerId, value: dB, user: userId } })
        firebase.updateLayer(roundId, layerId, { gain: dB }).catch(error => console.error('Could not save volume', error))
    }, 500), [])

    useEffect(() => () => persistGain.cancel(), [persistGain])

    const onSliderChange = ([percent]) => {
        isDragging.current = true
        setSliderValue(percent)
        const dB = convertPercentToDB(percent)
        const track = AudioEngine.tracksById[selectedLayer.id]
        if (!_.isNil(track)) {
            track.setVolume(dB)
        }
        persistGain(dB, selectedLayer.id)
    }

    const onSliderChangeCommitted = () => {
        isDragging.current = false
        persistGain.flush()
    }

    useEffect(() => {
        if (!isDragging.current) {
            setSliderValue(convertDBToPercent(selectedLayer.gain))
        }
    }, [selectedLayer.id, selectedLayer.gain])

    return (
        // MUI's onChange killed the event it was handed, and nothing here replaces that, on
        // purpose. The event was always the mousedown or mousemove MUI derived the value from,
        // never the click: the click went on bubbling, so in the mixer a press on this slider
        // also selected the row's layer, and PlayUI now takes a selection over from any path.
        // Stopping it here instead would drop that selection, and a pointerdown stopped here
        // would never reach PlayRoute's window listener, which is what unlocks audio for a
        // collaborator who has not pressed play. Radix preventDefaults its own pointerdown and
        // the root is `touch-none select-none`, so the rest of what MUI's call did is covered.
        <div className="flex w-full flex-col justify-center p-2">
            {!hideText && <span id={`volume-slider-${selectedLayer.id}`} className="text-xs leading-[1.66] tracking-[0.03333em]">Volume</span>}
            <SliderPrimitive.Root
                ref={sliderRef}
                className={cn(SLIDER_ROOT, 'min-w-[108px]')}
                value={[selectedLayer.isMuted ? 0 : Math.floor(sliderValue)]}
                min={0}
                max={100}
                onValueChange={onSliderChange}
                onValueCommit={onSliderChangeCommitted}
            >
                <SliderPrimitive.Track className={SLIDER_TRACK}>
                    <SliderPrimitive.Range className={SLIDER_RANGE} />
                </SliderPrimitive.Track>
                {/* aria-label/labelledby belong on the thumb: that is the element Radix gives
                    role="slider" to, the way MUI did. */}
                <SliderPrimitive.Thumb
                    className={cn(SLIDER_THUMB, 'group/thumb')}
                    aria-label={hideText ? 'Volume' : undefined}
                    aria-labelledby={hideText ? undefined : `volume-slider-${selectedLayer.id}`}
                >
                    {/* MUI's valueLabelDisplay="auto": a 32px teardrop 34px above the thumb,
                        shown while the thumb is hovered, focused or dragged. The third of those
                        carries the same caveat as the halo in styles.js -- MUI lit it for a drag
                        started anywhere on the rail, and this is CSS `:active`, so it only shows
                        for a press that started on the thumb -- and the second is
                        `focus-visible`, which is where MUI's own `$focusVisible` ended up. */}
                    <span className="pointer-events-none absolute -left-[10px] -top-[34px] z-10 block origin-bottom -translate-y-[10px] text-[12px] leading-[1.2] opacity-0 transition-opacity group-hover/thumb:opacity-100 group-focus-visible/thumb:opacity-100 group-active/thumb:opacity-100">
                        <span className="flex size-8 rotate-[-45deg] items-center justify-center rounded-[50%_50%_50%_0] bg-current">
                            <span className="rotate-45 text-[rgba(0,0,0,0.87)]">{Math.floor(sliderValue)}</span>
                        </span>
                    </span>
                </SliderPrimitive.Thumb>
            </SliderPrimitive.Root>
        </div>
    )
}
