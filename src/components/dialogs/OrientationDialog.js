import React from 'react';
import Dialog from '@material-ui/core/Dialog';
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