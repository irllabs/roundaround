import React, { useState, useContext, useRef } from 'react';
import { connect } from "react-redux";
import { setIsShowingSignInDialog, setSignUpDisplayName, setUser, setRounds, setRedirectAfterSignIn } from '../../redux/actions'
import { FirebaseContext } from '../../firebase';
import { getRandomColor } from '../../utils/index'
import { AppDialog, AppDialogBody, MUI_BUTTON } from './AppDialog'
import { OutlinedField } from '../fields/OutlinedField'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

import _ from 'lodash'

/** MUI's contained secondary Button, which this dialog uses for all four choices. */
const CHOICE_BUTTON = 'mb-4 w-full bg-secondary text-white hover:bg-secondary/90'
/** MUI's contained primary Button, which submits each of the three forms. */
const SUBMIT_BUTTON = 'mb-4 w-full bg-primary text-primary-foreground hover:bg-primary/90'
/** The JSS `emailFormItem`: 1rem below, and the 300px that makes the form steps 332px wide. */
const FORM_FIELD = 'mb-4 min-w-[300px]'
/** The JSS `error`. */
const ERROR = 'mb-8 text-center font-semibold'

const SignInDialog = ({ isShowingSignInDialog, setIsShowingSignInDialog, setSignUpDisplayName, setUser, setRounds, redirectAfterSignIn, setRedirectAfterSignIn }) => {
    const firebaseContext = useContext(FirebaseContext);
    const onClose = () => {
        setIsShowingEmailForm(false)
        setIsShowingEmailSignupForm(false)
        setErrorMessage(null)
        setIsShowingSignInDialog(false)
        setIsShowingUseAsGuestForm(false)
    }
    const [isShowingEmailForm, setIsShowingEmailForm] = useState(false)
    const [isShowingUseAsGuestForm, setIsShowingUseAsGuestForm] = useState(false)
    const [isShowingEmailSignupForm, setIsShowingEmailSignupForm] = useState(false)
    const [errorMessage, setErrorMessage] = useState(null)

    const emailAddressInput = useRef()
    const emailAddressSignupInput = useRef()
    const passwordInput = useRef()
    const passwordSignupInput = useRef()
    const displayNameSignupInput = useRef()
    const displayNameGuestInput = useRef()

    const onGoogleSigninClick = async () => {
        onClose()
        try {
            await firebaseContext.signInWithGoogle()
            // const authUser = authResult.user
            /*let user = await firebaseContext.loadUser(authUser.uid)
            if (_.isNil(user)) {
                //new user, create user document
                user = {
                    displayName: authUser.displayName,
                    email: authUser.email,
                    avatar: authUser.photoURL,
                    id: authUser.uid,
                    color: getRandomColor(),
                    isGuest: false,
                }
                await firebaseContext.createUser(user)
                setUser(user)
            }
            if (!_.isNil(redirectAfterSignIn)) {
                location.push(redirectAfterSignIn)
                setRedirectAfterSignIn(null)
            }*/
        } catch (e) {
        }
    }

    const onShowEmailSigninClick = () => {
        setIsShowingEmailForm(true)
    }

    const onEmailSigninClick = async () => {
        const email = emailAddressInput.current.querySelectorAll("input")[0].value
        const password = passwordInput.current.querySelectorAll("input")[0].value
        try {
            await firebaseContext.signInWithEmail(email, password)
            onClose()
        } catch (e) {
            setErrorMessage(e.message)
        }
    }

    const onEmailSignupClick = async () => {
        const email = emailAddressSignupInput.current.querySelectorAll("input")[0].value
        const password = passwordSignupInput.current.querySelectorAll("input")[0].value
        const displayName = displayNameSignupInput.current.querySelectorAll("input")[0].value
        if (!_.isEmpty(displayName)) {
            try {
                const authUser = await firebaseContext.signUpWithEmail(email, password)
                let user = {
                    displayName,
                    email: email,
                    id: authUser.uid,
                    color: getRandomColor(),
                    isGuest: false,
                }
                await firebaseContext.createUser(user)
                setUser(user)
                onClose()

            } catch (e) {
                setErrorMessage(e.message)
            }
        } else {
            setErrorMessage('Please enter a name')
        }
    }

    const onShowEmailSignupClick = () => {
        setIsShowingEmailForm(false)
        setIsShowingEmailSignupForm(true)
        setIsShowingUseAsGuestForm(false)
    }

    const onUseAsGuestClick = () => {
        setIsShowingUseAsGuestForm(true)
    }

    const onContinueAsGuestClick = async () => {
        const displayName = displayNameGuestInput.current.querySelectorAll("input")[0].value
        if (!_.isEmpty(displayName)) {
            try {
                const authUser = await firebaseContext.signInAnonymously()
                let user = {
                    isGuest: true,
                    displayName,
                    id: authUser.uid,
                    color: getRandomColor()
                }
                await firebaseContext.createUser(user)
                setUser(user)
                onClose()
            } catch (e) {
                setErrorMessage(e.message)
            }
        } else {
            setErrorMessage('Please enter a name')
        }
    }

    const onBackClick = () => {
        setIsShowingEmailForm(false)
        setIsShowingEmailSignupForm(false)
        setErrorMessage(null)
        setIsShowingUseAsGuestForm(false)
    }

    const isShowingChoices = !isShowingEmailForm && !isShowingEmailSignupForm && !isShowingUseAsGuestForm
    const title = isShowingChoices ? 'Sign in'
        : isShowingEmailForm ? 'Sign in with email'
            : isShowingUseAsGuestForm ? 'Continue as guest'
                : 'Sign up with email'

    // One AppDialog whose title and body change with the step, not one per step. MUI kept a
    // single Dialog mounted and swapped its children, and so does this. Four separate AppDialogs
    // would unmount and remount the paper on every step change, which runs Radix's close (focus
    // back to the opener) and reopen (autofocus the first tabbable child, i.e. the back arrow)
    // where MUI only swapped markup. Mounted once, focus stays where MUI left it: FocusScope's
    // mutation observer moves it onto the paper when the clicked button goes away.
    return (
        <AppDialog
            open={isShowingSignInDialog}
            onOpenChange={(next) => { if (!next) onClose() }}
            titleId="simple-dialog-title"
            title={title}
            titleClassName="text-center"
            onBack={isShowingChoices ? undefined : onBackClick}
            backLabel="close"
        >
            {
                isShowingChoices &&
                // A plain block, and the buttons are inline-flex siblings with no whitespace
                // between them: the paper is shrink-to-fit, so its width is the sum of their
                // max-content widths (472px on 02-signin-choice.png). A flex column would
                // collapse it to the widest one, about 200px.
                <AppDialogBody>
                    <Button className={cn(MUI_BUTTON, CHOICE_BUTTON)} onClick={onGoogleSigninClick}>Continue with Google</Button>
                    <Button className={cn(MUI_BUTTON, CHOICE_BUTTON)} onClick={onShowEmailSigninClick} data-test="button-email">Sign in with email</Button>
                    <Button className={cn(MUI_BUTTON, CHOICE_BUTTON)} onClick={onUseAsGuestClick} data-test="button-guest">Use as guest</Button>
                    <p className="my-[14px] text-center">Don&apos;t have an account yet?</p>
                    {/* No mb-4: the JSS `signUpButton` is `{ fontWeight: 600 }` and nothing else.
                        Measured on the shipped build, MUI's Sign up button has margin-bottom 0,
                        and adding 16px here makes 02 355px tall against the baseline's 339. */}
                    <Button variant="plain" className={cn(MUI_BUTTON, 'w-full font-semibold')} onClick={onShowEmailSignupClick}>Sign up</Button>
                </AppDialogBody>
            }
            {
                isShowingEmailForm &&
                <AppDialogBody>
                    {/* type="submit" rather than MUI's onClick: the generated Button is a bare
                        <button>, whose type in a form defaults to submit, so an onClick here
                        would run the handler twice. Enter and the click now share onSubmit. */}
                    <form className="flex flex-col" noValidate autoComplete="off" onSubmit={(e) => { e.preventDefault(); onEmailSigninClick() }}>
                        <OutlinedField ref={emailAddressInput} className={FORM_FIELD} id="signin-email" label="Email address" type="email" data-test="input-email" />
                        <OutlinedField ref={passwordInput} className={FORM_FIELD} id="signin-password" label="Password" type="password" data-test="input-password" />
                        {
                            errorMessage &&
                            <p className={ERROR}>{errorMessage}</p>
                        }
                        <Button type="submit" className={cn(MUI_BUTTON, SUBMIT_BUTTON)} data-test="button-sign-in">
                            <strong>Sign in</strong>
                        </Button>
                    </form>
                </AppDialogBody>
            }
            {
                isShowingUseAsGuestForm &&
                <AppDialogBody>
                    <form className="flex flex-col" noValidate autoComplete="off" onSubmit={(e) => { e.preventDefault(); onContinueAsGuestClick() }}>
                        <OutlinedField ref={displayNameGuestInput} className={FORM_FIELD} id="guest-name" label="Name" data-test="input-name" />
                        {
                            errorMessage &&
                            <p className={ERROR}>{errorMessage}</p>
                        }
                        <Button type="submit" className={cn(MUI_BUTTON, SUBMIT_BUTTON)} data-test="button-name">
                            <strong>Continue as guest</strong>
                        </Button>
                        <p className="my-[14px] text-center">Don&apos;t have an account yet?</p>
                        {/* No mb-4, same as the choice step: 04's paper is 306px, not 322px. */}
                        <Button type="button" variant="plain" className={cn(MUI_BUTTON, 'w-full font-semibold')} onClick={onShowEmailSignupClick}>Sign up</Button>
                    </form>
                </AppDialogBody>
            }
            {
                isShowingEmailSignupForm &&
                <AppDialogBody>
                    <form className="flex flex-col" noValidate autoComplete="off" onSubmit={(e) => { e.preventDefault(); onEmailSignupClick() }}>
                        <OutlinedField ref={displayNameSignupInput} className={FORM_FIELD} id="signup-name" label="Name" />
                        <OutlinedField ref={emailAddressSignupInput} className={FORM_FIELD} id="signup-email" label="Email address" type="email" />
                        <OutlinedField ref={passwordSignupInput} className={FORM_FIELD} id="signup-password" label="Password" type="password" />
                        {
                            errorMessage &&
                            <p className={ERROR}>{errorMessage}</p>
                        }
                        <Button type="submit" className={cn(MUI_BUTTON, SUBMIT_BUTTON)}><strong>Sign up</strong></Button>
                    </form>
                </AppDialogBody>
            }
        </AppDialog>
    );
}

const mapStateToProps = state => {
    return {
        user: state.user,
        isShowingSignInDialog: state.display.isShowingSignInDialog,
        redirectAfterSignIn: state.display.redirectAfterSignIn
    };
};

export default connect(
    mapStateToProps,
    {
        setIsShowingSignInDialog,
        setSignUpDisplayName,
        setUser,
        setRounds,
        setRedirectAfterSignIn
    }
)(SignInDialog);
