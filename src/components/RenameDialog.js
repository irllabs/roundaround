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


function RenameDialog ({ isOpen, setIsOpen, round, setRoundName }) {
    const firebase = useContext(FirebaseContext);
    const textField = useRef(null)
    const handleClose = () => {
        setIsOpen(false)
    }
    const onOkClick = () => {
        const newName = textField.current.querySelectorAll("input")[0].value
        console.log('on rename click', newName);
        setRoundName(newName)
        firebase.updateRound(round.id, { name: newName })
        setIsOpen(false)
    }
    return (
        <Dialog open={isOpen} onClose={handleClose} aria-labelledby="form-dialog-title">
            <DialogTitle id="form-dialog-title">Rename</DialogTitle>
            <DialogContent>
                <TextField
                    ref={textField}
                    defaultValue={round.name}
                    autoFocus
                    margin="dense"
                    id="name"
                    fullWidth
                />
            </DialogContent>
            <DialogActions>
                <Button onClick={handleClose}>
                    Cancel
          </Button>
                <Button onClick={onOkClick}>
                    Rename
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
        setRoundName
    }
)(RenameDialog);