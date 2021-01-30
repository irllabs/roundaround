import React, { useContext, useRef } from 'react';
import Button from '@material-ui/core/Button';
import TextField from '@material-ui/core/TextField';
import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogContentText from '@material-ui/core/DialogContentText';
import DialogTitle from '@material-ui/core/DialogTitle';
import { connect } from "react-redux";
import { setRoundName } from '../redux/actions'
import { FirebaseContext } from '../firebase';


function DeleteRoundDialog ({ isOpen, setIsOpen, round, setRoundName }) {
    const firebase = useContext(FirebaseContext);
    const textField = useRef(null)
    const handleClose = () => {
        setIsOpen(false)
    }
    const onOkClick = async () => {
        console.log('on delete click');
        await firebase.deleteRound(round)
        setIsOpen(false)
        window.location.reload()
    }
    return (
        <Dialog open={isOpen} onClose={handleClose} aria-labelledby="form-dialog-title">
            <DialogTitle id="form-dialog-title">Delete?</DialogTitle>
            <DialogContent>

            </DialogContent>
            <DialogActions>
                <Button onClick={handleClose}>
                    Cancel
          </Button>
                <Button onClick={onOkClick} variant="contained" color="secondary" disableElevation>
                    Delete
          </Button>
            </DialogActions>
        </Dialog>
    )
}
const mapStateToProps = state => {
    return {
        round: state.round
    };
};

export default connect(
    mapStateToProps,
    {

    }
)(DeleteRoundDialog);