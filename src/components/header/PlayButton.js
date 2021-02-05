import React, { useContext } from 'react'
import { connect } from "react-redux";
import IconButton from '@material-ui/core/IconButton';
import PlayIcon from '@material-ui/icons/PlayArrowOutlined';
import PauseIcon from '@material-ui/icons/PauseOutlined';
import { makeStyles } from '@material-ui/core/styles';
import AudioEngine from '../../audio-engine/AudioEngine'
import { setIsPlaying, } from '../../redux/actions'
import _ from 'lodash'
import { FirebaseContext } from '../../firebase';


const playButtonStyles = makeStyles(function (theme) {
    // console.log('creating play button styles', theme)
    return {
        root: {
            backgroundColor: theme.palette.secondary.main,
            marginRight: '1rem'
        }
    }
})


function PlayButton ({ isPlaying, setIsPlaying, roundId }) {
    const firebase = useContext(FirebaseContext);
    const onPlayClick = () => {
        if (isPlaying) {
            AudioEngine.stop()
            setIsPlaying(false)
            firebase.updateRound(roundId, { isPlaying: false })

        } else {
            AudioEngine.play()
            setIsPlaying(true)
            firebase.updateRound(roundId, { isPlaying: true })
        }
    }
    const classes = playButtonStyles();
    return (
        <IconButton className={classes.root} onClick={onPlayClick} >
            {
                !isPlaying &&
                <PlayIcon />
            }
            {
                isPlaying &&
                <PauseIcon />
            }


        </IconButton>
    )
}
const mapStateToProps = state => {
    return {
        isPlaying: !_.isNil(state.round) && state.round.isPlaying ? true : false,
        roundId: !_.isNil(state.round) ? state.round.id : null
    };
};

export default connect(
    mapStateToProps,
    {
        setIsPlaying
    }
)(PlayButton);