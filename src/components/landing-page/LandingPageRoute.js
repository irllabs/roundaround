import React, { Component } from 'react'
import PropTypes from 'prop-types';
import { withStyles } from '@material-ui/styles';
import Container from '@material-ui/core/Container';
import Grid from '@material-ui/core/Grid';
import Button from '@material-ui/core/Button';
import { connect } from "react-redux";
import _ from 'lodash';
import { setIsShowingSignInDialog, setRedirectAfterSignIn, setRounds } from '../../redux/actions'
import { createRound } from '../../utils/index'
import { FirebaseContext } from '../../firebase';

const styles = theme => ({
    root: {
        paddingTop: '64px',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        display: 'flex'
    },
    container: {
    },
    left: {
        paddingRight: '2rem'
    },
    right: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
    },
    video: {
        width: '100%',
        paddingBottom: '66%',
        backgroundColor: '#303030'
    },
    getStartedButton: {
        marginTop: '1rem'
    }
})

class LandingPageRoute extends Component {
    static contextType = FirebaseContext;
    constructor(props) {
        super(props);
        this.onGetStartedClick = this.onGetStartedClick.bind(this);
    }

    componentDidMount() {
        // console.log("this.props.user: ", this.props.user)
        if (this.props.user && this.props.user.id) {
            if (!this.props.user.isGuest) {
                // redirect to /rounds list
                this.props.history.push('/rounds')
            } else {
                // guest user so create new round and go there instead of rounds list
                let newRound = createRound(this.props.user.id)
                let newRounds = [newRound]
                this.context.createRound(newRound).then(() => {
                    this.props.setRounds(newRounds)
                    this.props.history.push('/play/' + newRound.id)
                }).catch(err => {
                    console.log("error: ", err)
                })
            }
        }
    }

    componentDidUpdate(prevProps, prevState) {
        if (prevProps.user == null && this.props.user && this.props.user.id) {
            // console.log("this.props.user: ", this.props.user)
            if (!this.props.user.isGuest) {
                // redirect to /rounds list
                this.props.history.push('/rounds')
            } else {
                // guest user so create new round and go there instead of rounds list
                let newRound = createRound(this.props.user.id)
                let newRounds = [newRound]
                this.context.createRound(newRound).then(() => {
                    this.props.setRounds(newRounds)
                    this.props.history.push('/play/' + newRound.id)
                }).catch(err => {
                    console.log("error: ", err)
                })
            }
        }
    }

    async onGetStartedClick() {
        if (!_.isNil(this.props.user)) {
            if (!this.props.user.isGuest) {
                // redirect to /rounds list
                this.props.history.push('/rounds')
            } else {
                // guest user so create new round and go there instead of rounds list
                let newRound = createRound(this.props.user.id)
                let newRounds = [newRound]
                await this.context.createRound(newRound)
                this.props.setRounds(newRounds)
                this.props.history.push('/play/' + newRound.id)
            }
        } else {
            // show sign in dialog
            this.props.setRedirectAfterSignIn('/rounds')
            this.props.setIsShowingSignInDialog(true)
        }
    }
    render() {
        const { classes } = this.props;
        return (
            <>
                <Container className={classes.root}>
                    <Grid container className={classes.container} spacing={3}>
                        <Grid item xs={12} sm={12} md={6}>
                            <h1>Gather around, make music, and have fun.</h1>
                            <p>Rounds is a multi-person live-sampling step-sequencer with social features.  It runs in the browser or as a Native iOS application, with the following steps: compose a pattern (or "Round"), make variations and save presets, share a link to have someone join you with additional layers.  Rounds is best on a recent iPad.</p>
                            <div style={{ width: "100%", textAlign: "center", marginTop: "2rem" }}>
                                <Button className={classes.getStartedButton} variant="contained" color="primary" disableElevation onClick={this.onGetStartedClick}>Get started</Button>

                            </div>
                        </Grid>
                        <Grid item xs={12} sm={12} md={6}>
                            <video width="100%" controls poster="https://firebasestorage.googleapis.com/v0/b/roundaround.appspot.com/o/marketing%2Froundaround-demo.jpg?alt=media&token=07a12429-bc4a-4de2-8f43-031a471367d8">
                                <source src="https://firebasestorage.googleapis.com/v0/b/roundaround.appspot.com/o/marketing%2Froundaround-demo2.mp4?alt=media&token=9321b383-4ec7-4e48-9f2c-7989977bc025" type="video/mp4" />
                                Your browser does not support the video tag.
                            </video>
                        </Grid>
                    </Grid>
                </Container>

            </>
        )
    }
}
LandingPageRoute.propTypes = {
    classes: PropTypes.object.isRequired,
};

const mapStateToProps = state => {
    return {
        user: state.user
    };
};

export default connect(
    mapStateToProps,
    {
        setIsShowingSignInDialog,
        setRedirectAfterSignIn,
        setRounds
    }
)(withStyles(styles)(LandingPageRoute));
