import React from 'react';
import Dialog from '@material-ui/core/Dialog';
import DialogTitle from '@material-ui/core/DialogTitle';
import DialogContent from '@material-ui/core/DialogContent';
import DialogContentText from '@material-ui/core/DialogContentText';
import { connect } from "react-redux";
import { setIsShowingOrientationDialog } from '../../redux/actions'

function OrientationDialog ({ isShowingOrientationDialog, setIsShowingOrientationDialog }) {
    const handleClose = () => {
        setIsShowingOrientationDialog(false)
    }

    return (
        <Dialog open={isShowingOrientationDialog} onClose={handleClose} aria-labelledby="orientation-dialog-title">
            <DialogTitle id="orientation-dialog-title">Please rotate your device to landscape mode</DialogTitle>
            <DialogContent>
                <DialogContentText>The round needs the wider layout. Tap outside this message to continue anyway.</DialogContentText>
            </DialogContent>
        </Dialog>
    )
}
const mapStateToProps = state => {
    return {
        isShowingOrientationDialog: state.display.isShowingOrientationDialog
    };
};

export default connect(
    mapStateToProps,
    {
        setIsShowingOrientationDialog
    }
)(OrientationDialog);
