import React from 'react'
import { Box, Typography } from '@material-ui/core'
import { withStyles } from '@material-ui/core/styles'
import VolumeSlider from './VolumeSlider'
import IconButton from '@material-ui/core/IconButton'

const styles = theme => ({
    root: {
        position: 'absolute',
        display: "flex",
        flexDirection: "row",
        borderRadius: 8,
        width: 236,
        height: 64,
        right: -100,
        top: -60,
        justifyContent: "flex-start",
        alignItems: "center",
        backgroundColor: '#333333',
        transition: 'opacity 0.2s ease-in',
        boxShadow: '0px 0px 2px rgba(0, 0, 0, 0.15), 0px 4px 6px rgba(0, 0, 0, 0.15)',
        zIndex: 100,
        [theme.breakpoints.down('xs')]: {
            right: -55,
        },
    },
    offsetSlider: {
        width: '100%',
        padding: 10,
    },
    stepCount: {
        padding: 10,
        borderRadius: 4,
        backgroundColor: 'rgba(255, 255, 255, 0.1)'
    },
    stepButtons: {
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        width: 30,
        height: 30
    },
    hidden: {
        opacity: 0,
        position: 'absolute',
        top: '200%',
        transition: 'opacity 0.2s ease-out'
    },
    stepControls: {
        display: 'flex',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 10
    },
    mixerButton: {
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        marginLeft: 8,
        marginRight: 8,
        height: 30,
        width: 30,
        [theme.breakpoints.down('sm')]: {
            width: 32,
            height: 32,
        },
    },
    containerSoloMute: {
        flex: 1,
        display: 'flex',
        marginLeft: 8,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between'
    },
    volumeSliderContainer: {
        flex: 2,
        marginLeft: 8,
        flexDirection: 'row',
        alignItems: 'center'
    },
})

const VolumePopup = ({
    classes,
    round,
    user,
    showVolumePopup,
    volumeSliderRef,
    muteRef,
    soloRef,
    selectedLayer,
    onMute,
    onSolo
}) => {
    return (
        <Box className={showVolumePopup ? classes.root : classes.hidden}>
            <Box className={classes.volumeSliderContainer}>
                <VolumeSlider
                    sliderRef={volumeSliderRef}
                    hideText={true}
                    selectedLayer={selectedLayer}
                    roundId={round.id}
                    user={user}
                />
            </Box>
            <Box className={classes.containerSoloMute}>
                <IconButton ref={soloRef} onClick={() => onSolo(selectedLayer)} className={classes.mixerButton}>
                    <Typography style={{ fontWeight: 'bold' }}>S</Typography>
                </IconButton>
                <IconButton ref={muteRef} onClick={() => onMute(selectedLayer)} className={classes.mixerButton}>
                    <Typography style={{ fontWeight: 'bold' }}>M</Typography>
                </IconButton>
            </Box>
        </Box>
    )
}

export default withStyles(styles)(VolumePopup)
