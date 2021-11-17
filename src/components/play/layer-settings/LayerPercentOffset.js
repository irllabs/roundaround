import React, { useState, useCallback, useEffect, useContext } from 'react'
import { useDispatch } from "react-redux";
import Typography from '@material-ui/core/Typography';
import Slider from '@material-ui/core/Slider';
import FormControl from '@material-ui/core/FormControl';
import Box from '@material-ui/core/Box';
import { makeStyles } from '@material-ui/core/styles';
import { FirebaseContext } from '../../../firebase';
import _ from 'lodash'
import { SET_LAYER_PERCENT_OFFSET } from '../../../redux/actionTypes'
import Percentage from './resources/svg/percentage.svg'


const useStyles = makeStyles((theme) => ({
    root: {
        width: '100%',
    },
    formControl: {
        margin: theme.spacing(1),
        minWidth: 50,
        [theme.breakpoints.down('sm')]: {
            minWidth: 100
        },
    },
    offsetDisplay: {
        width: '80%',
        display: 'flex',
        flexDirection: 'row',
        justifyContent: 'space-between',
        border: 'thin solid rgba(255, 255, 255, 0.1)',
        alignItems: 'center',
        marginBottom: 15,
        padding: 10,
        borderRadius: 5,
    },
    percentageSect: {
        display: 'flex',
        flexDirection: 'row',
        backgroundColor: 'rgba(255,255,255,0.1)',
        padding: 5,
        borderRadius: 4
    },
    selectEmpty: {
        marginTop: theme.spacing(2),
    },
}));

export default function LayerPercentOffset({ selectedLayer, user, horizontal, roundId, playUIRef }) {
    const dispatch = useDispatch();
    const classes = useStyles();
    const firebase = useContext(FirebaseContext);
    const [sliderValue, setSliderValue] = useState(selectedLayer.percentOffset || 0)

    const updateLayerPercentOffsetState = (percent, selectedLayerId) => {
        dispatch({ type: SET_LAYER_PERCENT_OFFSET, payload: { id: selectedLayerId, value: percent } })
        firebase.updateLayer(roundId, selectedLayer.id, { percentOffset: percent })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    const updateLayerPercentOffsetStateThrottled = useCallback(_.throttle(function (percent, selectedLayerId) {
        updateLayerPercentOffsetState(percent, selectedLayerId)
    }, 1000), []);

    const onSliderChange = (e, percent) => {
        setSliderValue(percent)
        updateLayerPercentOffsetStateThrottled(percent, selectedLayer.id)
        // Update UI directly for performance reasons (instead of going via redux)
        playUIRef.adjustLayerOffset(selectedLayer.id, percent, selectedLayer.timeOffset)
    }

    useEffect(() => {
        setSliderValue(selectedLayer.percentOffset || 0)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedLayer.id])
    return (

        <Box className={classes.root} display="flex" flexDirection="column">
            <FormControl className={classes.formControl}>
                <Typography style={{ marginBottom: 10 }} id="continuous-slider" variant="caption" gutterBottom>
                    Time Offset
                </Typography>
                {horizontal &&
                    <Box className={classes.offsetDisplay}>
                        <Box className={classes.percentageSect}>
                            <Typography style={{ marginRight: 3 }}>{sliderValue}</Typography>
                            <img alt='percentage' src={Percentage} />
                        </Box>
                        <Typography style={{ fontWeight: '600' }}>ms</Typography>
                    </Box >
                }
                <Slider value={sliderValue} min={-100} max={100} valueLabelDisplay="off" onChange={onSliderChange} aria-labelledby="continuous-slider" />
            </FormControl >
        </Box >
    )
}
