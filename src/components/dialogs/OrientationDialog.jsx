import React from 'react';
import { connect } from "react-redux";
import { setIsShowingOrientationDialog } from '../../redux/actions'
import { AppDialog, AppDialogContent } from './AppDialog'

function OrientationDialog ({ isShowingOrientationDialog, setIsShowingOrientationDialog }) {
    const handleClose = () => {
        setIsShowingOrientationDialog(false)
    }

    // rounded-[32px]: no JSS overrode Paper here, so the radius is the MUI theme's 32.
    return (
        <AppDialog open={isShowingOrientationDialog} onOpenChange={(next) => { if (!next) handleClose() }} titleId="orientation-dialog-title" title="Please rotate your device to landscape mode" className="rounded-[32px]">
            <AppDialogContent>
                {/* MUI's DialogContentText: body1, white at 70%, 12px under it. */}
                <p className="mb-3 mt-0 text-base leading-6 tracking-[0.00938em] text-white/70">The round needs the wider layout. Tap outside this message to continue anyway.</p>
            </AppDialogContent>
        </AppDialog>
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
