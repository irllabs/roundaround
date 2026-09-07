import React from 'react'
import Box from '@material-ui/core/Box'
import Button from '@material-ui/core/Button'
import Typography from '@material-ui/core/Typography'

/**
 * Last line of defence: a render-time exception anywhere below shows a message with a way out
 * instead of a blank page.
 */
export default class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props)
        this.state = { error: null }
    }

    static getDerivedStateFromError(error) {
        return { error }
    }

    componentDidCatch(error, info) {
        console.error('Unhandled error in the UI', error, info)
    }

    render() {
        if (this.state.error) {
            const message = this.state.error && this.state.error.message ? this.state.error.message : String(this.state.error)
            return (
                <Box role="alert" style={{ padding: '4rem 2rem', textAlign: 'center' }}>
                    <Typography variant="h5" gutterBottom>Something went wrong.</Typography>
                    <Typography color="textSecondary" gutterBottom>{message}</Typography>
                    <Button variant="contained" color="primary" disableElevation onClick={() => window.location.assign('/rounds')}>
                        Back to my rounds
                    </Button>
                </Box>
            )
        }
        return this.props.children
    }
}
