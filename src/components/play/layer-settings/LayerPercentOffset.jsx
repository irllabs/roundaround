import React, { useState, useEffect, useContext, useMemo, useRef } from 'react'
import { useDispatch } from "react-redux";
import { Slider as SliderPrimitive } from 'radix-ui'
import { FirebaseContext } from '../../../firebase';
import _ from 'lodash'
import {
    SET_LAYER_PERCENT_OFFSET,
    SET_LAYER_TIME_OFFSET
} from '../../../redux/actionTypes'
import Percentage from './resources/svg/percentage.svg'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { ICON_BUTTON, SLIDER_ROOT, SLIDER_TRACK, SLIDER_RANGE, SLIDER_THUMB } from './styles'

/**
 * What makeStyles used to hand this control, as Tailwind class strings. `formControl` carries
 * MUI's FormControl root as well as the JSS rule that overrode part of it, since the element is
 * a plain div now. `down('sm')` is below the *next* breakpoint, which this theme puts at 900.
 */
const classes = {
    root: 'mb-5 flex w-full flex-col',
    formControl: 'relative m-2 inline-flex min-w-[50px] flex-col border-0 p-0 align-top max-md:min-w-[100px]',
    offsetDisplay: 'mb-[15px] flex h-12 w-[88px] flex-row items-center justify-between rounded-[5px] border border-white/10 p-2.5',
    switchButton: 'flex size-8 flex-row items-center justify-center rounded-[4px] p-[5px] active:bg-white/10'
}

export default function LayerPercentOffset({
    selectedLayer,
    user,
    horizontal,
    roundId,
    playUIRef,
    offsetSliderRef,
    percentageButtonRef,
    msButtonRef,
}) {
    const dispatch = useDispatch();
    const firebase = useContext(FirebaseContext);
    const [sliderValue, setSliderValue] = useState(selectedLayer.percentOffset || 0)
    const [type, updateType] = useState('perc')
    const isDragging = useRef(false)

    // Created once; reads changing values through a ref and takes the layer id as an argument so
    // it can never write to a previously selected layer.
    const latest = useRef({})
    latest.current = { dispatch, firebase, roundId }

    const persistOffset = useMemo(() => _.throttle((offsetType, value, layerId) => {
        const { dispatch, firebase, roundId } = latest.current
        if (offsetType === 'perc') {
            dispatch({ type: SET_LAYER_PERCENT_OFFSET, payload: { id: layerId, value } })
            firebase.updateLayer(roundId, layerId, { percentOffset: value }).catch(error => console.error('Could not save offset', error))
        } else {
            dispatch({ type: SET_LAYER_TIME_OFFSET, payload: { id: layerId, value } })
            firebase.updateLayer(roundId, layerId, { timeOffset: value }).catch(error => console.error('Could not save offset', error))
        }
    }, 500), [])

    useEffect(() => () => persistOffset.cancel(), [persistOffset])

    // Follow the layer's stored value when the layer or the mode changes, or when the value
    // changes underneath us (loading a preset), but never while the user is dragging.
    useEffect(() => {
        if (isDragging.current) {
            return
        }
        setSliderValue((type === 'perc' ? selectedLayer.percentOffset : selectedLayer.timeOffset) || 0)
    }, [type, selectedLayer.id, selectedLayer.percentOffset, selectedLayer.timeOffset])

    const _onChange = ([value]) => {
        isDragging.current = true
        setSliderValue(value)
        persistOffset(type, value, selectedLayer.id)
        // Update UI directly for performance reasons (instead of going via redux)
        if (playUIRef && playUIRef.adjustLayerOffset) {
            if (type === 'perc') {
                playUIRef.adjustLayerOffset(selectedLayer.id, value, selectedLayer.timeOffset)
            } else {
                playUIRef.adjustLayerOffset(selectedLayer.id, selectedLayer.percentOffset, value)
            }
        }
    }

    const _onChangeCommitted = () => {
        isDragging.current = false
        persistOffset.flush()
    }

    return (
        <div className={classes.root}>
            <div className={classes.formControl}>
                {/* Typography caption, with the inline 14px and the 5px gutter it overrode
                    gutterBottom with. The margin applies here: the span is a flex item of the
                    column, so it is blockified. */}
                <span id="layer-offset-label" className="mb-[5px] text-[14px] leading-[1.66] tracking-[0.03333em]">
                    Time Offset
                </span>
                {horizontal &&
                    <div className={classes.offsetDisplay}>
                        <Button
                            type="button"
                            variant="plain"
                            size="icon-app"
                            ref={percentageButtonRef}
                            aria-label="Offset as a percentage of a step"
                            aria-pressed={type === 'perc'}
                            onClick={() => updateType('perc')}
                            className={cn(ICON_BUTTON, classes.switchButton, type === 'perc' && 'bg-white/10')}
                        >
                            <img className="h-[18px] w-[13px]" alt='percentage' src={Percentage} />
                        </Button>
                        <Button
                            type="button"
                            variant="plain"
                            size="icon-app"
                            ref={msButtonRef}
                            aria-label="Offset in milliseconds"
                            aria-pressed={type === 'ms'}
                            onClick={() => updateType('ms')}
                            className={cn(ICON_BUTTON, classes.switchButton, type === 'ms' && 'bg-white/10')}
                        >
                            <p className="m-0 text-base leading-normal font-semibold tracking-[0.00938em]">ms</p>
                        </Button>
                    </div>
                }
                {/* No value bubble: this slider was valueLabelDisplay="off". */}
                <SliderPrimitive.Root
                    ref={offsetSliderRef}
                    className={SLIDER_ROOT}
                    value={[sliderValue]}
                    min={-100}
                    max={100}
                    onValueChange={_onChange}
                    onValueCommit={_onChangeCommitted}
                >
                    <SliderPrimitive.Track className={SLIDER_TRACK}>
                        <SliderPrimitive.Range className={SLIDER_RANGE} />
                    </SliderPrimitive.Track>
                    {/* aria-labelledby belongs on the thumb: that is the element Radix gives
                        role="slider" to, the way MUI did. */}
                    <SliderPrimitive.Thumb className={SLIDER_THUMB} aria-labelledby="layer-offset-label" />
                </SliderPrimitive.Root>
            </div>
        </div>
    )
}
