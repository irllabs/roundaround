import React from 'react'
import VolumeSlider from './VolumeSlider'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { layerSettingsClasses, ICON_BUTTON, POPUP_SURFACE } from './styles'

/**
 * What withStyles used to hand this popup, as Tailwind class strings. `down('xs')` and
 * `down('sm')` mean "below the next breakpoint", which this theme puts at 500 and 900. The
 * four step-counter rules the JSS carried were copy-paste from LayerPopup and never referenced,
 * so they are gone; `hidden` is the shared one.
 */
const classes = {
    root: POPUP_SURFACE + ' -top-[60px] right-[-100px] flex h-16 w-[236px] flex-row items-center justify-start max-sm:right-[-55px]',
    mixerButton: 'mx-2 flex size-[30px] flex-row items-center justify-center rounded-full bg-white/10 p-0 max-md:size-8',
    containerSoloMute: 'ml-2 flex flex-1 flex-row items-center justify-between',
    // The rule sets no display, so its flexDirection and alignItems never applied.
    volumeSliderContainer: 'ml-2 [flex:2]',
    hidden: layerSettingsClasses.hidden
}

const VolumePopup = ({
    round,
    user,
    showVolumePopup,
    volumeSliderRef,
    muteRef,
    soloRef,
    selectedLayer,
    onMute,
    onSolo,
    isSoloed
}) => {
    return (
        <div id="volume-popup" data-test="volume-popup" data-open={String(showVolumePopup)} inert={!showVolumePopup} className={showVolumePopup ? classes.root : classes.hidden}>
            <div className={classes.volumeSliderContainer}>
                <VolumeSlider
                    sliderRef={volumeSliderRef}
                    hideText={true}
                    selectedLayer={selectedLayer}
                    roundId={round.id}
                    user={user}
                />
            </div>
            <div className={classes.containerSoloMute}>
                <Button
                    type="button"
                    variant="plain"
                    size="icon-app"
                    ref={soloRef}
                    aria-label="Solo (only you hear this layer)"
                    aria-pressed={Boolean(isSoloed)}
                    onClick={() => onSolo(selectedLayer)}
                    className={cn(ICON_BUTTON, classes.mixerButton, isSoloed && 'bg-white/35')}
                >
                    <span className="text-base leading-6 font-bold tracking-[0.00938em]">S</span>
                </Button>
                <Button
                    type="button"
                    variant="plain"
                    size="icon-app"
                    ref={muteRef}
                    aria-label="Mute"
                    aria-pressed={Boolean(selectedLayer.isMuted)}
                    onClick={() => onMute(selectedLayer)}
                    className={cn(ICON_BUTTON, classes.mixerButton, selectedLayer.isMuted && 'bg-white/35')}
                >
                    <span className="text-base leading-6 font-bold tracking-[0.00938em]">M</span>
                </Button>
            </div>
        </div>
    )
}

export default VolumePopup
