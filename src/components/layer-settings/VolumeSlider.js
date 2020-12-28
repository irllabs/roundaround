import React, { useState, useCallback, useEffect } from 'react'
import { connect, ReactReduxContext, Provider, useDispatch } from "react-redux";
import Slider from '@material-ui/core/Slider';
import _ from 'lodash'
import styles from './LayerSettings.scss'
import AudioEngine from '../../audio-engine/AudioEngine'
import { convertPercentToDB, convertDBToPercent, numberRange } from '../../utils/index'
import { updateLayerInstrument } from '../../redux/actions'
import { SET_LAYER_NAME, SET_LAYER_GAIN } from '../../redux/actionTypes'

export default function VolumeSlider ({ selectedLayer, user }) {
    const dispatch = useDispatch();
    const [sliderValue, setSliderValue] = useState(80)
    const updateVolumeState = (dB, selectedLayerId) => {
        dispatch({ type: SET_LAYER_GAIN, payload: { id: selectedLayerId, value: dB, user: user.id } })
    }
    const updateVolumeStateThrottled = useCallback(_.throttle(function (dB, selectedLayerId) {
        updateVolumeState(dB, selectedLayerId)
    }, 1000), []);
    const onSliderChange = (e, percent) => {
        setSliderValue(percent)
        const dB = convertPercentToDB(percent)
        AudioEngine.tracksById[selectedLayer.id].setVolume(dB)
        updateVolumeStateThrottled(dB, selectedLayer.id)
    }

    useEffect(() => {
        //console.log('selectedLayer.id changed', selectedLayer.id, selectedLayer.instrument.gain);
        setSliderValue(convertDBToPercent(selectedLayer.instrument.gain))
    }, [selectedLayer.id])

    const verticalSliderMarks = [
        {
            value: 100,
            label: '+6',
        },
        {
            value: 80,
            label: '0',
        },
        {
            value: 60,
            label: '-6',
        },
        {
            value: 51,
            label: '-12',
        },

        {
            value: 34,
            label: '-24',
        },
        {
            value: 17,
            label: '-36',
        },
        {
            value: 0,
            label: '-48',
        }
    ];
    //console.log('rendering volume slider', selectedLayer.id);
    return (

        <div className={`${styles.layerSettingsVolumeSlider}`}>
            <Slider
                orientation="vertical"
                value={sliderValue}
                min={0}
                max={100}
                aria-labelledby="vertical-slider"
                marks={verticalSliderMarks}
                onChange={onSliderChange}
            />
        </div>
    )
}
