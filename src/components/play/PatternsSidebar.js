import React, { Component } from 'react'
import _ from 'lodash'
import { connect } from "react-redux";
import PropTypes from 'prop-types';
import { withStyles } from '@material-ui/styles';
import Box from '@material-ui/core/Box';
import PatternThumbControl from './PatternThumbControl'
import { FirebaseContext } from '../../firebase';
import {
    saveUserPattern,
    setLayerSteps,
    updateLayer,
    updateLayers
} from "../../redux/actions";
import ChevronLeftIcon from '@material-ui/icons/ChevronLeft';

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
        borderRadius: '16px',
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
    constructor (props) {
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
    async onLoadPattern (id) {
        console.log('onLoadPattern', id);
        const pattern = _.find(this.props.round.userPatterns[this.props.user.id].patterns, { id })
        if (!_.isEmpty(pattern.state)) {
            console.log('loading state', pattern);
            console.time('loadPattern')

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

            //console.log('pattern.state.layers', pattern.state.layers)

            _.remove(pattern.state.layers, function (n) {
                return layersToDelete.indexOf(n) > -1
            })

            //console.log('pattern.state.layers after remove', pattern.state.layers)

            this.props.updateLayers(pattern.state.layers)

            //console.timeEnd('loadPattern')


            // this.props.updateLayers(pattern.state.layers)
            // console.log('after round update', this.props.round);

            // now save to firebase
            for (const layer of pattern.state.layers) {
                // todo handle edge cases - eg layer been deleted
                const layerExists = _.find(this.props.round.layers, { id: layer.id })
                if (!_.isNil(layerExists)) {
                    this.context.updateLayer(this.props.round.id, layer.id, layer)
                }
            }
        }
    }
    onSavePattern (id) {
        //console.log('onSavePattern', id);
        // save all steps for this user
        this.setState({ selectedPattern: id, selectedPatternNeedsSaving: false })
        const state = this.getCurrentState(this.props.user.id)
        //  console.log('saving state', state);
        this.props.saveUserPattern(this.props.user.id, id, state)
        this.context.saveUserPatterns(this.props.round.id, this.props.user.id, this.props.round.userPatterns[this.props.user.id])
    }
    onMinimizeClick () {
        this.setState({ isMinimized: !this.state.isMinimized })
    }

    getCurrentState (userId) {
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
    render () {
        const { classes } = this.props;
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
                    label: 'P' + (pattern.order + 1),
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
                        <PatternThumbControl key={`item-${item.id}`} id={item.id} label={item.label} isFilled={item.isFilled} isSelected={item.id === this.state.selectedPattern} needsSaving={selectedPatternNeedsSaving} loadPattern={this.onLoadPattern} savePattern={this.onSavePattern} />
                    ))}
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
    //console.log('mapStateToProps', state);
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
    updateLayers
}
)(withStyles(styles)(PatternsSidebar));