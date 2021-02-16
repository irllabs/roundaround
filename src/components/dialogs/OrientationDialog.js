import React from 'react';
import Button from '@material-ui/core/Button';
import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogTitle from '@material-ui/core/DialogTitle';
import { connect } from "react-redux";
import { setIsShowingOrientationDialog } from '../../redux/actions'

function OrientationDialog ({ isShowingOrientationDialog }) {
    const handleClose = () => {
        setIsShowingOrientationDialog(false)
    }

    return (
        <Dialog open={isShowingOrientationDialog} onClose={handleClose} aria-labelledby="form-dialog-title">
            <DialogTitle id="form-dialog-title">Please rotate your device to landscape mode</DialogTitle>
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