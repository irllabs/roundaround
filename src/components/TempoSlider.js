import React, { useCallback, useContext } from 'react';
import { connect } from "react-redux";
import Slider from '@material-ui/core/Slider';
import { withStyles } from '@material-ui/core/styles';
import AudioEngine from '../audio-engine/AudioEngine'
import { setRoundBpm } from '../redux/actions';
import { FirebaseContext } from '../firebase';
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
function TempoSlider ({ round, setRoundBpm }) {
    const firebase = useContext(FirebaseContext);
    const [value, setValue] = React.useState(round.bpm);
    const updateTempoState = (bpm) => {
        setRoundBpm(bpm)
        firebase.updateRound(round.id, { bpm })
    }
    const updateTempoStateThrottled = useCallback(_.throttle(function (bpm) {
        updateTempoState(bpm)
    }, 2000), []);

    const handleChange = (event, bpm) => {
        setValue(bpm);
        AudioEngine.setTempo(bpm)
        updateTempoStateThrottled(bpm)
    };

    function valuetext (value) {
        return `${value}BPM`;
    }
    return (
        <div style={{ padding: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ marginRight: '1rem' }}>Tempo</div>
            <StyledSlider
                value={value}
                onChange={handleChange}
                getAriaValueText={valuetext}
                valueLabelDisplay="on"
                aria-labelledby="continuous-slider"
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