import React, { Component } from 'react'
import PropTypes from 'prop-types'
import { withStyles } from '@material-ui/styles'
import Box from '@material-ui/core/Box'
import { connect } from "react-redux"
import AudioEngine from "../../audio-engine/AudioEngine"
import { FirebaseContext } from '../../firebase'
import {
    setUserBusFx,
    setUserBusFxOverride
} from "../../redux/actions"
import arrayMove from 'array-move'
import EffectThumbControl from './EffectThumbControl'
import ChevronRightIcon from '@material-ui/icons/ChevronRight'
import _ from 'lodash'

const styles = theme => ({
    root: {
        width: '120px',
        height: 'calc(100% - 64px)',
        position: 'absolute',
        right: '0',
        top: '64px',
        borderTop: 'solid 1px rgba(255,255,255,0.1)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'right 0.4s',
    },
    effectContainer: {
        display: 'flex',
        position: 'relative',
        flexDirection: 'column',
        height: 352,
        width: 120,
        borderTopLeftRadius: 8,
        borderBottomLeftRadius: 8,
        backgroundColor: 'rgba(47,47,47,0.9)',
        alignItems: 'center',
        justifyContent: 'center',
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
        top: '12px',
        borderRadius: 8,
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
    constructor(props) {
        super(props)
        this.state = {
            menuAnchorElement: null,
            isMinimized: false
        }
        this.onSwitchOn = this.onSwitchOn.bind(this)
        this.onSwitchOff = this.onSwitchOff.bind(this)
        this.onMinimizeClick = this.onMinimizeClick.bind(this)
    }

    onPlayClick() {
        this.props.togglePlay()
    }

    onSortEnd = ({ oldIndex, newIndex }) => {
        let userBus = _.cloneDeep(this.props.round.userBuses[this.props.user.id])
        userBus.fx = arrayMove(userBus.fx, oldIndex, newIndex)
        for (let i = 0; i < userBus.fx.length; i++) {
            userBus.fx[i].order = i
        }
        this.props.setUserBusFx(this.props.user.id, userBus.fx)
        AudioEngine.busesByUser[this.props.user.id].setFxOrder(userBus.fx)
        this.context.updateUserBus(this.props.round.id, this.props.user.id, userBus)
    }

    onSwitchOn(fxId) {
        AudioEngine.busesByUser[this.props.user.id].fx[fxId].override = true
        this.props.setUserBusFxOverride(this.props.user.id, fxId, true)
        let userBus = _.cloneDeep(this.props.round.userBuses[this.props.user.id])
        let fx = _.find(userBus.fx, { id: fxId })
        fx.isOverride = true
        this.context.updateUserBus(this.props.round.id, this.props.user.id, userBus)
    }
    onSwitchOff(fxId) {
        AudioEngine.busesByUser[this.props.user.id].fx[fxId].override = false
        this.props.setUserBusFxOverride(this.props.user.id, fxId, false)
        let userBus = _.cloneDeep(this.props.round.userBuses[this.props.user.id])
        let fx = _.find(userBus.fx, { id: fxId })
        fx.isOverride = false
        this.context.updateUserBus(this.props.round.id, this.props.user.id, userBus)
    }
    onMinimizeClick() {
        this.setState({ isMinimized: !this.state.isMinimized })
    }
    render() {
        const { classes } = this.props;
        let items = []
        if (!_.isNil(this.props.round) && !_.isNil(this.props.round.userBuses) && !_.isNil(this.props.round.userBuses[this.props.user.id])) {
            for (const fx of this.props.round.userBuses[this.props.user.id].fx) {
                let item = {
                    id: fx.id,
                    isOn: fx.isOn,
                    isOverride: fx.isOverride,
                    label: fx.name,
                    userId: this.props.user.id,
                    name: fx.name
                }
                items.push(item)
            }
        }
        const isMinimizedClass = this.state.isMinimized ? classes.isMinimized : '';
        const buttonIsMinimizedClass = this.state.isMinimized ? classes.minimizeButtonIsMinimized : '';

        return (
            <Box className={classes.root + ' ' + isMinimizedClass}>
                <Box className={classes.effectContainer}>
                    <Box className={classes.minimizeButton + ' ' + buttonIsMinimizedClass} onClick={this.onMinimizeClick}>
                        <ChevronRightIcon size="small" />
                    </Box>
                    {items.map((fx) => (
                        <EffectThumbControl key={fx.id} isOn={fx.isOn} isOverride={fx.isOverride} className={classes.thumbControl} label={toTitleCase(fx.label)} fxId={fx.id} userId={fx.userId} switchOn={this.onSwitchOn} switchOff={this.onSwitchOff} name={fx.name} />
                    ))}
                </Box>
            </Box>
        )
    }
}
EffectsSidebar.propTypes = {
    classes: PropTypes.object.isRequired,
}

const mapStateToProps = state => {
    return {
        round: state.round,
        user: state.user,
        display: state.display
    }
}

export default connect(
    mapStateToProps, {
    setUserBusFx,
    setUserBusFxOverride
}
)(withStyles(styles)(EffectsSidebar))