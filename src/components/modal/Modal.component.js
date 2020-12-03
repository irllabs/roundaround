import React, { useRef } from 'react';

var classNames = require('classnames');
import styles from './Modal.styles.scss';


const ModalComponent = ({ isOpen, onModalClose, allowCloseByClickOutside = true, children }) => {
  const onModalClick = (event) => {
    event.stopPropagation();
  }

  return (
  <div 
    className={isOpen ? classNames(styles.modal, styles.open) : classNames(styles.modal, styles.closed)}
    onClick={allowCloseByClickOutside ? onModalClose : null}
    key="instrument-modal"
  >
    <div 
    key="modal-background"
    onClick={onModalClick}
    className={styles.modalContent}>
      {children}
      <span
        key="close"
        className={styles.close}
        onClick={onModalClose}
      >&times;</span>
    </div>

  </div>
  );
}

export default ModalComponent;
