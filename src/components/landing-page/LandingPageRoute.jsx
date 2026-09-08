import React, { Component } from 'react'
import { connect } from "react-redux";
import _ from 'lodash';
import { setIsShowingSignInDialog, setRedirectAfterSignIn, setRounds } from '../../redux/actions'
import { createRound } from '../../utils/index'
import { FirebaseContext } from '../../firebase';
import { Button } from '@/components/ui/button';
import { MUI_BUTTON, MUI_PRIMARY } from '@/lib/mui';
import { cn } from '@/lib/utils';

class LandingPageRoute extends Component {
    static contextType = FirebaseContext;
    constructor(props) {
        super(props);
        this.onGetStartedClick = this.onGetStartedClick.bind(this);
    }
    async onGetStartedClick() {
        if (!_.isNil(this.props.user)) {
            if (!this.props.user.isGuest) {
                // redirect to /rounds list
                this.props.history.push('/rounds')
            } else {
                // guest user so create new round and go there instead of rounds list
                let newRound = await createRound(this.props.user.id)
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
        // MUI's Container at its default maxWidth="lg", which this theme puts at 1200px, with
        // the JSS root's `height: 100%` and centred flex layout. `sm:px-6` is the theme's 500px
        // breakpoint, which src/index.css already defines.
        return (
            <div className="mx-auto flex h-full w-full max-w-[1200px] items-center justify-center px-4 pt-16 sm:px-6">
                {/* Grid container spacing={3}: margin -12px, width calc(100% + 24px). */}
                <div className="-m-3 flex w-[calc(100%+24px)] flex-wrap">
                    {/* Grid item xs=12 md=6 at spacing 3: 12px of padding, half the row from
                        the md (900px) breakpoint up and the whole row below it. */}
                    <div className="w-full p-3 md:w-1/2">
                        {/* The browser's own h1: 2em of the inherited 14px body font = 28px, a
                            0.67em margin of its own size = 18.76px, and the body's 1.43 line
                            height, which is what puts the headline on 40px lines. The <p> is
                            the same default at 1em. Both are spelled out rather than left to
                            the base-layer revert so they survive PR 3 dropping CssBaseline. */}
                        <h1 className="my-[18.76px] text-[28px] font-bold leading-[1.43]">Gather around, make music, and have fun.</h1>
                        <p className="my-[14px]">Rounds is a multi-person live-sampling step-sequencer with social features.  It runs in the browser or as a Native iOS application, with the following steps: compose a pattern (or "Round"), make variations and save presets, share a link to have someone join you with additional layers.  Rounds is best on a recent iPad.</p>
                        <div className="mt-8 w-full text-center">
                            <Button
                                className={cn(MUI_BUTTON, MUI_PRIMARY, 'mt-4')}
                                onClick={this.onGetStartedClick}
                                data-test="button-get-started"
                            >
                                Get started
                            </Button>
                        </div>
                    </div>
                    <div className="w-full p-3 md:w-1/2">
                        <video width="100%" controls poster="https://firebasestorage.googleapis.com/v0/b/roundaround.appspot.com/o/marketing%2Froundaround-demo.jpg?alt=media&token=07a12429-bc4a-4de2-8f43-031a471367d8">
                            <source src="https://firebasestorage.googleapis.com/v0/b/roundaround.appspot.com/o/marketing%2Froundaround-demo.mp4?alt=media&token=5e7388f0-3037-4596-b569-ca97bff02c6c" type="video/mp4" />
                            Your browser does not support the video tag.
                        </video>
                    </div>
                </div>
            </div>
        )
    }
}

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
)(LandingPageRoute);
