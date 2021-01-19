import app from 'firebase/app';
import 'firebase/auth';
import 'firebase/firestore';
import _ from 'lodash'

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
    constructor () {
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
    getRound = async (roundId) => {
        console.log('getRound', roundId);
        return new Promise(async (resolve, reject) => {
            try {
                const roundSnapshot = await this.db.collection('rounds').doc(roundId).get()
                const round = { id: roundSnapshot.id, ...roundSnapshot.data(), layers: [] }
                round.layers = await this.getLayers(roundId)
                round.userBuses = await this.getUserBuses(roundId)
                console.log('got round', round);
                resolve(round)
            } catch (e) {
                console.error(e)
            }
        })
    }

    getLayers = async (roundId) => {
        return new Promise(async (resolve, reject) => {
            let layers = []
            try {
                const layerSnapshot = await this.db
                    .collection("rounds")
                    .doc(roundId)
                    .collection('layers')
                    .get();
                layerSnapshot.forEach(layerDoc => {
                    let layer = layerDoc.data();
                    layer.id = layerDoc.id;
                    layer.steps = []
                    layers.push(layer);
                })

                for (const layer of layers) {
                    layer.steps = await this.getSteps(roundId, layer.id)

                }


                resolve(layers)
            }
            catch (e) {
                console.error(e)
                reject(e)
            }
        })
    }

    getSteps = async (roundId, layerId) => {
        return new Promise(async (resolve, reject) => {
            let steps = []
            try {
                const stepSnapshot = await this.db
                    .collection("rounds")
                    .doc(roundId)
                    .collection('layers')
                    .doc(layerId)
                    .collection('steps')
                    .get();
                stepSnapshot.forEach(stepDoc => {
                    let step = stepDoc.data();
                    step.id = stepDoc.id;
                    steps.push(step);
                })
                steps = _.orderBy(steps, 'order')
                resolve(steps)
            }
            catch (e) {
                console.error(e)
                reject(e)
            }
        })
    }
    getUserBuses = async (roundId) => {
        return new Promise(async (resolve, reject) => {
            let userBuses = {}
            try {
                const userBusesSnapshot = await this.db
                    .collection("rounds")
                    .doc(roundId)
                    .collection('userBuses')
                    .get();
                userBusesSnapshot.forEach(userBusDoc => {
                    let userBus = userBusDoc.data();
                    userBus.id = userBusDoc.id;
                    userBuses[userBus.id] = userBus;
                })
                resolve(userBuses)
            }
            catch (e) {
                console.error(e)
                reject(e)
            }
        })
    }


    setSteps = async (roundId, layerId, steps) => {
        // first delete the current steps in the db
        await this.deleteSteps(roundId, layerId)
        // add steps
        for (const step of steps) {
            this.createStep(roundId, layerId, step)
        }
    }

    deleteSteps = async (roundId, layerId) => {
        const ref = this.db.collection("rounds")
            .doc(roundId)
            .collection('layers')
            .doc(layerId)
            .collection('steps')
        return this.deleteCollection(ref)
    }

    deleteCollection = async (collectionRef) => {
        return this.deleteQueryBatch(this.db, collectionRef.limit(64));
    }
    deleteQueryBatch = async (db, query) => {
        return new Promise(async (resolve, reject) => {
            const snapshot = await query.get();
            if (snapshot.size > 0) {
                let batch = db.batch();
                snapshot.docs.forEach(doc => {
                    batch.delete(doc.ref);
                });
                await batch.commit();
                resolve()
            } else {
                resolve()
            }
        })
    }

    deleteLayer = async (roundId, layerId) => {
        await this.deleteSteps(roundId, layerId)
        this.db.collection('rounds').doc(roundId).collection('layers').doc(layerId).delete()
    }

    createRound = async (roundId, data) => {
        console.log('createRound()', roundId, data);
        return new Promise(async (resolve, reject) => {
            let round = _.cloneDeep(data)
            const layers = [...round.layers]
            delete round.layers
            const userBuses = []
            for (const [userId, userBus] of Object.entries(round.userBuses)) {
                userBus.id = userId
                userBuses.push(userBus)
            }
            delete round.userBuses
            try {
                await this.db.collection('rounds')
                    .doc(roundId)
                    .set(round)
                for (const layer of layers) {
                    await this.createLayer(roundId, layer)
                }
                for (const userBus of userBuses) {
                    await this.createUserBus(roundId, userBus.id, userBus)
                }
                resolve(round)
            } catch (e) {
                console.error(e)
            }
        })
    }

    createLayer = async (roundId, layerData) => {
        return new Promise(async (resolve, reject) => {
            let layer = _.cloneDeep(layerData)
            const steps = [...layer.steps]
            delete layer.steps
            try {
                await this.db.collection('rounds')
                    .doc(roundId)
                    .collection('layers')
                    .doc(layer.id)
                    .set(layer)
                let batch = this.db.batch()
                for (const step of steps) {
                    let stepRef = this.db.collection('rounds')
                        .doc(roundId)
                        .collection('layers')
                        .doc(layer.id)
                        .collection('steps')
                        .doc(step.id)
                    batch.set(stepRef, step)
                    //this.createStep(roundId, layer.id, step)
                }
                await batch.commit()
                resolve()
            } catch (e) {
                console.error(e)
            }
        })
    }

    createStep = async (roundId, layerId, step) => {
        return new Promise(async (resolve, reject) => {
            try {
                await this.db.collection('rounds')
                    .doc(roundId)
                    .collection('layers')
                    .doc(layerId)
                    .collection('steps')
                    .doc(step.id)
                    .set(step)
                resolve()
            } catch (e) {
                console.error(e)
            }
        })
    }

    createUserBus = async (roundId, id, userBus) => {
        return new Promise(async (resolve, reject) => {
            try {
                delete userBus.id
                await this.db.collection('rounds')
                    .doc(roundId)
                    .collection('userBuses')
                    .doc(id)
                    .set(userBus)
                resolve()
            } catch (e) {
                console.error(e)
            }
        })
    }

    updateRound = async (roundId, data) => {
        //console.log('updateRound', roundId, data)
        try {
            await this.db.collection('rounds')
                .doc(roundId)
                .set(data, { merge: true })
        } catch (e) {
            console.error(e)
        }
    }

    updateLayer = async (roundId, layerId, data) => {
        //   console.log('updateLayer', roundId, data)
        try {
            await this.db.collection('rounds')
                .doc(roundId)
                .collection('layers')
                .doc(layerId)
                .set(data, { merge: true })
        } catch (e) {
            console.error(e)
        }
    }

    updateStep = async (roundId, layerId, stepId, step) => {
        try {
            await this.db.collection('rounds')
                .doc(roundId)
                .collection('layers')
                .doc(layerId)
                .collection('steps')
                .doc(stepId)
                .set(step)
        } catch (e) {
            console.error(e)
        }
    }

    updateUserBus = async (roundId, userId, userBus) => {
        console.log('firebase::updateUserBus()', roundId, userId, userBus);
        return new Promise(async (resolve, reject) => {
            try {
                await this.db.collection('rounds')
                    .doc(roundId)
                    .collection('userBuses')
                    .doc(userId)
                    .set(userBus, { merge: true })
                resolve()
            } catch (e) {
                console.error(e)
            }
        })
    }

    getCollaboration = async (collabId) => {
        try {
            const doc = await this.db.collection('collaborations').doc(collabId).get();
            return { id: doc.id, ...doc.data() };
        } catch (e) {
            console.error(e)
        }
    }

    updateCollaboration = async (collabId, data) => {
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