import app from 'firebase/app';
import 'firebase/auth';
import 'firebase/firestore';

var firebaseConfig = {
    apiKey: "AIzaSyAuU25cV2Asaz_eKpyQGo_8mfpp_QhzwLk",
    authDomain: "roundaround.firebaseapp.com",
    databaseURL: "https://roundaround.firebaseio.com",
    projectId: "roundaround",
    storageBucket: "roundaround.appspot.com",
    messagingSenderId: "452710212242",
    appId: "1:452710212242:web:bc8e14cc0478112fb4bc4b",
    measurementId: "G-BX73P1R2TB"
};

class Firebase {
    constructor() {
      app.initializeApp(firebaseConfig);
      this.app = app;
      this.currentUser = null;
      this.auth = app.auth();
      this.db = app.firestore();
      this.firestore = app.firestore;
      this.onUserUpdatedObservers = [];

      app.auth().onAuthStateChanged((user) => {
        if (user) {
          this.currentUser = user;
          this.onUserUpdatedObservers.map(observer => observer(user));
        } else {
          // No user is signed in.
          this.currentUser = null;
          this.onUserUpdatedObservers.map(observer => observer({}));
        }
      });
    }

    // *** Auth API ***
    doCreateUserWithEmailAndPassword = (email, password) =>
    this.auth.createUserWithEmailAndPassword(email, password);

    doSignInWithEmailAndPassword = (email, password) =>
    this.auth.signInWithEmailAndPassword(email, password);

    doSignOut = () => this.auth.signOut();

    doPasswordReset = email => this.auth.sendPasswordResetEmail(email);
 
    doPasswordUpdate = password =>
      this.auth.currentUser.updatePassword(password);

    setOnUserUpdated = (callback) =>
        this.onUserUpdated = callback;

    // *** Firebase API ***
    getRound = async(roundId) => {
        try {
            const doc = await this.db.collection('rounds').doc(roundId).get()
            return { id: doc.id, ...doc.data() };
        } catch (e) {
            console.error(e)
        }
    }

    createRound = async(roundId, data) => {
        try {
            await this.db.collection('rounds')
            .doc(roundId)
            .set(data, { merge: false })
        } catch (e) {
            console.error(e)
        }
    }

    updateRound = async(roundId, data) => {
        // console.log(data)
        try {
            await this.db.collection('rounds')
            .doc(roundId)
            .set(data, { merge: true })
        } catch (e) {
            console.error(e)
        }
    }

    getCollaboration = async(collabId) => {
        try {
            const doc = await this.db.collection('collaborations').doc(collabId).get();
            return { id: doc.id, ...doc.data() };
        } catch (e) {
            console.error(e)
        }
    }

    updateCollaboration = async(collabId, data) => {
        // console.log(data)
        try {
            await this.db.collection('collaborations')
            .doc(collabId)
            .set(data, { merge: true })
        } catch (e) {
            console.error(e)
        }
    }
  }
   
export default Firebase;