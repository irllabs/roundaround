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
import PlayArrow from '@material-ui/icons/PlayArrow';
import Pause from '@material-ui/icons/Pause';
import MoreVert from '@material-ui/icons/MoreVert';
import { IconButton } from '@material-ui/core';
import Button from '@material-ui/core/Button';
import Menu from '@material-ui/core/Menu';
import MenuItem from '@material-ui/core/MenuItem';
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
            menuAnchorElement: null
        }
        this.onSwitchOn = this.onSwitchOn.bind(this)
        this.onSwitchOff = this.onSwitchOff.bind(this)
        this.onShowVideoWindowClick = this.onShowVideoWindowClick.bind(this)
        this.onPlayClick = this.onPlayClick.bind(this)
        this.onShareRoundClick = this.onShareRoundClick.bind(this)
        this.onProfileClick = this.onProfileClick.bind(this)
        this.onProjectClick = this.onProjectClick.bind(this)
        this.onFullscreenClick = this.onFullscreenClick.bind(this)
        this.onMenuOpenClick = this.onMenuOpenClick.bind(this)
        this.onMenuClose = this.onMenuClose.bind(this)
    }

    onPlayClick () {
        this.props.togglePlay()
    }
    onShareRoundClick () {
        this.props.shareRound()
    }
    onProfileClick () {
        this.props.toggleProfile()
    }
    onProjectClick () {
        this.props.toggleSidebar()
    }
    onFullscreenClick () {
        var element = document.documentElement;
        if (_.isNil(document.fullscreenElement)) {
            if (element.requestFullscreen) {
                element.requestFullscreen();
            } else if (element.webkitRequestFullscreen) { /* Safari */
                element.webkitRequestFullscreen();
            } else if (element.msRequestFullscreen) { /* IE11 */
                element.msRequestFullscreen();
            }
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            } else if (document.webkitExitFullscreen) { /* Safari */
                document.webkitExitFullscreen();
            } else if (document.msExitFullscreen) { /* IE11 */
                document.msExitFullscreen();
            }
        }
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
    onMenuOpenClick (e) {
        this.setState({
            menuAnchorElement: e.currentTarget
        })
    }
    onMenuClose (e) {
        this.setState({
            menuAnchorElement: null
        })
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
                <div className={`${styles.effectsSidebarTop}`}>
                    <button
                        type="button"
                        style={{ borderRadius: '24px', width: '38px', height: '38px' }}
                        onClick={this.onPlayClick}
                    >
                        {this.props.isOn ? <Pause /> : <PlayArrow />}
                    </button>
                    {
                        this.props.mode === 'collaboration' &&
                        <IconButton variant="outlined" style={{ color: 'white' }} onClick={this.onShowVideoWindowClick}><VideoCam /></IconButton>
                    }

                    <IconButton aria-controls="simple-menu" aria-haspopup="true" onClick={this.onMenuOpenClick}>
                        <MoreVert />
                    </IconButton>
                    <Menu
                        id="simple-menu"
                        anchorEl={this.state.menuAnchorElement}
                        keepMounted
                        open={Boolean(this.state.menuAnchorElement)}
                        onClose={this.onMenuClose}
                    >
                        <MenuItem onClick={this.onProfileClick}>Profile</MenuItem>
                        <MenuItem onClick={this.onProjectClick}>Project</MenuItem>
                    </Menu>
                </div>

                <SortableContainer onSortEnd={this.onSortEnd} useDragHandle >
                    {items.map((fx, index) => (
                        <SortableItem key={`item-${fx.id}`} index={index} fx={fx} onSwitchOff={this.onSwitchOff} onSwitchOn={this.onSwitchOn} />
                    ))}
                </SortableContainer>
            </div>
        )
        /* return (
             <div className={`${styles.effectsSidebar}`}>
                 <div className={`${styles.effectsSidebarTop}`}>
                     <button
                         type="button"
                         style={{ borderRadius: '24px', width: '38px', height: '38px' }}
                         onClick={this.onPlayClick}
                     >
                         {this.props.isOn ? <Pause /> : <PlayArrow />}
                     </button>
 
 
 
                     {
                         this.props.user &&
                         <button
                             type="button"
                             onClick={this.onProfileClick}
                         >
                             Profile
                     </button>
                     }
                     {
                         this.props.user &&
                         <button
                             type="button"
                             onClick={this.onFullscreenClick}
                         >
                             Fullscreen
                     </button>
                     }
 
                     {
                         this.props.mode !== 'collaboration' &&
                         <button
                             type="button"
                             onClick={this.onProjectClick}
                         >
                             Project
                     </button>
 
                     }
                     {
                         this.props.mode === 'collaboration' &&
                         <IconButton variant="outlined" style={{ color: 'white' }} onClick={this.onShowVideoWindowClick}><VideoCam /></IconButton>
                     }
                 </div>
 
                 <SortableContainer onSortEnd={this.onSortEnd} useDragHandle >
                     {items.map((fx, index) => (
                         <SortableItem key={`item-${fx.id}`} index={index} fx={fx} onSwitchOff={this.onSwitchOff} onSwitchOn={this.onSwitchOn} />
                     ))}
                 </SortableContainer>
             </div>
         )*/
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