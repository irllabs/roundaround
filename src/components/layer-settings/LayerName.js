import React, { useState, useCallback, useEffect } from 'react'
import TextField from '@material-ui/core/TextField';
import _ from 'lodash'
import { connect, ReactReduxContext, Provider, useDispatch } from "react-redux";
import { SET_LAYER_NAME, SET_DISABLE_KEY_LISTENER } from '../../redux/actionTypes'

export default function LayerName ({ selectedLayer, user }) {
    const dispatch = useDispatch();
    const [textValue, setTextValue] = useState(selectedLayer.name)
    const updateLayerNameState = (name, selectedLayerId) => {
        dispatch({ type: SET_LAYER_NAME, payload: { id: selectedLayerId, name, user: user.id } })
    }
    const updateLayerNameStateThrottled = useCallback(_.throttle(function (name, selectedLayerId) {
        updateLayerNameState(name, selectedLayerId)
    }, 1000), []);
    const onTextChange = (e) => {
        setTextValue(e.target.value)
        updateLayerNameStateThrottled(e.target.value, selectedLayer.id)
    }
    const onFocus = (e) => {
        dispatch({ type: SET_DISABLE_KEY_LISTENER, payload: { value: true } })
    }
    const onLoseFocus = (e) => {
        dispatch({ type: SET_DISABLE_KEY_LISTENER, payload: { value: false } })
    }

    useEffect(() => {
        //console.log('selectedLayer.id changed', selectedLayer.id, selectedLayer.instrument.gain);
        setTextValue(selectedLayer.name)
    }, [selectedLayer.id])
    return (
        <div>
            <TextField id="standard-basic" value={textValue || ''} onChange={onTextChange} onFocus={onFocus} onBlur={onLoseFocus} />
        </div>
    )
}
