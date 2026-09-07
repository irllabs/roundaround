import React, { useState, useEffect, useContext, useMemo, useRef } from 'react'
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

export default function VolumeSlider({ selectedLayer, sliderRef, user, roundId, hideText }) {
    const dispatch = useDispatch();
    const firebase = useContext(FirebaseContext);
    const [sliderValue, setSliderValue] = useState(80)
    const isDragging = useRef(false)

    // The throttled writer is created once, so it reads everything that can change through a ref
    // and takes the layer id as an argument. Before this it closed over the first layer ever
    // selected and saved later changes to that layer's document.
    const latest = useRef({})
    latest.current = { dispatch, firebase, roundId, userId: user ? user.id : null }

    const persistGain = useMemo(() => _.throttle((dB, layerId) => {
        const { dispatch, firebase, roundId, userId } = latest.current
        dispatch({ type: SET_LAYER_GAIN, payload: { id: layerId, value: dB, user: userId } })
        firebase.updateLayer(roundId, layerId, { gain: dB }).catch(error => console.error('Could not save volume', error))
    }, 500), [])

    useEffect(() => () => persistGain.cancel(), [persistGain])

    const onSliderChange = (e, percent) => {
        e.preventDefault()
        e.stopPropagation()
        isDragging.current = true
        setSliderValue(percent)
        const dB = convertPercentToDB(percent)
        const track = AudioEngine.tracksById[selectedLayer.id]
        if (!_.isNil(track)) {
            track.setVolume(dB)
        }
        persistGain(dB, selectedLayer.id)
    }

    const onSliderChangeCommitted = () => {
        isDragging.current = false
        persistGain.flush()
    }

    useEffect(() => {
        if (!isDragging.current) {
            setSliderValue(convertDBToPercent(selectedLayer.gain))
        }
    }, [selectedLayer.id, selectedLayer.gain])

    const classes = styles()
    return (
        <Box className={classes.root}>
            {!hideText && <Typography id={`volume-slider-${selectedLayer.id}`} variant="caption">Volume</Typography>}
            <Slider
                ref={sliderRef}
                className={classes.slider}
                orientation="horizontal"
                value={selectedLayer.isMuted ? 0 : Math.floor(sliderValue)}
                min={0}
                max={100}
                aria-label={hideText ? 'Volume' : undefined}
                aria-labelledby={hideText ? undefined : `volume-slider-${selectedLayer.id}`}
                valueLabelDisplay="auto"
                onChange={onSliderChange}
                onChangeCommitted={onSliderChangeCommitted}
            />
        </Box>
    )
}
