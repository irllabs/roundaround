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
            <Box
                style={{
                    display: 'flex',
                    flexDirection: 'row',
                    width: '100%',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                }}
            >
                <Typography style={{ lineHeight: 1, padding: '0 16px', fontSize: 16 }}>Add round</Typography>
                <IconButton
                    ref={addLayerButtonRef}
                    onClick={onAddLayerClick}
                    className={classes.iconButtons}
                >
                    <PlusIcon width={16} height={16} user={user} userColors={userColors} />
                </IconButton>
            </Box>
            <Box
                style={{
                    display: 'flex',
                    flexDirection: 'row',
                    width: '100%',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                }}
            >
                <Typography style={{ lineHeight: 1, padding: '0 16px', fontSize: 16 }}>Mixer</Typography>
                <IconButton
                    style={showMixerPopup ? { backgroundColor: 'rgba(255, 255, 255, 0.2)' } : {}}
                    ref={mixerPopupButtonRef}
                    className={classes.iconButtons}
                    onClick={toggleShowMixerPopup}
                >
                    <EqualiserIcon width={12} height={16} user={user} userColors={userColors} />
                </IconButton>
            </Box>
        </Box>
    )
}
