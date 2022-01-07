import React from 'react'
import Box from '@material-ui/core/Box'
import IconButton from '@material-ui/core/IconButton'
import {
    ErasorIcon,
    TrashIcon
} from './resources'
import { Typography } from '@material-ui/core'

export default function DeleteClearPopup({
    classes,
    onClearStepsClick,
    showDeleteClearPopup,
    onDeleteLayerClick
}) {
    return (
        <Box className={showDeleteClearPopup ? classes.deleteClearPopup : classes.hidden}>
            <IconButton
                onClick={onClearStepsClick}
                className={classes.buttonWithText}>
                <Typography className={classes.buttonText}>Clear</Typography>
                <ErasorIcon />
            </IconButton>
            <IconButton
                onClick={onDeleteLayerClick}
                className={classes.buttonWithText}
            >
                <Typography className={classes.buttonText}>Delete</Typography>
                <TrashIcon />
            </IconButton>
        </Box>
    )
}
