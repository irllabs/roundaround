import React, { Component } from 'react'
import styles from './UserPatterns.scss'
import _ from 'lodash'
import { connect } from "react-redux";
import AudioEngine from "../../audio-engine/AudioEngine"
import { SET_USER_BUS_FX_OVERRIDE, SET_USER_BUS_FX } from '../../redux/actionTypes'
import { FirebaseContext } from '../../firebase';
import VideoCam from '@material-ui/icons/VideoCam';
import { IconButton } from '@material-ui/core';
import { Avatar } from '@material-ui/core';
import {
    saveUserPattern,
    setLayerSteps
} from "../../redux/actions";
import UserPatternThumbControl from './UserPatternThumbControl'

class UserPatterns extends Component {
    static contextType = FirebaseContext;
    constructor (props) {
        super(props)
        this.onLoadPattern = this.onLoadPattern.bind(this)
        this.onSavePattern = this.onSavePattern.bind(this)
    }
    async onLoadPattern (id) {
        console.log('onLoadPattern', id);
        const pattern = _.find(this.props.round.userPatterns[this.props.user.id].patterns, { id })
        if (!_.isNil(pattern)) {
            console.log('loading state', pattern);
            // save to store first so UI updates straight away
            for (const layer of pattern.state.layers) {
                const layerExists = _.find(this.props.round.layers, { id: layer.id })
                if (!_.isNil(layerExists)) {
                    this.props.setLayerSteps(layer.id, layer.steps)
                }
            }
            // now save to firebase
            for (const layer of pattern.state.layers) {
                // todo handle edge cases - eg layer been deleted
                const layerExists = _.find(this.props.round.layers, { id: layer.id })
                if (!_.isNil(layerExists)) {
                    this.context.setSteps(this.props.round.id, layer.id, layer.steps)
                }
            }
        }
    }
    onSavePattern (id) {
        console.log('onSavePattern', id);
        // save all steps for this user
        const state = this.getCurrentState(this.props.user.id)
        console.log('saving state', state);
        this.props.saveUserPattern(this.props.user.id, id, state)
        this.context.saveUserPatterns(this.props.round.id, this.props.user.id, this.props.round.userPatterns[this.props.user.id])
    }

    getCurrentState (userId) {
        const userLayers = _.filter(this.props.round.layers, { creator: userId })
        let state = {}
        state.layers = []
        for (const layer of userLayers) {
            let stateLayer = {
                id: layer.id,
                steps: layer.steps
            }
            state.layers.push(stateLayer)
        }
        return state
    }


    render () {
        let items = []
        if (!_.isNil(this.props.round.userPatterns) && !_.isNil(this.props.round.userPatterns[this.props.user.id])) {
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
        return (
            <div className={`${styles.userPatterns}`}>
                <div><Avatar alt="Remy Sharp" src="https://material-ui.com/static/images/avatar/1.jpg" /></div>
                <div className={`${styles.userPatternsContainer}`}>
                    {items.map((item, index) => (
                        <UserPatternThumbControl key={`item-${item.id}`} id={item.id} label={item.label} isFilled={item.isFilled} loadPattern={this.onLoadPattern} savePattern={this.onSavePattern} />
                    ))}
                </div>
            </div>
        )
    }
}
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
    setLayerSteps
}
)(UserPatterns);