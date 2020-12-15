import React, { useState, useEffect, useContext, useRef } from 'react';
import * as Tone from 'tone';
import { withRouter } from 'react-router-dom';
import { connect } from "react-redux";
import { setRoundData, setRounds, toggleLoader, resetRoundsStore, resetRaycasterStore, resetCameraStore, resetEditingModeStore, resetLoaderStore } from "../../redux/actions";
import { ThrottleDelay } from '../../utils/constants';
import { getDefaultRoundData } from '../../utils/dummyData';
import GraphicsContext from '../graphics-context/GraphicsContext.component';
import ControlsBar from '../controls-bar/ControlsBar.component';
import SettingsPane from '../settings-pane/SettingsPane.component';
import LinkGenerator from '../collaboration/link-generator/LinkGenerator.component';
import Sidebar from '../sidebar/Sidebar.component';
import Modal from '../modal/Modal.component';
import Profile from '../profile/Profile.component';
import clock from '../../models/Clock';
import { FirebaseContext } from '../../firebase';

import styles from './SessionRoute.styles.scss';
import HtmlUi from '../html-ui/HtmlUi';

function usePrevious (value) {
  const ref = useRef();
  useEffect(() => {
    ref.current = value;
  });
  return ref.current;
}

let throttleLock = false;
let throttleQueue = 0;
let roundDataForUpdate = null;
let fromBackend = false;

const SessionRoute = ({
  round,
  rounds,
  setRoundData,
  setRounds,
  toggleLoader,
  resetRoundsStore,
  resetRaycasterStore,
  resetCameraStore,
  resetEditingModeStore,
  resetLoaderStore
}) => {
  const [clockIsRunning, setClockIsRunning] = useState(clock.isRunning);
  const [settingsOpened, setSettingsOpened] = useState(false);
  const [sidebarOpened, setSidebarOpened] = useState(false);
  const [profileOpened, setProfileOpened] = useState(false);
  const [sharingLink, setSharingLink] = useState(false);
  const firebase = useContext(FirebaseContext);
  const prevRounds = usePrevious(rounds);
  const didMountRef = useRef(false);

  useEffect(() => {
    console.log('initiate session route')
    const user = firebase.currentUser;
    firebase.db.collection('rounds').where('user', '==', user.uid).get().then((querySnapshot) => {
      console.log('got rounds')
      const tempDoc = querySnapshot.docs.map((doc) => {
        return { id: doc.id, ...doc.data() }
      })
      toggleLoader(false);
      console.log('tempDoc', tempDoc)
      const currentRound = tempDoc[0];
      fromBackend = true;
      if (!currentRound) {
        // create new
        console.log('create new round')
        const dummyData = getDefaultRoundData(user.uid);
        firebase.db.collection('rounds')
          .doc(dummyData.id)
          .set(dummyData, { merge: false })
          .catch(e => {
            console.log(e);
          })
        setRoundData(dummyData);
        setRounds([dummyData]);
      } else {
        setRoundData(currentRound);
        setRounds(tempDoc);
      }
    })
      .catch(e => {
        console.log(e);
      })


    return () => {
      resetRoundsStore()
      resetRaycasterStore()
      resetCameraStore()
      resetEditingModeStore()
      resetLoaderStore()
      //   clock.stop();
      console.log('session route getting unmounted')
    }
  }, []);

  const throttle = () => {
    throttleLock = true;
    setTimeout(() => {
      console.log('update round')
      firebase.db.collection('rounds')
        .doc(roundDataForUpdate.id)
        .set(roundDataForUpdate, { merge: true })
        .catch(e => {
          console.log(e);
        })
      // check queue, if queue - self-repeat and eraise queue      
      if (throttleQueue) {
        throttleQueue = 0;
        throttle(roundDataForUpdate);
      } else {
        throttleLock = false;
      }
    }, ThrottleDelay)
  }

  useEffect(() => {
    if (!round) return;
    if (fromBackend) {
      fromBackend = false;
      return;
    }
    roundDataForUpdate = round;

    if (throttleLock) {
      throttleQueue = 1;
      return;
    } else {
      throttle();
    }
  }, [round])

  useEffect(() => {
    if (didMountRef.current && prevRounds.length) {
      console.log(JSON.parse(JSON.stringify(prevRounds)))
      if (prevRounds.length < rounds.length) {
        //add new to firebase
        toggleLoader(true);
        let roundToAdd = rounds.find(x => !prevRounds.includes(x) && (x.id !== round.id));
        console.log('add round')
        firebase.db.collection('rounds')
          .doc(roundToAdd.id)
          .set(roundToAdd, { merge: false })
          .then(() => {
            toggleLoader(false);
          }).catch((e) => {
            console.log(e)
            toggleLoader(false);
          });
      }
      if (prevRounds.length > rounds.length) {
        // remove round
        toggleLoader(true);
        let roundToRemove = prevRounds.find(x => !rounds.includes(x));
        console.log('remove round')
        firebase.db.collection("rounds")
          .doc(roundToRemove.id)
          .delete()
          .then(() => {
            toggleLoader(false);
          }).catch((e) => {
            console.log(e)
            toggleLoader(false);
          });

        // check if current round is removed
        if (!rounds.includes(round)) {
          console.log('selected round got removed');
          setRoundData(rounds[0])
        }
      }
    } else {
      didMountRef.current = true;
    }
  }, [rounds])

  const shareRound = () => {
    setSharingLink(true);
  }

  const toggleSharing = () => {
    setSharingLink(!sharingLink);
  }

  const togglePlay = async () => {
    if (Tone.context.state !== 'running') {
      await Tone.start();
    }

    clock.toggle();
    setClockIsRunning(clock.isRunning);
  };

  const toggleSettings = () => {
    setSettingsOpened(!settingsOpened);
  };

  const toggleSidebar = () => {
    setSidebarOpened(!sidebarOpened)
  }

  const toggleProfile = () => {
    setProfileOpened(!profileOpened)
  }

  return (
    <>
      <Modal
        onModalClose={toggleProfile}
        isOpen={profileOpened}
      >
        <Profile />
      </Modal>
      {
        round &&
        <>
          <Sidebar
            isOpen={sidebarOpened}
            toggleSidebar={toggleSidebar}
          />
          <div className={styles.mainContainer}>
            <HtmlUi />
            <ControlsBar
              user={firebase.currentUser}
              isOn={clockIsRunning}
              shareRound={shareRound}
              toggleProfile={toggleProfile}
              togglePlay={togglePlay}
              toggleSettings={toggleSettings}
              toggleSidebar={toggleSidebar}
            />
            <SettingsPane
              isActive={settingsOpened}
            />
          </div>
          <LinkGenerator
            sharing={sharingLink}
            toggleSharing={toggleSharing}
            round={round}
          />
        </>
      }
    </>
  )
}

const mapStateToProps = state => {
  return {
    round: state.round,
    rounds: state.rounds
  };
};

export default connect(
  mapStateToProps,
  {
    setRounds,
    setRoundData,
    toggleLoader,
    resetRoundsStore,
    resetRaycasterStore,
    resetCameraStore,
    resetEditingModeStore,
    resetLoaderStore
  }
)(withRouter(SessionRoute));