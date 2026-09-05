import React, { useContext, useEffect, useMemo, useRef } from 'react';
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
    const roundBpm = round ? round.bpm : 120
    const roundId = round ? round.id : null
    const [value, setValue] = React.useState(roundBpm);
    const isDragging = useRef(false)

    const latest = useRef({})
    latest.current = { setRoundBpm, firebase, roundId }

    const persistTempo = useMemo(() => _.throttle((bpm) => {
        const { setRoundBpm, firebase, roundId } = latest.current
        if (_.isNil(roundId)) return
        setRoundBpm(bpm)
        firebase.updateRound(roundId, { bpm }).catch(error => console.error('Could not save tempo', error))
    }, 1000), []);

    useEffect(() => () => persistTempo.cancel(), [persistTempo])

    // Follow tempo changes made by collaborators unless this user is mid-drag.
    useEffect(() => {
        if (!isDragging.current) {
            setValue(roundBpm)
        }
    }, [roundBpm])

    const handleChange = (event, bpm) => {
        isDragging.current = true
        setValue(bpm);
        AudioEngine.setTempo(bpm)
        persistTempo(bpm)
    };

    const handleChangeCommitted = () => {
        isDragging.current = false
        persistTempo.flush()
    }

    function valuetext(value) {
        return `${value}`;
    }
    return (
        <div style={{ padding: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div id="tempo-slider-label" style={{ marginRight: '1rem' }}>Tempo</div>
            <StyledSlider
                value={value}
                onChange={handleChange}
                onChangeCommitted={handleChangeCommitted}
                valueLabelFormat={valuetext}
                valueLabelDisplay="on"
                aria-labelledby="tempo-slider-label"
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