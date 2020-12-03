import React, { useRef, useState, useEffect } from 'react';
import { withRouter } from 'react-router-dom';
var classNames = require('classnames');
import styles from './CollaborationLink.styles.scss';


const CollaborationLink = ({ link, history }) => {
  const [copied, setCopied] = useState(false);
  const linkField = useRef();

  const selectLink = () => {
    linkField.current.select();
    linkField.current.setSelectionRange(0, 99999);
    document.execCommand("copy");
    setCopied(true);
  }

  const onLinkInputChange = (event) => {
    event.preventDefault();
  }

  const goToCollab = () => {
    const path = link.long_url.split('#')[1];
    console.log(path, link)
    history.push(path);
  }

  useEffect(() => {
    setCopied(false);
  }, [link])
  
  return (
    <div 
      key="link-container"
      className={styles.selectCobntainer}
    >
      <div className={styles.linkContainer}>
        <span className={styles.tooltiptext}>{copied ? 'Copied!' : 'Copy to clipboard'}</span>
        <input
          className={styles.link}
          ref={linkField}
          onClick={selectLink}
          onChange={onLinkInputChange}
          value={link.link}
          spellCheck="false"
        />
      </div>
      <button
        className={styles.redirectButton}
        onClick={goToCollab}
      >
        Go!
      </button>
    </div>
  );
}

export default withRouter(CollaborationLink);
