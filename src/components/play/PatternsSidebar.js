import React, { Component } from 'react'
import _ from 'lodash'
import { connect } from "react-redux"
import PropTypes from 'prop-types'
import { withStyles } from '@material-ui/styles'
import Box from '@material-ui/core/Box'
import { PRESET_LETTERS } from '../../utils/constants'
import PatternThumbControl from './PatternThumbControl'
import { FirebaseContext } from '../../firebase'
import {
    saveUserPattern,
    setLayerSteps,
    updateLayer,
    updateLayers,
    setUserPatternSequence,
    setIsRecordingSequence,
    setIsPlayingSequence,
    setCurrentSequencePattern
} from "../../redux/actions";
import ChevronLeftIcon from '@material-ui/icons/ChevronLeft';
import PatternSequencer from './PatternSequencer';

const styles = theme => ({
    root: {
        width: '120px',
        height: 'calc(100% - 64px)',
        position: 'absolute',
        left: '0',
        top: '64px',
        borderTop: 'solid 1px rgba(255,255,255,0.1)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-end',
        paddingBottom: '0.5rem',
        backgroundColor: 'rgba(47,47,47,0.9)',
        transition: 'left 0.4s',
    },
    isMinimized: {
        left: '-120px'
    },
    minimizeButton: {
        backgroundColor: 'rgba(47,47,47,0.9)',
        width: '32px',
        height: '32px',
        position: 'absolute',
        right: '-40px',
        bottom: '16px',
        borderRadius: 8,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'transform 0.4s',
        cursor: 'pointer'
    },
    minimizeButtonIsMinimized: {
        transform: 'rotateY(180deg)'
    }
})

class PatternsSidebar extends Component {
    static contextType = FirebaseContext;
    constructor(props) {
        super(props)
        this.state = {
            selectedPattern: null,
            isMinimized: false
        }
        this.selectedPatternNeedsSaving = false
        this.onLoadPattern = this.onLoadPattern.bind(this)
        this.onSavePattern = this.onSavePattern.bind(this)
        this.onMinimizeClick = this.onMinimizeClick.bind(this)
    }

    async onLoadPattern(id) {
        if (!this.props.display.isRecordingSequence) {
            const pattern = _.find(this.props.round.userPatterns[this.props.user.id].patterns, { id })
            if (!_.isEmpty(pattern.state)) {
                this.setState({ selectedPattern: pattern.id, selectedPatternNeedsSaving: false })

                // check if we have layers in the round not referenced in the pattern then set all steps in that layer to off
                for (const existingLayer of this.props.round.layers) {
                    if (_.isNil(_.find(pattern.state.layers, { id: existingLayer.id })) && existingLayer.createdBy === this.props.user.id) {
                        let existingLayerClone = _.cloneDeep(existingLayer)
                        for (const step of existingLayerClone.steps) {
                            step.isOn = false
                        }
                        pattern.state.layers.push(existingLayerClone)
                    }
                }

                // save to store first so UI updates straight away
                /*for (const layer of pattern.state.layers) {
                    const layerExists = _.find(this.props.round.layers, { id: layer.id })
                    if (!_.isNil(layerExists)) {
                        //  console.log('changing layer state', layer.id, layer);
                        //this.props.setLayerSteps(layer.id, layer.steps)
                        this.props.updateLayer(layer.id, layer)
                    }
                }*/

                // check we haven't deleted the layer that is referenced in the pattern
                let layersToDelete = []
                for (const layer of pattern.state.layers) {
                    const layerExists = _.find(this.props.round.layers, { id: layer.id })
                    if (_.isNil(layerExists)) {
                        layersToDelete.push(layer)
                    }
                }
                _.remove(pattern.state.layers, function (n) {
                    return layersToDelete.indexOf(n) > -1
                })

                // make sure layers are ordered the same
                let orderedLayers = []

                // this.props.updateLayers(pattern.state.layers)
                for (const layer of pattern.state.layers) {
                    let index = _.findIndex(this.props.round.layers, { id: layer.id })
                    orderedLayers[index] = layer
                }
                this.props.updateLayers(orderedLayers)

                // now save to firebase
                for (const layer of pattern.state.layers) {
                    // todo handle edge cases - eg layer been deleted
                    const layerExists = _.find(this.props.round.layers, { id: layer.id })
                    if (!_.isNil(layerExists)) {
                        this.context.updateLayer(this.props.round.id, layer.id, layer)
                    }
                }
            }
        } else {
            let seq = _.cloneDeep(this.props.round.userPatterns[this.props.user.id].sequence)
            let firstAvailbleSlot = _.findIndex(seq, function (n) {
                return n === false
            })
            if (firstAvailbleSlot > -1) {
                seq[firstAvailbleSlot] = id
                this.props.setUserPatternSequence(this.props.user.id, seq)
                this.context.saveUserPatterns(this.props.round.id, this.props.user.id, this.props.round.userPatterns[this.props.user.id])
            } else {
                this.props.setIsRecordingSequence(false)
            }
            if (firstAvailbleSlot === seq.length - 1) {
                this.props.setIsRecordingSequence(false)
                this.props.setIsPlayingSequence(this.props.user.id, true)
            }
        }
    }
    onSavePattern(id) {
        // save all steps for this user
        this.setState({ selectedPattern: id, selectedPatternNeedsSaving: false })
        const state = this.getCurrentState(this.props.user.id)
        this.props.saveUserPattern(this.props.user.id, id, state)
        this.context.saveUserPatterns(this.props.round.id, this.props.user.id, this.props.round.userPatterns[this.props.user.id])
    }
    onMinimizeClick() {
        this.setState({ isMinimized: !this.state.isMinimized })
    }

    getCurrentState(userId) {
        const userLayers = _.filter(this.props.round.layers, { createdBy: userId })
        let state = {}
        state.layers = []
        for (const layer of userLayers) {
            let stateLayer = {
                id: layer.id,
                steps: layer.steps,
                gain: layer.gain,
                isMuted: layer.isMuted,
                timeOffset: layer.timeOffset,
                percentOffset: layer.percentOffset
            }
            state.layers.push(stateLayer)
        }
        return state
    }

    render() {
        const { classes, user } = this.props;
        let selectedPatternNeedsSaving = false;
        if (!_.isNil(this.state.selectedPattern) && !_.isNil(this.props.round)) {
            const pattern = _.find(this.props.round.userPatterns[this.props.user.id].patterns, { id: this.state.selectedPattern })
            for (const layer of this.props.round.layers) {
                const patternLayer = _.find(pattern.state.layers, { id: layer.id })
                if (!_.isNil(patternLayer)) {
                    if (!_.isEqual(layer.steps, patternLayer.steps)) {
                        selectedPatternNeedsSaving = true
                    }
                }
            }
        }
        let items = []
        if (!_.isNil(this.props.round) && !_.isNil(this.props.round.userPatterns) && !_.isNil(this.props.round.userPatterns[this.props.user.id])) {
            for (const pattern of this.props.round.userPatterns[this.props.user.id].patterns) {
                let item = {
                    id: pattern.id,
                    label: PRESET_LETTERS[pattern.order],
                    color: user.color,
                    userId: this.props.user.id,
                    isFilled: !_.isEmpty(pattern.state)
                }
                items.push(item)
            }
        }
        const isMinimizedClass = this.state.isMinimized ? classes.isMinimized : '';
        const buttonIsMinimizedClass = this.state.isMinimized ? classes.minimizeButtonIsMinimized : '';
        return (
            <Box className={classes.root + ' ' + isMinimizedClass}>
                <div className={classes.patternsContainer}>
                    {items.map((item, index) => (
                        <PatternThumbControl key={`item-${item.id}`} id={item.id} color={item.color} label={item.label} isFilled={item.isFilled} isSelected={item.id === this.state.selectedPattern} needsSaving={selectedPatternNeedsSaving} loadPattern={this.onLoadPattern} savePattern={this.onSavePattern} />
                    ))}
                    <PatternSequencer />
                </div>
                <Box className={classes.minimizeButton + ' ' + buttonIsMinimizedClass} onClick={this.onMinimizeClick}><ChevronLeftIcon size="small" /></Box>
            </Box>
        )
    }
}
PatternsSidebar.propTypes = {
    classes: PropTypes.object.isRequired,
};

const mapStateToProps = state => {
    return {
        round: state.round,
        user: state.user,
        collaboration: state.collaboration,
        selectedLayer: state.display.selectedLayer,
        display: state.display
    };
};


export default connect(
    mapStateToProps, {
    saveUserPattern,
    setLayerSteps,
    updateLayer,
    updateLayers,
    setUserPatternSequence,
    setIsRecordingSequence,
    setIsPlayingSequence,
    setCurrentSequencePattern
}
)(withStyles(styles)(PatternsSidebar));