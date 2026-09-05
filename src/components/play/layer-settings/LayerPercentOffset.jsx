import React, { useState, useEffect, useContext, useMemo, useRef } from 'react'
import { useDispatch } from "react-redux";
import Typography from '@material-ui/core/Typography';
import Slider from '@material-ui/core/Slider';
import FormControl from '@material-ui/core/FormControl';
import Box from '@material-ui/core/Box';
import { makeStyles } from '@material-ui/core/styles';
import { FirebaseContext } from '../../../firebase';
import _ from 'lodash'
import {
    SET_LAYER_PERCENT_OFFSET,
    SET_LAYER_TIME_OFFSET
} from '../../../redux/actionTypes'
import Percentage from './resources/svg/percentage.svg'
import { IconButton } from '@material-ui/core';


const useStyles = makeStyles((theme) => ({
    root: {
        width: '100%',
        margin: '0 0 20px 0'
    },
    formControl: {
        margin: theme.spacing(1),
        minWidth: 50,
        [theme.breakpoints.down('sm')]: {
            minWidth: 100
        },
    },
    offsetDisplay: {
        width: 88,
        height: 48,
        display: 'flex',
        flexDirection: 'row',
        justifyContent: 'space-between',
        border: 'thin solid rgba(255, 255, 255, 0.1)',
        alignItems: 'center',
        marginBottom: 15,
        padding: 10,
        borderRadius: 5,
    },
    switchButton: {
        display: 'flex',
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        height: 32,
        width: 32,
        padding: 5,
        borderRadius: 4,
        '&:active': {
            backgroundColor: 'rgba(255,255,255,0.1)',
        }
    },
    selectEmpty: {
        marginTop: theme.spacing(2),
    },
}));

export default function LayerPercentOffset({
    selectedLayer,
    user,
    horizontal,
    roundId,
    playUIRef,
    offsetSliderRef,
    percentageButtonRef,
    msButtonRef,
}) {
    const dispatch = useDispatch();
    const classes = useStyles();
    const firebase = useContext(FirebaseContext);
    const [sliderValue, setSliderValue] = useState(selectedLayer.percentOffset || 0)
    const [type, updateType] = useState('perc')
    const isDragging = useRef(false)

    // Created once; reads changing values through a ref and takes the layer id as an argument so
    // it can never write to a previously selected layer.
    const latest = useRef({})
    latest.current = { dispatch, firebase, roundId }

    const persistOffset = useMemo(() => _.throttle((offsetType, value, layerId) => {
        const { dispatch, firebase, roundId } = latest.current
        if (offsetType === 'perc') {
            dispatch({ type: SET_LAYER_PERCENT_OFFSET, payload: { id: layerId, value } })
            firebase.updateLayer(roundId, layerId, { percentOffset: value }).catch(error => console.error('Could not save offset', error))
        } else {
            dispatch({ type: SET_LAYER_TIME_OFFSET, payload: { id: layerId, value } })
            firebase.updateLayer(roundId, layerId, { timeOffset: value }).catch(error => console.error('Could not save offset', error))
        }
    }, 500), [])

    useEffect(() => () => persistOffset.cancel(), [persistOffset])

    // Follow the layer's stored value when the layer or the mode changes, or when the value
    // changes underneath us (loading a preset), but never while the user is dragging.
    useEffect(() => {
        if (isDragging.current) {
            return
        }
        setSliderValue((type === 'perc' ? selectedLayer.percentOffset : selectedLayer.timeOffset) || 0)
    }, [type, selectedLayer.id, selectedLayer.percentOffset, selectedLayer.timeOffset])

    const _onChange = (e, value) => {
        isDragging.current = true
        setSliderValue(value)
        persistOffset(type, value, selectedLayer.id)
        // Update UI directly for performance reasons (instead of going via redux)
        if (playUIRef && playUIRef.adjustLayerOffset) {
            if (type === 'perc') {
                playUIRef.adjustLayerOffset(selectedLayer.id, value, selectedLayer.timeOffset)
            } else {
                playUIRef.adjustLayerOffset(selectedLayer.id, selectedLayer.percentOffset, value)
            }
        }
    }

    const _onChangeCommitted = () => {
        isDragging.current = false
        persistOffset.flush()
    }

    return (
        <Box className={classes.root} display="flex" flexDirection="column">
            <FormControl className={classes.formControl}>
                <Typography style={{ marginBottom: 5, fontSize: 14 }} id="layer-offset-label" variant="caption" gutterBottom>
                    Time Offset
                </Typography>
                {horizontal &&
                    <Box className={classes.offsetDisplay}>
                        <IconButton ref={percentageButtonRef} aria-label="Offset as a percentage of a step" aria-pressed={type === 'perc'} onClick={() => updateType('perc')} className={classes.switchButton} style={type === 'perc' ? { backgroundColor: 'rgba(255,255,255,0.1)', } : {}}>
                            <img style={{ width: 13, height: 18 }} alt='percentage' src={Percentage} />
                        </IconButton>
                        <IconButton ref={msButtonRef} aria-label="Offset in milliseconds" aria-pressed={type === 'ms'} onClick={() => updateType('ms')} className={classes.switchButton} style={type === 'ms' ? { backgroundColor: 'rgba(255,255,255,0.1)' } : {}}>
                            <Typography style={{ fontWeight: '600', lineHeight: 1.5 }}>ms</Typography>
                        </IconButton>
                    </Box >
                }
                <Slider ref={offsetSliderRef} value={sliderValue} min={-100} max={100} valueLabelDisplay="off" onChange={_onChange} onChangeCommitted={_onChangeCommitted} aria-labelledby="layer-offset-label" />
            </FormControl >
        </Box >
    )
}
