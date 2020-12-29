import React, { useEffect, useContext } from 'react';
import { connect } from "react-redux";
import { setRoundData, updateRound, addRound, removeRound } from "../../redux/actions";
import { getDefaultRoundData } from '../../utils/dummyData';
import { FirebaseContext } from '../../firebase';
import Button from '@material-ui/core/Button';
import _ from 'lodash'

const classNames = require('classnames');

import Footer from './Footer.component';
import styles from './Sidebar.styles.scss';

const Sidebar = ({
  isOpen,
  toggleSidebar,
  rounds,
  round,
  setRoundData,
  updateRound,
  addRound,
  removeRound
}) => {
  const firebase = useContext(FirebaseContext);

  const onRoundSelect = (event) => {
    const { index, id } = event.target.dataset;

    //check if not selected
    if (id !== round.id) {
      setRoundData(rounds[index]);
      // update ex round in rounds
      const exRound = rounds.find(item => item.id === round.id);
      const exRoundIndex = rounds.indexOf(exRound);
      console.log('update round on round select');
      updateRound(round, exRoundIndex)
    }
  }

  const onRemoveRound = (event) => {
    event.stopPropagation();
    removeRound(event.target.dataset.index);
  }

  const onAddRound = () => {
    addRound(getDefaultRoundData(firebase.currentUser.uid));
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

  useEffect(() => {
    // update user with last visited round
    if (!firebase.currentUser) return;

    const userData = JSON.parse(firebase.currentUser.displayName);
    firebase.currentUser.updateProfile({
      displayName: JSON.stringify({ ...userData, lastVisitedRound: round.id })
    }).then(function () {
      console.log(`last visited round updated: `, round.id);
    })
      .catch(e => console.error())
  }, [round.id])

  return (
    <div className={isOpen ? classNames(styles.sidenav, styles.open) : styles.sidenav}>
      <div className={styles.header}>
        <a className={styles.headerText}>Current Session: </a>
        <a className={styles.closeBtn} onClick={toggleSidebar}>&times;</a>
      </div>
      {
        rounds.map((roundItem, index) => {
          return (
            <a
              key={roundItem.id}
              data-index={index}
              data-id={roundItem.id}
              className={roundItem.id == round.id ? styles.selected : styles.unselected}
              onClick={onRoundSelect}
            >
              {roundItem.name}
              {
                rounds.length > 1 &&
                <div
                  data-index={index}
                  onClick={onRemoveRound}
                  className={styles.removeBtn}>&times;</div>
              }
            </a>
          )
        })
      }
      <Button onClick={onFullscreenClick} variant="outlined">Fullscreen</Button>
      <Footer
        addRound={onAddRound}
      />
    </div>
  );
};

const mapStateToProps = state => {
  return {
    round: state.round,
    rounds: state.rounds
  };
};

export default connect(
  mapStateToProps,
  {
    setRoundData,
    updateRound,
    addRound,
    removeRound
  }
)(Sidebar);