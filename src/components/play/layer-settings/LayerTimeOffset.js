import React, { useState, useCallback, useEffect, useContext } from 'react'
import { useDispatch } from "react-redux";
import Typography from '@material-ui/core/Typography';
import Slider from '@material-ui/core/Slider';
import FormControl from '@material-ui/core/FormControl';
import Box from '@material-ui/core/Box';
import { makeStyles } from '@material-ui/core/styles';
import { FirebaseContext } from '../../../firebase';
import _ from 'lodash'
import { SET_LAYER_TIME_OFFSET } from '../../../redux/actionTypes'


const useStyles = makeStyles((theme) => ({
    root: {
        width: '100%'
    },
    formControl: {
        margin: theme.spacing(1),
        minWidth: 188,
        [theme.breakpoints.down('sm')]: {
            minWidth: 100
        },
    },
    selectEmpty: {
        marginTop: theme.spacing(2),
    },
}));

export default function LayerTimeOffset({ selectedLayer, user, roundId, playUIRef }) {
    const dispatch = useDispatch();
    const classes = useStyles();
    const firebase = useContext(FirebaseContext);
    const [sliderValue, setSliderValue] = useState(selectedLayer.timeOffset || 0)

    const updateLayerTimeOffsetState = (ms, selectedLayerId) => {
        dispatch({ type: SET_LAYER_TIME_OFFSET, payload: { id: selectedLayerId, value: ms } })
        firebase.updateLayer(roundId, selectedLayer.id, { timeOffset: ms })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    const updateLayerTimeOffsetStateThrottled = useCallback(_.throttle(function (ms, selectedLayerId) {
        updateLayerTimeOffsetState(ms, selectedLayerId)
    }, 1000), []);

    const onSliderChange = (e, ms) => {
        setSliderValue(ms)
        updateLayerTimeOffsetStateThrottled(ms, selectedLayer.id)
        // Update UI directly for performance reasons (instead of going via redux)
        playUIRef.adjustLayerOffset(selectedLayer.id, selectedLayer.percentOffset, ms)
    }

    useEffect(() => {
        setSliderValue(selectedLayer.timeOffset || 0)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedLayer.id])
    return (
        <Box className={classes.root} display="flex" flexDirection="column">
            <FormControl className={classes.formControl}>
                <Typography id="continuous-slider" variant="caption" gutterBottom>
                    Time Offset (ms)
                </Typography>
                <Slider value={sliderValue} min={-50} max={50} valueLabelDisplay="auto" onChange={onSliderChange} aria-labelledby="continuous-slider" />
            </FormControl>
        </Box>
    )
}
