import React from 'react'
import Box from '@material-ui/core/Box'
import IconButton from '@material-ui/core/IconButton'
import {
    PlusIcon,
    EqualiserIcon
} from './resources'
import { Typography } from '@material-ui/core'

export default function HamburgerPopup({
    classes,
    user,
    userColors,
    showMixerPopup,
    showHamburgerPopup,
    addLayerButtonRef,
    mixerPopupButtonRef,
    toggleShowMixerPopup,
    onAddLayerClick
}) {
    return (
        <Box className={showHamburgerPopup ? classes.hamburgerPopup : classes.hidden}>
            <IconButton
                ref={addLayerButtonRef}
                onClick={onAddLayerClick}
                className={classes.buttonWithText}
            >
                <Typography className={classes.buttonText}>Add round</Typography>
                <PlusIcon width={16} height={16} user={user} userColors={userColors} />
            </IconButton>
            <IconButton
                ref={mixerPopupButtonRef}
                onClick={toggleShowMixerPopup}
                className={classes.buttonWithText}
                style={{
                    backgroundColor: showMixerPopup ? 'rgba(255, 255, 255, 0.2)' : ''
                }}
            >
                <Typography className={classes.buttonText}>Mixer</Typography>
                <EqualiserIcon width={12} height={16} user={user} userColors={userColors} />
            </IconButton>
        </Box>
    )
}
