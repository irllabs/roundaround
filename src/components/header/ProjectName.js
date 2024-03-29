import React, { useContext } from 'react';
import { connect } from "react-redux";
import Button from '@material-ui/core/Button';
import ClickAwayListener from '@material-ui/core/ClickAwayListener';
import Grow from '@material-ui/core/Grow';
import Paper from '@material-ui/core/Paper';
import Popper from '@material-ui/core/Popper';
import MenuItem from '@material-ui/core/MenuItem';
import MenuList from '@material-ui/core/MenuList';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
import { makeStyles } from '@material-ui/core/styles';
import _ from 'lodash'
import { uuid } from '../../utils/index';
import { setRound, setIsShowingRenameDialog, setIsShowingDeleteRoundDialog, setSelectedRoundId } from '../../redux/actions';
import { FirebaseContext } from '../../firebase';
import { Box } from '@material-ui/core';

const useStyles = makeStyles((theme) => ({
    root: {
        display: 'flex',
    },
    paper: {
        //marginRight: theme.spacing(2),
        justifySelf: 'flex-start',
        width: 130,
        borderRadius: 8,
        [theme.breakpoints.down('xs')]: {
            width: 100,
        }
    },
    menuList: {
    }
}));

function ProjectName({ name, setIsShowingRenameDialog, setIsShowingDeleteRoundDialog, setRound, round, setSelectedRoundId }) {
    const classes = useStyles();
    const [open, setOpen] = React.useState(false);
    const anchorRef = React.useRef(null);
    const firebase = useContext(FirebaseContext);

    const handleToggle = () => {
        setOpen((prevOpen) => !prevOpen);
        setSelectedRoundId(round.id)
    };

    const handleClose = (event) => {
        if (anchorRef.current && anchorRef.current.contains(event.target)) {
            return;
        }
        anchorRef.current.blur()
        setSelectedRoundId(null)
        setOpen(false);
    };

    const onRenameClick = () => {
        setOpen(false);
        setSelectedRoundId(round.id)
        setIsShowingRenameDialog(true)
    }
    const onDeleteClick = () => {
        setOpen(false)
        setSelectedRoundId(round.id)
        setIsShowingDeleteRoundDialog(true)
    }
    const onDuplicateClick = async () => {
        let clonedRound = _.cloneDeep(round)
        clonedRound.id = uuid()
        clonedRound.name += ' (duplicate)'
        await firebase.createRound(clonedRound)
        setRound(clonedRound)
        setOpen(false)
    }

    function handleListKeyDown(event) {
        if (event.key === 'Tab') {
            event.preventDefault();
            setOpen(false);
        }
    }

    // return focus to the button when we transitioned from !open -> open
    const prevOpen = React.useRef(open);
    React.useEffect(() => {
        if (prevOpen.current === true && open === false) {
            anchorRef.current.focus();
        }

        prevOpen.current = open;
    }, [open]);

    return (
        <Box className={classes.root}>
            <Box style={{ display: 'flex', flexDirection: 'column' }}>
                <Button
                    ref={anchorRef}
                    aria-controls={open ? 'menu-list-grow' : undefined}
                    aria-haspopup="true"
                    endIcon={<ExpandMoreIcon />}
                    onClick={handleToggle}
                >
                    {name}
                </Button>
                <Popper open={open} anchorEl={anchorRef.current} role={undefined} transition disablePortal>
                    {({ TransitionProps, placement }) => (
                        <Grow
                            {...TransitionProps}
                            style={{ display: 'flex' }}
                        >
                            <Paper className={classes.paper}>
                                <ClickAwayListener onClickAway={handleClose}>
                                    <MenuList style={{ width: '100%' }} autoFocusItem={open} id="menu-list-grow" onKeyDown={handleListKeyDown}>
                                        <MenuItem onClick={onDuplicateClick}>Duplicate</MenuItem>
                                        <MenuItem onClick={onRenameClick}>Rename</MenuItem>
                                        <MenuItem onClick={onDeleteClick}>Delete</MenuItem>
                                    </MenuList>
                                </ClickAwayListener>
                            </Paper>
                        </Grow>
                    )}
                </Popper>
            </Box>
        </Box>
    );
}
const mapStateToProps = state => {
    return {
        round: state.round
    };
};

export default connect(
    mapStateToProps,
    {
        setRound,
        setIsShowingDeleteRoundDialog,
        setIsShowingRenameDialog,
        setSelectedRoundId
    }
)(ProjectName);