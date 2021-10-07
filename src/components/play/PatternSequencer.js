import React, { Component } from 'react'
import { connect } from "react-redux";
import { Button } from '@material-ui/core';
import { withStyles } from '@material-ui/styles';
import Switch from '@material-ui/core/Switch';
import PropTypes from 'prop-types';
import Box from '@material-ui/core/Box';
import _ from 'lodash'
import { getDefaultUserPatternSequence } from '../../utils/defaultData'
import {
    setIsRecordingSequence, setUserPatternSequence, setIsPlayingSequence, setCurrentSequencePattern
} from "../../redux/actions";
import { FirebaseContext } from '../../firebase';
import SequenceIcon from '@material-ui/icons/DragIndicator';
import SequenceOffIcon from '@material-ui/icons/Lens';

const styles = theme => ({
    root: {
        display: 'flex',
        flexDirection: 'column'
    },
    seqContainer: {
        display: 'flex',
        flexDirection: 'row',
        width: '88px',
        flexWrap: 'wrap',
        justifyContent: 'center',
        marginTop: '0.25rem',
        marginBottom: '0.5rem'
    },
    seqItem: {
        border: 'solid 1px #555555',
        width: '16px',
        height: '16px',
        margin: '2px',
        borderRadius: '8px',
        fontSize: '8px',
        color: 'white',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center'
    },
    seqItemFilled: {
        background: '#555555'
    },
    seqItemHighlighted: {
        background: '#AAAAAA'
    },
    switchContainer: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
    },
    sequenceIcon: {
        color: '#555555',
        transform: 'rotate(90deg)'
    },
    sequenceOffIcon: {
        color: '#555555',
        fontSize: '8px'
    }
})

class PatternSequencer extends Component {
    static contextType = FirebaseContext;
    constructor (props) {
        super(props)
        this.onWriteClick = this.onWriteClick.bind(this)
        this.onPlayingSequenceToggle = this.onPlayingSequenceToggle.bind(this)
    }
    onWriteClick () {
        if (!this.props.display.isRecordingSequence) {
            // start write
            this.props.setUserPatternSequence(this.props.user.id, getDefaultUserPatternSequence())
            this.props.setIsPlayingSequence(this.props.user.id, false)
            this.props.setCurrentSequencePattern(0)
        } else {
            // finish write
            this.props.setIsPlayingSequence(this.props.user.id, true)
        }
        this.props.setIsRecordingSequence(!this.props.display.isRecordingSequence)
    }

    onPlayingSequenceToggle (event) {
        //   console.log('here 1');
        this.props.setCurrentSequencePattern(0)
        this.props.setIsPlayingSequence(this.props.user.id, event.target.checked)
        // console.log('here 2', this.props.round.userPatterns[this.props.user.id]);
        let userPatternsClone = _.cloneDeep(this.props.round.userPatterns[this.props.user.id])
        userPatternsClone.isPlayingSequence = event.target.checked
        this.context.saveUserPatterns(this.props.round.id, this.props.user.id, userPatternsClone)
        // console.log('here 3');
    }

    getPatternOrderDisplay (id) {
        let pattern = _.find(this.props.round.userPatterns[this.props.user.id].patterns, { id: id })
        return pattern.order + 1
    }

    render () {
        const { classes } = this.props;
        let items = []
        if (!_.isNil(this.props.round) && !_.isNil(this.props.round.userPatterns) && !_.isNil(this.props.round.userPatterns[this.props.user.id])) {
            let i = 0
            for (const id of this.props.round.userPatterns[this.props.user.id].sequence) {
                let item = {
                    id: id,
                    order: i,
                    isFilled: id !== false,
                    isHighlighted: i === this.props.display.currentSequencePattern
                }
                items.push(item)
                i++
            }
        }
        return (

            <Box className={classes.root}>
                <Box className={classes.seqContainer}>
                    {items.map((item, index) => (
                        <Box className={classes.seqItem + ' ' + (item.isFilled ? classes['seqItemFilled'] : '') + ' ' + (item.isHighlighted ? classes['seqItemHighlighted'] : '')} key={`item-${item.order}`}>
                            {item.isFilled ? this.getPatternOrderDisplay(item.id) : ''}
                        </Box>
                    ))}

                </Box>
                { (!_.isNil(this.props.user) && !_.isNil(this.props.round) && !_.isNil(this.props.round.userPatterns[this.props.user.id])) &&
                    <>

                        <Button size="small" variant="contained" color="secondary" disableElevation onClick={this.onWriteClick}>{this.props.display.isRecordingSequence ? 'Stop' : 'Write'}</Button>
                        <Box className={classes.switchContainer}>
                            <SequenceOffIcon className={classes.sequenceOffIcon} />
                            <Switch
                                checked={this.props.round.userPatterns[this.props.user.id].isPlayingSequence}
                                onChange={this.onPlayingSequenceToggle}
                                name="playingSequenceToggle"
                            />
                            <SequenceIcon className={classes.sequenceIcon} />
                        </Box>

                    </>
                }
            </Box>
        )
    }
}

PatternSequencer.propTypes = {
    classes: PropTypes.object.isRequired,
};

const mapStateToProps = state => {
    //console.log('mapStateToProps', state);
    return {
        round: state.round,
        user: state.user,
        display: state.display
    };
};


export default connect(
    mapStateToProps, {
    setIsRecordingSequence,
    setUserPatternSequence,
    setIsPlayingSequence,
    setCurrentSequencePattern
}
)(withStyles(styles)(PatternSequencer));