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
import round from '../../redux/reducers/round';
import { uuid } from '../../models/SequencerUtil';
import { setRoundData } from '../../redux/actions';
import { FirebaseContext } from '../../firebase';

const useStyles = makeStyles((theme) => ({
    root: {
        display: 'flex',
    },
    paper: {
        marginRight: theme.spacing(2),
        borderRadius: '16px'
    },
    menuList: {
    }
}));

function ProjectName ({ name, setIsShowingRenameDialog, setIsShowingDeleteRoundDialog, setRoundData, round }) {
    const classes = useStyles();
    const [open, setOpen] = React.useState(false);
    const anchorRef = React.useRef(null);
    const firebase = useContext(FirebaseContext);

    const handleToggle = () => {
        setOpen((prevOpen) => !prevOpen);
    };

    const handleClose = (event) => {
        if (anchorRef.current && anchorRef.current.contains(event.target)) {
            return;
        }

        setOpen(false);
    };

    const onRenameClick = () => {
        setOpen(false);
        setIsShowingRenameDialog(true)
    }
    const onDeleteClick = () => {
        setOpen(false)
        setIsShowingDeleteRoundDialog(true)
    }
    const onDuplicateClick = () => {
        let clonedRound = _.cloneDeep(round)
        clonedRound.id = uuid()
        clonedRound.name += ' (duplicate)'
        firebase.createRound(clonedRound.id, clonedRound)
        setRoundData(clonedRound)
        setOpen(false)
    }

    function handleListKeyDown (event) {
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
        <div className={classes.root}>

            <div>
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
                            style={{ transformOrigin: placement === 'bottom' ? 'center top' : 'center bottom' }}
                        >
                            <Paper>
                                <ClickAwayListener onClickAway={handleClose}>
                                    <MenuList autoFocusItem={open} id="menu-list-grow" onKeyDown={handleListKeyDown}>
                                        <MenuItem onClick={onDuplicateClick}>Duplicate</MenuItem>
                                        <MenuItem onClick={onRenameClick}>Rename</MenuItem>
                                        <MenuItem onClick={onDeleteClick}>Delete</MenuItem>
                                    </MenuList>
                                </ClickAwayListener>
                            </Paper>
                        </Grow>
                    )}
                </Popper>
            </div>
        </div>
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
        setRoundData
    }
)(ProjectName);









/*import React, { useState, useEffect, useCallback, useContext, createRef } from 'react';
import { Edit } from '@material-ui/icons';
import TextField from '@material-ui/core/TextField';

export default function ProjectName ({ name, roundId }) {
    const [isInEditMode, setIsInEditMode] = useState(false)
    const textInput = createRef()
    const onNameClick = () => {
        setIsInEditMode(true)
        textInput.current.focus()
    }
    const [textValue, setTextValue] = useState(name)
    const updateProjectNameState = (name, selectedLayerId) => {
        //dispatch({ type: SET_LAYER_NAME, payload: { id: selectedLayerId, name, user: user.id } })
    }
    const updateLayerNameStateThrottled = useCallback(_.throttle(function (name) {
        updateProjectNameState(name)
    }, 1000), []);
    const onTextChange = (e) => {
        setTextValue(e.target.value)
        updateProjectNameStateThrottled(e.target.value)
    }
    const onFocus = (e) => {
        //  dispatch({ type: SET_DISABLE_KEY_LISTENER, payload: { value: true } })
    }
    const onLoseFocus = (e) => {
        //dispatch({ type: SET_DISABLE_KEY_LISTENER, payload: { value: false } })
        setIsInEditMode(false)
    }

    useEffect(() => {

    }, [])

    return (
        <div>
            {  !isInEditMode &&
                <div onClick={onNameClick}>
                    {name}
                    <Edit style={{ fontSize: 14, marginLeft: "0.5rem" }} />
                </div>
            }
            {  isInEditMode &&
                <>
                    <TextField ref={textInput} variant="outlined" size="small" value={textValue || ''} onChange={onTextChange} onFocus={onFocus} onBlur={onLoseFocus} />

                </>
            }
        </div>
    )
}
*/