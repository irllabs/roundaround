import React, { useRef } from 'react';
const classNames = require('classnames');
import styles from './ControlsBar.styles.scss';
import _ from 'lodash'


const ControlsBar = ({
    isOn,
    togglePlay,
    shareRound,
    toggleSettings,
    toggleSidebar,
    toggleProfile,
    mode,
    user
}) => {
    const playButton = useRef();
    const onClickPlay = () => {
        togglePlay();
    }

    const onFullscreenClick = () => {
        var element = document.documentElement;
        if (_.isNil(document.fullscreenElement)) {
            if (element.requestFullscreen) {
                element.requestFullscreen();
            } else if (element.webkitRequestFullscreen) { /* Safari */
                element.webkitRequestFullscreen();
            } else if (element.msRequestFullscreen) { /* IE11 */
                element.msRequestFullscreen();
            }
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            } else if (document.webkitExitFullscreen) { /* Safari */
                document.webkitExitFullscreen();
            } else if (document.msExitFullscreen) { /* IE11 */
                document.msExitFullscreen();
            }
        }
    }

    return (
        <>
            <div className={classNames(styles.controlsBar, styles.top)}>
                <div>
                    <button
                        ref={playButton}
                        type="button"
                        onClick={onClickPlay}
                    // onTouchEnd={onClickPlay}
                    >
                        {isOn ? 'Stop' : 'Start'}
                    </button>
                    {
                        mode !== 'collaboration' &&
                        <button
                            type="button"
                            onClick={shareRound}
                        >
                            Share
                        </button>
                    }
                </div>

            </div>
            <div className={classNames(styles.controlsBar, styles.bottom)}>
                {
                    user &&
                    <button
                        type="button"
                        onClick={toggleProfile}
                    >
                        Profile
                    </button>
                }
                {
                    user &&
                    <button
                        type="button"
                        onClick={onFullscreenClick}
                    >
                        Fullscreen
                    </button>
                }

                {
                    mode !== 'collaboration' &&
                    <button
                        type="button"
                        onClick={toggleSidebar}
                    >
                        Project
                    </button>

                }
            </div>
        </>
    );
}


export default ControlsBar;
