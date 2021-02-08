import React, { useCallback, useContext } from 'react';
import { connect } from "react-redux";
import Slider from '@material-ui/core/Slider';
import { withStyles } from '@material-ui/core/styles';
import AudioEngine from '../../audio-engine/AudioEngine'
import { setRoundSwing } from '../../redux/actions';
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
function SwingSlider ({ round, setRoundSwing }) {
    const firebase = useContext(FirebaseContext);
    const [value, setValue] = React.useState(round.swing);
    const updateSwingState = (swing) => {
        setRoundSwing(swing)
        firebase.updateRound(round.id, { swing })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    const updateSwingStateThrottled = useCallback(_.throttle(function (swing) {
        updateSwingState(swing)
    }, 2000), []);

    const handleChange = (event, swing) => {
        setValue(swing);
        AudioEngine.setSwing(swing)
        updateSwingStateThrottled(swing)
    };

    function valuetext (value) {
        return `${value}%`;
    }
    return (
        <div style={{ padding: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ marginRight: '1rem' }}>Swing</div>
            <StyledSlider
                value={value}
                onChange={handleChange}
                valueLabelFormat={valuetext}
                valueLabelDisplay="on"
                aria-labelledby="continuous-slider"
                min={0}
                max={100}
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
        setRoundSwing
    }
)(SwingSlider);