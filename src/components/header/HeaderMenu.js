import React from 'react';
import Box from '@material-ui/core/Box';
import ClickAwayListener from '@material-ui/core/ClickAwayListener';
import Grow from '@material-ui/core/Grow';
import Paper from '@material-ui/core/Paper';
import Popper from '@material-ui/core/Popper';
import MenuItem from '@material-ui/core/MenuItem';
import MenuList from '@material-ui/core/MenuList';
import Divider from '@material-ui/core/Divider';
import { makeStyles } from '@material-ui/core/styles';
import IconButton from '@material-ui/core/IconButton';
// import MoreHorizIcon from '@material-ui/icons/MoreHoriz';
import FullscreenIcon from '@material-ui/icons/Fullscreen';
import TempoSlider from './TempoSlider'
//import SwingSlider from './SwingSlider'
import ListItemIcon from '@material-ui/core/ListItemIcon';
import _ from 'lodash'

const useStyles = makeStyles((theme) => ({
    root: {
        display: 'flex',
    },
    paper: {
        marginRight: theme.spacing(2),
        borderRadius: '16px'
    },
    menuList: {
    },
    menuListItem: {
        paddingTop: '1rem',
        paddingBottom: '1rem',

    }
}));

export default function HeaderMenu({ name }) {
    const classes = useStyles();
    const [open, setOpen] = React.useState(false);
    const anchorRef = React.useRef(null);

    const handleToggle = () => {
        setOpen((prevOpen) => !prevOpen);
    };

    const handleClose = (event) => {
        if (anchorRef.current && anchorRef.current.contains(event.target)) {
            return;
        }

        setOpen(false);
    };

    function handleListKeyDown(event) {
        if (event.key === 'Tab') {
            event.preventDefault();
            setOpen(false);
        }
    }

    const onFullscreenClick = () => {
        var element = document.documentElement;
        // console.log("document.fullscreenElement): ", document.fullscreenElement)
        // console.log("webkitCancelFullScreen: ", document.webkitCancelFullScreen)
        // console.log("webkitExitFullscreen: ", document.webkitExitFullscreen)
        if (_.isNil(document.fullscreenElement)) {
            if (element.requestFullscreen) {
                element.requestFullscreen();
            } else if (element.webkitEnterFullScreen) {/* Safari */
                element.webkitEnterFullScreen();
            }
            else if (element.webkitRequestFullscreen) { /* Safari */
                element.webkitRequestFullscreen();
            } else if (element.msRequestFullscreen) { /* IE11 */
                element.msRequestFullscreen();
            }
        } else {

            if (document.exitFullscreen) {
                document.exitFullscreen();
            } else if (document.webkitCancelFullScreen) {
                document.webkitCancelFullScreen();
            } else if (document.webkitExitFullscreen) { /* Safari */
                document.webkitExitFullscreen();
            } else if (document.msExitFullscreen) { /* IE11 */
                document.msExitFullscreen();
            }
        }

        if (document.webkitFullscreenElement) {
            document.webkitCancelFullScreen();
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
                {/* <IconButton
                    ref={anchorRef}
                    aria-controls={open ? 'menu-list-grow' : undefined}
                    aria-haspopup="true"
                    onClick={handleToggle}>
                    <MoreHorizIcon />
                </IconButton> */}
                <IconButton
                    // ref={anchorRef}
                    // aria-controls={open ? 'menu-list-grow' : undefined}
                    // aria-haspopup="true"
                    onClick={onFullscreenClick}>
                    <FullscreenIcon fontSize="small" />
                </IconButton>

                <Popper open={open} anchorEl={anchorRef.current} role={undefined} transition disablePortal>
                    {({ TransitionProps, placement }) => (
                        <Grow
                            {...TransitionProps}
                            style={{ transformOrigin: placement === 'bottom' ? 'center top' : 'center bottom' }}
                        >
                            <Paper size="md">
                                <ClickAwayListener onClickAway={handleClose}>
                                    <Box>
                                        <MenuList autoFocusItem={open} id="menu-list-grow" onKeyDown={handleListKeyDown}>
                                            <MenuItem onClick={onFullscreenClick} className={classes.menuListItem}><ListItemIcon>
                                                <FullscreenIcon fontSize="small" />
                                            </ListItemIcon>Fullscreen</MenuItem>
                                            <Divider />
                                        </MenuList>
                                        <TempoSlider />
                                    </Box>
                                </ClickAwayListener>
                            </Paper>
                        </Grow>
                    )}
                </Popper>
            </div>
        </div>
    );
}
