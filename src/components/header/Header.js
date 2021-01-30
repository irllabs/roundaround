import React from 'react'
import { connect } from "react-redux";
import Button from '@material-ui/core/Button';
import IconButton from '@material-ui/core/IconButton';
import Box from '@material-ui/core/Box';
import {
    Link
} from "react-router-dom";
import { makeStyles } from '@material-ui/core/styles';
import ShareIcon from '@material-ui/icons/Share';
import ArrowBackIosIcon from '@material-ui/icons/ArrowBackIos';
import PlayButton from './PlayButton';
import HeaderMenu from './HeaderMenu';
import { useLocation } from 'react-router-dom'
import ProjectName from './ProjectName';
import HeaderAvatars from './HeaderAvatars';
import _ from 'lodash'
import { setIsShowingRenameDialog } from "../../redux/actions";

const headerStyles = makeStyles({
    root: {
        height: '64px',
        width: '100%',
        display: 'flex',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingLeft: '1rem',
        paddingRight: '1rem',
        position: 'fixed',
        top: 0,
        zIndex: 4,
        backgroundColor: 'rgba(53,53,53,0.8)'
    },
    rightSide: {
        display: 'flex'
    },
    rightSideChild: {
        marginRight: '1rem',
    }
})



const Header = ({ togglePlay, isPlaying, round, logout, shareRound, collaboration, setIsShowingRenameDialog, setIsShowingDeleteRoundDialog }) => {
    const classes = headerStyles();
    const location = useLocation();
    const isPlayMode = true;//location.pathname === '/play' ? true : false
    const onPlayClick = () => {
        console.log('onPlayClick', collaboration);
        togglePlay()
    }
    const onBackClick = () => {
        logout()
    }
    console.log('Header rendering', round.name, collaboration);
    return (
        <Box className={classes.root}>
            {isPlayMode &&
                <>
                    <div>
                        <IconButton to="/" component={Link} onClick={onBackClick}>
                            <ArrowBackIosIcon />
                        </IconButton>
                    </div>
                    <div>
                        <div><ProjectName name={round.name} setIsShowingRenameDialog={setIsShowingRenameDialog} setIsShowingDeleteRoundDialog={setIsShowingDeleteRoundDialog} /></div>
                    </div>
                    <Box className={classes.rightSide} >
                        <HeaderAvatars users={_.isNil(collaboration) ? {} : collaboration.contributors} />
                        <Button className={classes.rightSideChild} variant="contained" color="secondary" disableElevation startIcon={<ShareIcon />} onClick={shareRound}>Share</Button>
                        <PlayButton className={classes.rightSideChild} onPlayClick={onPlayClick} isPlaying={isPlaying} />
                        <HeaderMenu />
                    </Box>
                </>
            }
            {!isPlayMode &&
                <>
                    <div></div>
                    <div><strong>RoundAround</strong></div>
                    <div>Sign in</div>
                </>
            }


        </Box >
    )
}
const mapStateToProps = state => {
    return {
        round: state.round,
        collaboration: state.collaboration
    };
};
export default connect(
    mapStateToProps,
    {
        setIsShowingRenameDialog
    }
)(Header);