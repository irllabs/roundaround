import React from 'react'
import { Box, Typography, IconButton } from '@material-ui/core'

import LayerIcon from './resources/svg/layer.svg'
import VolumeSlider from './VolumeSlider'


const MixerPopup = ({
    classes,
    showMixerPopup,
    instrumentIcon,
    onMuteClick,
    toggleShowMixerPopup,
    ref,
    user,
    round,
    Close
}) => (
    <Box className={showMixerPopup ? classes.mixerPopup : classes.hidden}>
        <Box className={classes.mixerPopupHeader}>
            <IconButton className={classes.plainButton} style={{ width: 16, height: 16 }} onClick={toggleShowMixerPopup}>
                <img alt='close popup' src={Close} />
            </IconButton>
            <Typography className={classes.mixerPopupHeaderText}>Mixer</Typography>
        </Box>
        <Box className={classes.layerContainer}>
            {
                round && round?.layers.map((layer, i) =>
                    <Box key={i} className={classes.layerSubContainer}>
                        <Box className={classes.layer} style={(round.layers.length - 1) === i ? { borderBottom: 'none' } : {}}>
                            <Box style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', flex: 4 }}>
                                <Box style={{ display: 'flex', flexDirection: 'row', justifyContent: 'flex-start', alignItems: 'center', paddingBottom: 5 }}>
                                    <Box style={{ marginRight: 5 }}>{instrumentIcon(layer?.instrument?.sampler)}</Box>
                                    <Typography style={{ textTransform: 'capitalize', display: 'flex', alignItems: 'flex-start', lineHeight: 1 }}>
                                        {layer.instrument?.sample}
                                    </Typography>
                                </Box>
                                <Box style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', width: 36, height: 20 }}>
                                    <Box style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginRight: 5 }}>
                                        <img style={{ width: 12, height: 12, }} alt='layer-small' src={LayerIcon} />
                                    </Box>
                                    <Typography className={classes.stepLength}>{layer.steps.length}</Typography>
                                </Box>
                            </Box>
                            <Box className={classes.volumeSliderContainer}>
                                <VolumeSlider hideText={true} selectedLayer={layer} roundId={round.id} user={user} />
                            </Box>
                            <Box className={classes.containerSoloMute}>
                                <IconButton className={classes.mixerButton}>
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
    </Box>
)

export default MixerPopup 