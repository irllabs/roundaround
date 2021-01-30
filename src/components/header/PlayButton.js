import React from 'react'
import IconButton from '@material-ui/core/IconButton';
import PlayIcon from '@material-ui/icons/PlayArrowOutlined';
import PauseIcon from '@material-ui/icons/PauseOutlined';
import { makeStyles } from '@material-ui/core/styles';

/*const playButtonStyles = makeStyles(theme => ({
    root: {
        backgroundColor: theme.palette.primary.main
    }
}))*/

const playButtonStyles = makeStyles(function (theme) {
    console.log('creating play button styles', theme)
    return {
        root: {
            backgroundColor: theme.palette.secondary.main,
            marginRight: '1rem'
        }
    }
})


export default function PlayButton ({ onPlayClick, isPlaying }) {
    const classes = playButtonStyles();
    return (
        <IconButton className={classes.root} onClick={onPlayClick} >
            {
                !isPlaying &&
                <PlayIcon />
            }
            {
                isPlaying &&
                <PauseIcon />
            }


        </IconButton>
    )
}
