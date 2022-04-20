import React, { useState, useEffect } from 'react'
import { Box, Typography, IconButton } from '@material-ui/core'

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

    return (<Box className={showMixerPopup ? classes.mixerPopup : classes.hidden}>
        <Box className={classes.mixerPopupHeader}>
            <IconButton className={classes.plainButton} onClick={toggleShowMixerPopup}>
                <CloseIcon />
            </IconButton>
            <Typography className={classes.mixerPopupHeaderText}>Mixer</Typography>
        </Box>
        <Box className={classes.layerContainer}>
            {
                layers.map((layer, i) =>
                    <Box
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            onLayerSelect(layer.id)
                        }}
                        key={i}
                        className={classes.layerSubContainer}
                    >
                        <Box className={classes.layer} style={round && (round.layers.length - 1) === i ? { borderBottom: 'none' } : {}}>
                            <Box style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'center', flex: 4 }}>
                                <Box style={{ display: 'flex', flexDirection: 'row', justifyContent: 'flex-start', alignItems: 'center', paddingBottom: 5 }}>
                                    <Box style={{ marginRight: 5 }}>
                                        {instrumentIcon(layer?.instrument?.sampler)}
                                    </Box>
                                    <Typography style={{ textTransform: 'capitalize', display: 'flex', alignItems: 'flex-start', lineHeight: 1 }}>
                                        {layer.instrument?.sample}
                                    </Typography>
                                </Box>
                                <Box style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', width: 36, height: 20 }}>
                                    <Box style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginRight: 5 }}>
                                        {userColors && layer && layer.createdBy &&
                                            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                <circle cx="6" cy="6" r="5" stroke={userColors[layer.createdBy]} strokeWidth="2" />
                                            </svg>}
                                    </Box>
                                    <Typography className={classes.stepLength}>{layer.steps.length}</Typography>
                                </Box>
                            </Box>
                            <Box className={classes.volumeSliderContainer}>
                                {round && <VolumeSlider hideText={true} selectedLayer={layer} roundId={round.id} user={user} />}
                            </Box>
                            <Box className={classes.containerSoloMute}>
                                <IconButton onClick={() => onSoloClick(layer)} className={classes.mixerButton}>
                                    <Typography style={{ fontWeight: 'bold' }}>S</Typography>
                                </IconButton>
                                <IconButton onClick={() => onMuteClick(layer)} className={classes.mixerButton}>
                                    <Typography style={{ fontWeight: 'bold' }}>M</Typography>
                                </IconButton>
                            </Box>
                        </Box>
                    </Box>)
            }
        </Box>
    </Box>)
}

export default LayerListPopup 