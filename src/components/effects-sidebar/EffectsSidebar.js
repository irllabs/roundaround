import React, { Component } from 'react'
import styles from './EffectsSidebar.scss'
import { sortableContainer, sortableElement, sortableHandle } from 'react-sortable-hoc';
import _ from 'lodash'
import arrayMove from 'array-move'
import { DragIndicator } from '@material-ui/icons';
import EffectThumbControl from './EffectThumbControl';
import { connect } from "react-redux";
import AudioEngine from "../../audio-engine/AudioEngine"
import { SET_USER_BUS_FX_OVERRIDE, SET_USER_BUS_FX } from '../../redux/actionTypes'
import { FirebaseContext } from '../../firebase';
import VideoCam from '@material-ui/icons/VideoCam';
import { IconButton } from '@material-ui/core';
import {
    setIsShowingVideoWindow,
    setUserBusFx,
    setUserBusFxOverride
} from "../../redux/actions";

const DragHandle = sortableHandle(() => <span className={`${styles.effectsSidebarListItemDragHandle}`}><DragIndicator /></span>);
const SortableItem = sortableElement(({ fx, onSwitchOn, onSwitchOff }) => (
    <li className={`${styles.effectsSidebarListItem}`}>
        <DragHandle />
        <EffectThumbControl label={toTitleCase(fx.label)} fxId={fx.id} userId={fx.userId} switchOn={onSwitchOn} switchOff={onSwitchOff} />
    </li>
));
const SortableContainer = sortableContainer(({ children }) => {
    return <ul className={`${styles.effectsSidebarList}`}>{children}</ul>;
});

const toTitleCase = (str) => {
    return str.replace(
        /\w\S*/g,
        function (txt) {
            return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
        }
    );
}

class EffectsSidebar extends Component {
    static contextType = FirebaseContext;
    constructor (props) {
        super(props)
        this.state = {
            items: []
        }
        this.onSwitchOn = this.onSwitchOn.bind(this)
        this.onSwitchOff = this.onSwitchOff.bind(this)
        this.onShowVideoWindowClick = this.onShowVideoWindowClick.bind(this)
    }

    onSortEnd = ({ oldIndex, newIndex }) => {
        let userBus = _.cloneDeep(this.props.round.userBuses[this.props.user.id])
        userBus.fx = arrayMove(userBus.fx, oldIndex, newIndex)
        for (let i = 0; i < userBus.fx.length; i++) {
            userBus.fx[i].order = i
        }
        this.props.setUserBusFx(this.props.user.id, userBus.fx)
        //this.props.dispatch({ type: SET_USER_BUS_FX, payload: { userId: this.props.user.id, data: userBus.fx } })
        AudioEngine.busesByUser[this.props.user.id].setFxOrder(userBus.fx)
        this.context.updateUserBus(this.props.round.id, this.props.user.id, userBus)

        /*this.setState(({ items }) => ({
            items: arrayMove(items, oldIndex, newIndex),
        }));*/
    };
    onSwitchOn (fxId) {
        AudioEngine.busesByUser[this.props.user.id].fx[fxId].override = true
        this.props.setUserBusFxOverride(this.props.user.id, fxId, true)
        //this.props.dispatch({ type: SET_USER_BUS_FX_OVERRIDE, payload: { fxId, userId: this.props.user.id, value: true } })
        let userBus = _.cloneDeep(this.props.round.userBuses[this.props.user.id])
        let fx = _.find(userBus.fx, { id: fxId })
        fx.isOverride = true
        this.context.updateUserBus(this.props.round.id, this.props.user.id, userBus)
    }
    onSwitchOff (fxId) {
        AudioEngine.busesByUser[this.props.user.id].fx[fxId].override = false
        this.props.setUserBusFxOverride(this.props.user.id, fxId, false)
        //this.props.dispatch({ type: SET_USER_BUS_FX_OVERRIDE, payload: { fxId, userId: this.props.user.id, value: false } })
        let userBus = _.cloneDeep(this.props.round.userBuses[this.props.user.id])
        let fx = _.find(userBus.fx, { id: fxId })
        fx.isOverride = false
        this.context.updateUserBus(this.props.round.id, this.props.user.id, userBus)
    }
    onShowVideoWindowClick () {
        this.props.setIsShowingVideoWindow(!this.props.display.isShowingVideoWindow)
    }
    render () {
        let items = []
        if (!_.isNil(this.props.round.userBuses) && !_.isNil(this.props.round.userBuses[this.props.user.id])) {
            for (const fx of this.props.round.userBuses[this.props.user.id].fx) {
                let item = {
                    id: fx.id,
                    label: fx.name,
                    userId: this.props.user.id
                }
                items.push(item)
            }
        }
        return (
            <div className={`${styles.effectsSidebar}`}>
                <div><IconButton variant="outlined" style={{ color: 'white' }} onClick={this.onShowVideoWindowClick}><VideoCam /></IconButton></div>
                <SortableContainer onSortEnd={this.onSortEnd} useDragHandle >
                    {items.map((fx, index) => (
                        <SortableItem key={`item-${fx.id}`} index={index} fx={fx} onSwitchOff={this.onSwitchOff} onSwitchOn={this.onSwitchOn} />
                    ))}
                </SortableContainer>
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
    setIsShowingVideoWindow,
    setUserBusFx,
    setUserBusFxOverride
}
)(EffectsSidebar);