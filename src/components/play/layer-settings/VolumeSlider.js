import React, { useState, useCallback, useEffect, useContext } from 'react'
import { useDispatch } from "react-redux";
import Slider from '@material-ui/core/Slider';
import _ from 'lodash'
import AudioEngine from '../../../audio-engine/AudioEngine'
import { convertPercentToDB, convertDBToPercent } from '../../../utils/index'
import { SET_LAYER_GAIN } from '../../../redux/actionTypes'
import { FirebaseContext } from '../../../firebase';
import { makeStyles } from '@material-ui/core/styles';
import { Typography } from '@material-ui/core';
import { Box } from '@material-ui/core';

const styles = makeStyles(function (theme) {
    return {
        root: {
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            width: '100%',
            padding: theme.spacing(1)
        },
        slider: {
            minWidth: 108,
            width: '100%'
        }
    }
})

export default function VolumeSlider({ selectedLayer, user, roundId, hideText }) {
    const dispatch = useDispatch();
    const firebase = useContext(FirebaseContext);
    const [sliderValue, setSliderValue] = useState(80)
    const updateVolumeState = (dB, selectedLayerId) => {
        dispatch({ type: SET_LAYER_GAIN, payload: { id: selectedLayerId, value: dB, user: user.id } })
        firebase.updateLayer(roundId, selectedLayer.id, { gain: dB })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    const updateVolumeStateThrottled = useCallback(_.throttle(function (dB, selectedLayerId) {
        updateVolumeState(dB, selectedLayerId)
    }, 2000), []);
    const onSliderChange = (e, percent) => {
        setSliderValue(percent)
        const dB = convertPercentToDB(percent)
        AudioEngine.tracksById[selectedLayer.id].setVolume(dB)
        updateVolumeStateThrottled(dB, selectedLayer.id)
    }

    useEffect(() => {
        setSliderValue(convertDBToPercent(selectedLayer.gain))
    }, [selectedLayer.id, selectedLayer.gain])

    const classes = styles()

    return (

        <Box className={classes.root}>
            {!hideText && <Typography variant="caption">Volume</Typography>}
            <Slider
                className={classes.slider}
                orientation="horizontal"
                value={Math.floor(sliderValue)}
                min={0}
                max={100}
                aria-labelledby="vertical-slider"
                //marks={verticalSliderMarks}
                valueLabelDisplay="auto"
                onChange={onSliderChange}
            />
        </Box>
    )
}
