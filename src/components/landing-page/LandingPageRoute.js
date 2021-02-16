import React, { Component } from 'react'
import PropTypes from 'prop-types';
import { withStyles } from '@material-ui/styles';
import Box from '@material-ui/core/Box';
import Container from '@material-ui/core/Container';
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
        display: 'flex',
        flexDirection: 'row',

        width: '100%',
        maxWidth: '1000px'
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
        width: '520px',
        height: '300px',
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
                    <Box className={classes.container}>
                        <Box className={classes.left}>
                            <h1>Gather around, make music, and have fun.</h1>
                            <p>Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo. Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt.</p>
                            <Button className={classes.getStartedButton} variant="contained" color="primary" disableElevation onClick={this.onGetStartedClick}>Get started</Button>
                        </Box>
                        <Box className={classes.right}>
                            <Box className={classes.video}>
                            </Box>
                        </Box>
                    </Box>
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
