import React from 'react';
import styles from './TopBar.styles.scss';

const TopBar = ({ isOn, togglePlay, toggleSettings }) => (
  <div className={styles.topBar}>
    <button
      type="button"
      onClick={toggleSettings}
    >
      Settings
    </button>
    <button
      type="button"
      onClick={togglePlay}
    >
      { isOn ? 'Stop' : 'Start' }
    </button>
  </div>
);

export default TopBar;
