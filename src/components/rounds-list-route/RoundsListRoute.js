import React, { Component } from 'react'
import PropTypes from 'prop-types';
import { withStyles } from '@material-ui/styles';
import Box from '@material-ui/core/Box';
import Container from '@material-ui/core/Container';
import Button from '@material-ui/core/Button';
import IconButton from '@material-ui/core/IconButton';
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import ListItemText from '@material-ui/core/ListItemText';
import ListItemSecondaryAction from '@material-ui/core/ListItemSecondaryAction';
import ListItemAvatar from '@material-ui/core/ListItemAvatar';
import Avatar from '@material-ui/core/Avatar';
import ImageIcon from '@material-ui/icons/Image';
import AddIcon from '@material-ui/icons/Add';
import MoreHorizIcon from '@material-ui/icons/MoreHoriz';
import { connect } from "react-redux";
import _ from 'lodash';
import {
    setIsShowingSignInDialog, setRedirectAfterSignIn, setRounds, setIsShowingDeleteRoundDialog, setIsShowingRenameDialog, setSelectedRoundId
} from '../../redux/actions'
import SignInDialog from '../dialogs/SignInDialog'
import { createRound } from '../../utils/index'
import { FirebaseContext } from '../../firebase';
import ClickAwayListener from '@material-ui/core/ClickAwayListener';
import Grow from '@material-ui/core/Grow';
import Paper from '@material-ui/core/Paper';
import Popper from '@material-ui/core/Popper';
import MenuItem from '@material-ui/core/MenuItem';
import MenuList from '@material-ui/core/MenuList';
import { uuid } from '../../utils/index'

const styles = theme => ({
    root: {
        paddingTop: '64px'
    },
    paper: {
        borderRadius: 8
    },
    header: {
        display: 'flex',
        width: '100%',
        justifyContent: 'space-between',
        alignItems: 'center'
    }
})

class RoundsListRoute extends Component {
    static contextType = FirebaseContext;
    constructor(props) {
        super(props);
        this.state = {
            menuIsOpen: false,
            anchorElement: null
        }
        this.onNewRoundClick = this.onNewRoundClick.bind(this)
        this.onLaunchRoundClick = this.onLaunchRoundClick.bind(this)
        this.onMenuClick = this.onMenuClick.bind(this)
    }

    async onNewRoundClick() {
        let newRound = await createRound(this.props.user.id)
        let newRounds = [newRound, ...this.props.rounds]
        await this.context.createRound(newRound)
        this.props.setRounds(newRounds)
        // redirect to new round
        this.onLaunchRoundClick(newRound.id)
    }

    onLaunchRoundClick(id) {
        this.props.history.push('/play/' + id)
    }

    getCreatedString(round) {
        const date = new Date(round.createdAt)
        let dateString = date.toLocaleTimeString(
            'en-gb',
            {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            }
        )
        return dateString
    }

    onMenuClick(roundId, e) {
        let element = e.currentTarget
        this.props.setSelectedRoundId(roundId)
        this.setState({
            anchorElement: element,
            menuIsOpen: true
        })
    }

    onMenuClose = (event) => {
        this.setState({
            menuIsOpen: false
        })
        this.props.setSelectedRoundId(null)
    }

    onRenameClick = (roundId) => {
        this.setState({
            menuIsOpen: false
        })
        this.props.setIsShowingRenameDialog(true)
    }
    onDuplicateClick = async () => {
        let selectedRound = await this.context.getRound(this.props.selectedRoundId)
        let clonedRound = _.cloneDeep(selectedRound)
        clonedRound.id = uuid()
        clonedRound.name += ' (duplicate)'
        clonedRound.createdAt = Date.now()
        await this.context.createRound(clonedRound)
        let clonedRounds = _.cloneDeep(this.props.rounds)
        clonedRounds.push(clonedRound)
        this.props.setRounds(clonedRounds)
        this.setState({
            menuIsOpen: false
        })
    }
    onDeleteClick = () => {
        this.setState({
            menuIsOpen: false
        })
        this.props.setIsShowingDeleteRoundDialog(true)
    }

    render() {
        const { classes } = this.props;
        const rounds = [...this.props.rounds];
        return (
            <>
                <Container className={classes.root}>

                    <Box className={classes.header}>
                        <Box>
                            <h1>My rounds</h1>
                        </Box>
                        <Box>
                            <Button data-test="button-new-round" className={classes.getStartedButton} variant="contained" color="secondary" disableElevation onClick={this.onNewRoundClick} startIcon={<AddIcon />}>New round</Button>
                        </Box>
                    </Box>
                    <Box>
                        <List>
                            {
                                rounds.map((round) => (
                                    <ListItem key={round.id} button onClick={this.onLaunchRoundClick.bind(this, round.id)} data-test="list-item-round">
                                        <ListItemAvatar>
                                            <Avatar>
                                                <ImageIcon />
                                            </Avatar>
                                        </ListItemAvatar>
                                        <ListItemText primary={round.name} secondary={this.getCreatedString(round)} />
                                        <ListItemSecondaryAction>
                                            <IconButton
                                                aria-controls={this.state.menuIsOpen ? 'menu-list-grow' : undefined}
                                                aria-haspopup="true"
                                                onClick={this.onMenuClick.bind(this, round.id)}>
                                                <MoreHorizIcon />
                                            </IconButton>
                                        </ListItemSecondaryAction>
                                    </ListItem>
                                ))
                            }
                        </List>
                    </Box>
                    <Popper open={this.state.menuIsOpen} anchorEl={this.state.anchorElement} role={undefined} transition disablePortal>
                        {({ TransitionProps, placement }) => (
                            <Grow
                                {...TransitionProps}
                                style={{ transformOrigin: placement === 'bottom' ? 'center top' : 'center bottom' }}
                            >
                                <Paper className={classes.paper} size="md">
                                    <ClickAwayListener onClickAway={this.onMenuClose}>
                                        <Box>
                                            <MenuList autoFocusItem={this.state.menuIsOpen} id="menu-list-grow">
                                                <MenuItem onClick={this.onRenameClick} className={classes.menuListItem}>Rename</MenuItem>
                                                <MenuItem onClick={this.onDuplicateClick} className={classes.menuListItem}>Duplicate</MenuItem>
                                                <MenuItem onClick={this.onDeleteClick} className={classes.menuListItem}>Delete</MenuItem>
                                            </MenuList>
                                        </Box>
                                    </ClickAwayListener>
                                </Paper>
                            </Grow>
                        )}
                    </Popper>
                </Container>
                <SignInDialog />
            </>
        )
    }
}
RoundsListRoute.propTypes = {
    classes: PropTypes.object.isRequired,
};

const mapStateToProps = state => {
    return {
        user: state.user,
        rounds: state.rounds,
        selectedRoundId: state.display.selectedRoundId
    };
};

export default connect(
    mapStateToProps,
    {
        setIsShowingSignInDialog,
        setRedirectAfterSignIn,
        setRounds,
        setIsShowingDeleteRoundDialog,
        setIsShowingRenameDialog,
        setSelectedRoundId
    }
)(withStyles(styles)(RoundsListRoute));
