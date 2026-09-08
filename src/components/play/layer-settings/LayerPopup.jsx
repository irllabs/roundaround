import React, { useContext } from 'react'
import { useDispatch } from "react-redux";
import LayerPercentOffset from './LayerPercentOffset'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { layerSettingsClasses, ICON_BUTTON, POPUP_SURFACE } from './styles'

import { SET_LAYER_STEPS } from '../../../redux/actionTypes'
import { FirebaseContext } from '../../../firebase';
import { changeLayerLength } from '../../../utils/index'
import { Limits } from '../../../utils/constants'

import Minus from './resources/svg/minus.svg'
import Plus from './resources/svg/plus.svg'

/**
 * What withStyles used to hand this popup, as Tailwind class strings. `hidden` is the shared
 * one -- the popup is never unmounted, only moved to top:200% at opacity 0, which is what the
 * 0.2s fades are and what capture.py reads to tell open from closed.
 */
const classes = {
    root: POPUP_SURFACE + ' -top-[253px] left-0 flex h-[257px] min-h-[48px] w-[155px] flex-col items-center justify-start',
    offsetSlider: 'w-full px-2.5 py-[5px]',
    stepCount: 'rounded-[4px] bg-white/10 px-2.5 py-[5px]',
    stepButtons: 'size-[30px] rounded-full bg-white/10 p-0',
    stepControls: 'mt-2.5 flex flex-row items-center justify-between',
    // The app's only bare <input>. It used to take the browser's control font back from
    // preflight through a `font: revert` in src/index.css; `400 13.3333px Arial` at
    // line-height normal is what that resolves to in the Chrome the baseline is shot in, and
    // saying it here lets the rule go and pins the same box in Firefox and Safari.
    stepsInput: 'm-0 w-5 border-none bg-transparent p-0 text-center text-white outline-none [font:13.3333px_Arial]',
    hidden: layerSettingsClasses.hidden
}

const StepsDisplay = ({
    steps,
    user,
    round,
    selectedLayer,
    addStepsButtonRef,
    subtractStepsButtonRef,
}) => {
    const firebase = useContext(FirebaseContext)
    const dispatch = useDispatch()

    const onNumberOfStepsChange = (steps) => {
        const newSteps = changeLayerLength(selectedLayer, steps)
        dispatch({ type: SET_LAYER_STEPS, payload: { id: selectedLayer.id, steps: newSteps, user: user.id } })
        // Save what was just dispatched. Saving the stale `selectedLayer` object here used to write
        // the old steps back, so the new step count never reached Firestore.
        firebase.updateLayer(round.id, selectedLayer.id, { steps: newSteps }).catch(error => console.error('Could not save steps', error))
    }

    const increaseSteps = () => {
        if (steps < Limits.stepsPerLayer.max)
            onNumberOfStepsChange(steps + 1)
    }

    const decreaseSteps = () => {
        if (steps > Limits.stepsPerLayer.min)
            onNumberOfStepsChange(steps - 1)
    }
    return (
        <div className="border-b border-white/10 p-5">
            {/* gutterBottom is dropped on purpose: MUI put `margin-bottom: 0.35em` on an inline
                <span> inside a block parent, where it does nothing. */}
            <span id="step-count" className="text-[14px] leading-[1.66] tracking-[0.03333em]">Steps</span>
            <div className={classes.stepControls}>
                <Button type="button" variant="plain" size="icon-app" ref={subtractStepsButtonRef} aria-label="Fewer steps" onClick={decreaseSteps} className={cn(ICON_BUTTON, classes.stepButtons)}>
                    <img alt='' src={Minus} className="h-1 w-[14px]" />
                </Button>
                <div className={classes.stepCount}>
                    <input readOnly aria-label="Number of steps" className={classes.stepsInput} value={steps || 0} />
                </div>
                <Button type="button" variant="plain" size="icon-app" ref={addStepsButtonRef} aria-label="More steps" onClick={increaseSteps} className={cn(ICON_BUTTON, classes.stepButtons)}>
                    <img alt='' src={Plus} className="size-[14px]" />
                </Button>
            </div>
        </div>
    )
}

const LayerPopup = ({
    round,
    user,
    showLayerPopup,
    playUIRef,
    selectedLayer,
    addStepsButtonRef,
    subtractStepsButtonRef,
    offsetSliderRef,
    percentageButtonRef,
    msButtonRef,
}) => {
    return (
        <div id="layer-popup" data-test="layer-popup" data-open={String(showLayerPopup)} inert={!showLayerPopup} className={showLayerPopup ? classes.root : classes.hidden}>
            <div className="w-full">
                <StepsDisplay
                    addStepsButtonRef={addStepsButtonRef}
                    subtractStepsButtonRef={subtractStepsButtonRef}
                    steps={selectedLayer?.steps?.length}
                    user={user}
                    round={round}
                    selectedLayer={selectedLayer}
                />
            </div>
            <div className={classes.offsetSlider}>
                <LayerPercentOffset
                    percentageButtonRef={percentageButtonRef}
                    msButtonRef={msButtonRef}
                    horizontal={true}
                    offsetSliderRef={offsetSliderRef}
                    selectedLayer={selectedLayer}
                    roundId={round.id}
                    user={user}
                    playUIRef={playUIRef} />
            </div>
        </div>
    )
}

export default LayerPopup
