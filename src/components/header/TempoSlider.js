import React, { useCallback, useContext, useEffect } from 'react';
import { connect } from "react-redux";
import Slider from '@material-ui/core/Slider';
import { withStyles } from '@material-ui/core/styles';
import AudioEngine from '../../audio-engine/AudioEngine'
import { setRoundBpm } from '../../redux/actions';
import { FirebaseContext } from '../../firebase';
import _ from 'lodash'
const StyledSlider = withStyles({
    root: {
        color: '#ffffff',
        width: 300
    },
    thumb: {
        backgroundColor: '#fff',

    },
    active: {},
    valueLabel: {

    },
    track: {

    },
    rail: {

    },
})(Slider);
function TempoSlider({ round, setRoundBpm }) {
    const firebase = useContext(FirebaseContext);
    const [value, setValue] = React.useState(round ? round.bpm : 40);
    const updateTempoState = (bpm) => {
        setRoundBpm(bpm)
        firebase.updateRound(round.id, { bpm })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    const updateTempoStateThrottled = useCallback(_.throttle(function (bpm) {
        updateTempoState(bpm)
    }, 2000), []);

    const handleChange = (event, bpm) => {
        setValue(bpm);
        AudioEngine.setTempo(bpm)
        updateTempoStateThrottled(bpm)
    };

    useEffect(() => {
        if (round && round.bpm) {
            setValue(round.bpm)
        }
    }, [round])

    function valuetext(value) {
        return `${value}`;
    }
    return (
        <div style={{ padding: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ marginRight: '1rem' }}>Tempo: {value < 50 ? '' : value}</div>
            <StyledSlider
                value={value}
                onChange={handleChange}
                valueLabelFormat={valuetext}
                valueLabelDisplay="off"
                aria-labelledby="continuous-slider"
                className='tempo-slider'
                min={50}
                max={200}
            />
        </div>
    )
}
const mapStateToProps = state => {
    return {
        round: state.round
    };
};

export default connect(
    mapStateToProps,
    {
        setRoundBpm
    }
)(TempoSlider);