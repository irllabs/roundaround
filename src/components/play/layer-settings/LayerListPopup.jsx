import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { ICON_BUTTON } from './styles'

import VolumeSlider from './VolumeSlider'
import _ from 'lodash'
import { CloseIcon } from './resources'


const LayerListPopup = ({
    classes,
    showMixerPopup,
    height,
    selectedInstrument,
    instrumentIcon,
    onMuteClick,
    onSoloClick,
    toggleShowMixerPopup,
    onLayerSelect,
    ref,
    userColors,
    user,
    round
}) => {
    const [layers, setLayers] = useState([])

    useEffect(() => {
        if (round && round.layers) {
            const newLayers = _.orderBy(round.layers, 'createdAt')
            setLayers(newLayers)
        }
    }, [round])

    return (
        <div data-test="mixer-popup" data-open={String(showMixerPopup)} className={showMixerPopup ? classes.mixerPopup : classes.hidden}>
            <div className={classes.mixerPopupHeader}>
                <Button type="button" variant="plain" size="icon-app" aria-label="Close the mixer" className={cn(ICON_BUTTON, classes.plainButton)} onClick={toggleShowMixerPopup}>
                    <CloseIcon />
                </Button>
                <p className={classes.mixerPopupHeaderText}>Mixer</p>
            </div>
            <div className={classes.layerContainer}>
                {layers.map((layer, i) =>
                    <div
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); onLayerSelect(layer.id) }}
                        key={i}
                        className={classes.layerSubContainer}
                    >
                        <div className={cn(classes.layer, (round.layers.length - 1) === i && 'border-b-0')}>
                            <div className="flex [flex:4] flex-col items-start justify-center">
                                <div className="flex flex-row items-center justify-start pb-[5px]">
                                    <div className="mr-[5px]">{instrumentIcon(layer?.instrument?.sampler)}</div>
                                    <p className="m-0 flex items-start text-base font-normal leading-none tracking-[0.00938em] capitalize">{layer.instrument?.sample}</p>
                                </div>
                                <div className="flex h-5 w-9 flex-row items-center">
                                    <div className="mr-[5px] flex flex-row items-center justify-center">
                                        {userColors && layer && layer.createdBy &&
                                            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                <circle cx="6" cy="6" r="5" stroke={userColors[layer.createdBy]} strokeWidth="2" />
                                            </svg>}
                                    </div>
                                    <p className={classes.stepLength}>{layer.steps.length}</p>
                                </div>
                            </div>
                            <div className={classes.volumeSliderContainer}>
                                <VolumeSlider hideText={true} selectedLayer={layer} roundId={round.id} user={user} />
                            </div>
                            <div className={classes.containerSoloMute}>
                                <Button type="button" variant="plain" size="icon-app" aria-label={`Solo ${layer.instrument?.sample}`} className={cn(ICON_BUTTON, classes.mixerButton)} onClick={() => onSoloClick(layer)}>
                                    <span className="text-base leading-6 font-bold tracking-[0.00938em]">S</span>
                                </Button>
                                <Button type="button" variant="plain" size="icon-app" aria-label={`Mute ${layer.instrument?.sample}`} className={cn(ICON_BUTTON, classes.mixerButton)} onClick={() => onMuteClick(layer)}>
                                    <span className="text-base leading-6 font-bold tracking-[0.00938em]">M</span>
                                </Button>
                            </div>
                        </div>
                    </div>)
            }
            </div>
        </div>
    )
}

export default LayerListPopup
