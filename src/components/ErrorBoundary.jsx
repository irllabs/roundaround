import React from 'react'
import { FirebaseContext } from '../firebase'
import { MUI_BUTTON } from './dialogs/AppDialog'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

/**
 * Last line of defence: a render-time exception anywhere below shows a message with a way out
 * instead of a blank page.
 */
export default class ErrorBoundary extends React.Component {
    static contextType = FirebaseContext;

    constructor(props) {
        super(props)
        this.state = { error: null }
    }

    static getDerivedStateFromError(error) {
        return { error }
    }

    componentDidCatch(error, info) {
        if (this.context && this.context.reportError) {
            // reportError logs to the console as well as to analytics.
            this.context.reportError(error, { fatal: true, context: 'render' })
        } else {
            console.error('Unhandled error in the UI', error)
        }
        // The component stack is local detail: it stays in the console, out of the analytics event.
        console.error(info.componentStack)
    }

    render() {
        if (this.state.error) {
            const message = this.state.error && this.state.error.message ? this.state.error.message : String(this.state.error)
            return (
                <div role="alert" className="px-8 py-16 text-center">
                    {/* MUI's h5 and body1, and gutterBottom's 0.35em. */}
                    <p className="mb-[0.35em] mt-0 text-2xl leading-[1.334]">Something went wrong.</p>
                    <p className="mb-[0.35em] mt-0 text-base leading-6 tracking-[0.00938em] text-white/70">{message}</p>
                    <Button className={cn(MUI_BUTTON, 'bg-primary text-primary-foreground hover:bg-primary/90')} onClick={() => window.location.assign('/rounds')}>
                        Back to my rounds
                    </Button>
                </div>
            )
        }
        return this.props.children
    }
}
