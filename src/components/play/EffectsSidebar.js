import React, { Component } from 'react'
import PropTypes from 'prop-types';
import { withStyles } from '@material-ui/styles';
import Box from '@material-ui/core/Box';
import { connect } from "react-redux";
import AudioEngine from "../../audio-engine/AudioEngine"
import { FirebaseContext } from '../../firebase';
import {
    setUserBusFx,
    setUserBusFxOverride
} from "../../redux/actions";
//import { sortableContainer, sortableElement, sortableHandle } from 'react-sortable-hoc';
import arrayMove from 'array-move'
//import { DragIndicator } from '@material-ui/icons';
import EffectThumbControl from './EffectThumbControl';
import ChevronRightIcon from '@material-ui/icons/ChevronRight';
import _ from 'lodash'

const styles = theme => ({
    root: {
        width: '120px',
        height: 'calc(100% - 64px)',
        position: 'absolute',
        right: '0',
        top: '64px',
        borderTop: 'solid 1px rgba(255,255,255,0.1)',
        backgroundColor: 'rgba(47,47,47,0.9)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-end',
        paddingBottom: '0.5rem',
        transition: 'right 0.4s',
    },
    isMinimized: {
        right: '-120px'
    },
    minimizeButton: {
        backgroundColor: 'rgba(47,47,47,0.9)',
        width: '32px',
        height: '32px',
        position: 'absolute',
        left: '-40px',
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
    },
    thumbControl: {
        marginBottom: '0.5rem'
    },
    effectsSidebarList: {
        margin: '0',
        padding: '0',
        width: '100%'
    },
    effectsSidebarListItem: {
        listStyleType: 'none',
        padding: '1rem',
        paddingLeft: '0',
        backgroundColor: '',
        color: 'white',
        borderTop: 'solid 1px rgba(255, 255, 255, 0.1)',
        display: 'flex',
        alignItems: 'center',
    },
    effectsSidebarListItemDragHandle: {
        paddingLeft: '1rem',
        paddingRight: '1rem',
        display: 'flex',
        cursor: 'move',
        color: '#ededed'
    }
})

/*const DragHandle = sortableHandle(({ classes }) => <span className={classes.effectsSidebarListItemDragHandle}><DragIndicator /></span>);
const SortableItem = sortableElement(({ fx, onSwitchOn, onSwitchOff, classes }) => (
    <li className={classes.effectsSidebarListItem}>
        <DragHandle classes={classes} />
        <EffectThumbControl label={toTitleCase(fx.label)} fxId={fx.id} userId={fx.userId} switchOn={onSwitchOn} switchOff={onSwitchOff} name={fx.name} />
    </li>
));
const SortableContainer = sortableContainer(({ children, classes }) => {
    return <ul className={classes.effectsSidebarList}>{children}</ul>;
});*/

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
            menuAnchorElement: null,
            isMinimized: false
        }
        this.onSwitchOn = this.onSwitchOn.bind(this)
        this.onSwitchOff = this.onSwitchOff.bind(this)
        this.onMinimizeClick = this.onMinimizeClick.bind(this)
    }

    onPlayClick () {
        this.props.togglePlay()
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
    onSwitchOn (fxId, isOn) {

        AudioEngine.busesByUser[this.props.user.id].fx[fxId].override = true
        this.props.setUserBusFxOverride(this.props.user.id, fxId, true)
       
        //this.props.dispatch({ type: SET_USER_BUS_FX_OVERRIDE, payload: { fxId, userId: this.props.user.id, value: true } })
        let userBus = _.cloneDeep(this.props.round.userBuses[this.props.user.id])   
        let fx = _.find(userBus.fx, { id: fxId })
        fx.isOverride = true
        fx.isOn = isOn
       
        this.context.updateUserBus(this.props.round.id, this.props.user.id, userBus)
    }
    onSwitchOff (fxId, isOn) {
       
        AudioEngine.busesByUser[this.props.user.id].fx[fxId].override = false
        this.props.setUserBusFxOverride(this.props.user.id, fxId, false)
        //this.props.dispatch({ type: SET_USER_BUS_FX_OVERRIDE, payload: { fxId, userId: this.props.user.id, value: false } })
        let userBus = _.cloneDeep(this.props.round.userBuses[this.props.user.id])
        let fx = _.find(userBus.fx, { id: fxId })
        fx.isOverride = false
        fx.isOn = isOn;
        this.context.updateUserBus(this.props.round.id, this.props.user.id, userBus)
    }
    onMinimizeClick () {
        this.setState({ isMinimized: !this.state.isMinimized })
    }
    render () {
        const { classes } = this.props;
        let items = []
        if (!_.isNil(this.props.round) && !_.isNil(this.props.round.userBuses) && !_.isNil(this.props.round.userBuses[this.props.user.id])) {
            for (const fx of this.props.round.userBuses[this.props.user.id].fx) {
                let item = {
                    id: fx.id,
                    label: fx.name,
                    userId: this.props.user.id,
                    name: fx.name,
                    isOn: fx.isOn
                }
                items.push(item)
            }
        }
        const isMinimizedClass = this.state.isMinimized ? classes.isMinimized : '';
        const buttonIsMinimizedClass = this.state.isMinimized ? classes.minimizeButtonIsMinimized : '';

        return (
            <Box className={classes.root + ' ' + isMinimizedClass}>
                {items.map((fx, index) => (
                    <EffectThumbControl key={fx.id} className={classes.thumbControl} label={toTitleCase(fx.label)} fx={fx} fxId={fx.id} userId={fx.userId} switchOn={this.onSwitchOn} switchOff={this.onSwitchOff} name={fx.name} />
                ))}
                <Box className={classes.minimizeButton + ' ' + buttonIsMinimizedClass} onClick={this.onMinimizeClick}><ChevronRightIcon size="small" /></Box>
            </Box>
        )

        /*return (
            <Box className={classes.root + ' ' + isMinimizedClass}>
                <SortableContainer onSortEnd={this.onSortEnd} useDragHandle classes={classes} >
                    {items.map((fx, index) => (
                        <SortableItem classes={classes} key={`item-${fx.id}`} index={index} fx={fx} onSwitchOff={this.onSwitchOff} onSwitchOn={this.onSwitchOn} />
                    ))}
                </SortableContainer>
                <Box className={classes.minimizeButton + ' ' + buttonIsMinimizedClass} onClick={this.onMinimizeClick}><ChevronRightIcon size="small" /></Box>
            </Box>
        )*/
    }
}
EffectsSidebar.propTypes = {
    classes: PropTypes.object.isRequired,
};

const mapStateToProps = state => {
    return {
        round: state.round,
        user: state.user,
        display: state.display
    };
};

export default connect(
    mapStateToProps, {
    setUserBusFx,
    setUserBusFxOverride
}
)(withStyles(styles)(EffectsSidebar));