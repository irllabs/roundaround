import React, { useState, useEffect, useContext, useRef } from 'react';
import { connect } from "react-redux";
import { FirebaseContext } from '../../firebase';
import QRCode from 'qrcode'
import { setIsShowingShareDialog, setRoundShortLink } from '../../redux/actions'
import { AppDialog, AppDialogBody } from './AppDialog'
import { MUI_BUTTON, MUI_SECONDARY } from '@/lib/mui'
import { OutlinedField } from '../fields/OutlinedField'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import _ from 'lodash'

const getFullUrl = (roundId) => window.location.origin + '/play/' + roundId

const ShareDialog = ({ round, isShowingShareDialog, setIsShowingShareDialog, setRoundShortLink }) => {
    const firebase = useContext(FirebaseContext);
    const fieldRef = useRef(null)
    const canvasRef = useRef(null)
    const [link, setLink] = useState('')
    const [copied, setCopied] = useState(false)

    const roundId = round ? round.id : null
    const storedShortLink = round ? round.shortLink : null

    // Resolve the link to show: the stored short link, otherwise ask the backend for one,
    // otherwise fall back to the full URL. The full URL always works, so a shortener
    // failure is never fatal.
    useEffect(() => {
        if (!isShowingShareDialog || _.isNil(roundId)) {
            return undefined
        }
        let cancelled = false
        const fullUrl = getFullUrl(roundId)
        setLink(_.isEmpty(storedShortLink) ? fullUrl : storedShortLink)
        setCopied(false)

        if (_.isEmpty(storedShortLink)) {
            firebase.createShortLink(roundId)
                .then((result) => {
                    if (cancelled || _.isNil(result) || _.isEmpty(result.link)) {
                        return
                    }
                    setLink(result.link)
                    setRoundShortLink(result.link)
                })
                .catch((error) => {
                    // Not fatal: the full URL is already shown.
                    console.warn('Could not create a short link', error)
                })
        }

        return () => {
            cancelled = true
        }
    }, [isShowingShareDialog, roundId, storedShortLink, firebase, setRoundShortLink])

    // The QR code always encodes the full URL so it keeps working if the shortener does not.
    useEffect(() => {
        if (!isShowingShareDialog || _.isNil(roundId)) {
            return undefined
        }
        const timer = setTimeout(() => {
            if (canvasRef.current) {
                QRCode.toCanvas(canvasRef.current, getFullUrl(roundId), (error) => {
                    if (error) {
                        console.error(error)
                    }
                })
            }
        }, 100)
        return () => clearTimeout(timer)
    }, [isShowingShareDialog, roundId])

    const handleClose = () => {
        setIsShowingShareDialog(false)
    }

    const onCopyClick = async () => {
        try {
            if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(link)
            } else if (fieldRef.current) {
                // OutlinedField hands its ref to the wrapper, which is where MUI's TextField put
                // one; the <input> the fallback needs is the one inside it.
                const input = fieldRef.current.querySelectorAll('input')[0]
                input.focus()
                input.select()
                document.execCommand('copy')
                input.blur()
            }
            setCopied(true)
        } catch (error) {
            console.warn('Could not copy the link', error)
        }
    }

    return (
        <AppDialog open={isShowingShareDialog} onOpenChange={(next) => { if (!next) handleClose() }} titleId="share-dialog-title" title="Share project" titleClassName="text-center">
            <AppDialogBody>
                <p className="my-[14px]">Use the QR code or link to join the collaboration.</p>
                <div className="flex items-center justify-center p-4">
                    {/* No Tailwind width: the canvas keeps the intrinsic size QRCode gives it,
                        which capture.py checks against QR_SIZES before it masks the code. */}
                    <canvas ref={canvasRef} id="QRCanvas" aria-label="QR code for this round's link" role="img"></canvas>
                </div>
                {/* The paper is 358px wide on 10-share-dialog.png because this row is: the
                    194px field (a default 20-character input plus its 28px of padding), 16px, the
                    100px Copy button, and the button's own 16px right margin. All four are
                    load-bearing -- the JSS put marginRight on both children, and dropping the
                    button's takes the paper to 342px. */}
                <div className="flex">
                    <OutlinedField ref={fieldRef} className="mr-4" id="share-link" label="Link" value={link} onChange={() => {}} inputProps={{ readOnly: true }} />
                    <Button className={cn(MUI_BUTTON, MUI_SECONDARY, 'mr-4 min-w-[100px] shrink-0')} onClick={onCopyClick}>{copied ? 'Copied' : 'Copy'}</Button>
                </div>
            </AppDialogBody>
        </AppDialog>
    );
}
const mapStateToProps = state => {
    return {
        round: state.round,
        isShowingShareDialog: state.display.isShowingShareDialog
    };
};

export default connect(
    mapStateToProps,
    {
        setIsShowingShareDialog,
        setRoundShortLink
    }
)(ShareDialog);
