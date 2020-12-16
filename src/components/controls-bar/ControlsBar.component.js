import React, { useRef } from 'react';
const classNames = require('classnames');
import styles from './ControlsBar.styles.scss';


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
                <button
                    type="button"
                    onClick={toggleSettings}
                >
                    Settings
                </button>
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
