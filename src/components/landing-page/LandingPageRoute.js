import React, { Component } from 'react'
import PropTypes from 'prop-types';
import { withStyles } from '@material-ui/styles';
import Box from '@material-ui/core/Box';
import Container from '@material-ui/core/Container';
import Grid from '@material-ui/core/Grid';
import Button from '@material-ui/core/Button';
import { connect } from "react-redux";
import _ from 'lodash';
import { setIsShowingSignInDialog, setRedirectAfterSignIn } from '../../redux/actions'

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
    constructor (props) {
        super(props);
        this.onGetStartedClick = this.onGetStartedClick.bind(this);
    }
    onGetStartedClick () {
        if (!_.isNil(this.props.user)) {
            // redirect to /play
            this.props.history.push('/rounds')
        } else {
            // show sign in dialog
            this.props.setRedirectAfterSignIn('/rounds')
            this.props.setIsShowingSignInDialog(true)
        }
    }
    render () {
        const { classes } = this.props;
        return (
            <>
                <Container className={classes.root}>
                    <Grid container className={classes.container} spacing={3}>
                        <Grid item xs={12} sm={12} md={6}>
                            <h1>Gather around, make music, and have fun.</h1>
                            <p>Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo. Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt.</p>
                            <Button className={classes.getStartedButton} variant="contained" color="primary" disableElevation onClick={this.onGetStartedClick}>Get started</Button>
                        </Grid>
                        <Grid item xs={12} sm={12} md={6}>
                            <Box className={classes.video}>
                            </Box>
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
        setRedirectAfterSignIn
    }
)(withStyles(styles)(LandingPageRoute));
