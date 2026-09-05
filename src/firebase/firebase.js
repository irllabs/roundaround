// The compat entry points keep the namespaced (v8-style) API this wrapper was written against
// while running on the current SDK. Moving each product to the modular API is the next step.
import app from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';
import 'firebase/compat/functions';
import 'firebase/compat/storage';
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

const DELETE_BATCH_SIZE = 64

// Thin wrapper around the Firebase SDK. Every method is a plain async function: on failure it
// rejects, so callers can catch and show something instead of waiting on a promise that never
// settles. Access control lives in firestore.rules / storage.rules.
class Firebase {
    constructor() {
        if (!app.apps.length) {
            app.initializeApp(firebaseConfig);
        }

        // add this for local function development
        //app.functions().useFunctionsEmulator('http://localhost:5001')

        this.app = app;
        this.currentUser = null;
        this.auth = app.auth();
        this.db = app.firestore();
        this.firestore = app.firestore;
        this.functions = app.functions()
        this.storage = app.storage()
        this.onUserUpdatedObservers = [];

        app.auth().onAuthStateChanged((user) => {
            this.currentUser = user || null;
            this.onUserUpdatedObservers.forEach(observer => observer(this.currentUser));
        });
    }

    // *** Users ***
    loadUser = async (id) => {
        const userSnapshot = await this.db.collection('users').doc(id).get()
        return userSnapshot.exists ? { id: userSnapshot.id, ...userSnapshot.data() } : null
    }

    createUser = async (userData) => {
        const user = _.cloneDeep(userData)
        delete user.id
        await this.db.collection('users').doc(userData.id).set(user)
    }

    updateUser = async (id, userData) => {
        const user = _.cloneDeep(userData)
        delete user.id
        await this.db.collection('users').doc(id).set(user, { merge: true })
    }

    signOut = () => this.auth.signOut();

    // *** Cloud Functions ***
    // Both callables take a single { roundId } object; identity comes from the auth token server-side.
    getJitsiToken = async (roundId) => {
        const getJaasToken = this.functions.httpsCallable('getJaasToken');
        const result = await getJaasToken({ roundId })
        return result.data // { token, appId, room }
    }

    createShortLink = async (roundId) => {
        const createShortLink = this.functions.httpsCallable('createShortLink');
        const result = await createShortLink({ roundId })
        return result.data // { link }
    }

    // *** Rounds ***
    getRoundsList = async (userId, minimumVersion = 1) => {
        const roundsSnapshot = await this.db
            .collection("rounds")
            .where('createdBy', '==', userId)
            .orderBy('createdAt', 'desc')
            .get();
        const rounds = []
        roundsSnapshot.forEach(roundDoc => {
            const round = { ...roundDoc.data(), id: roundDoc.id }
            if (round.dataVersion >= minimumVersion) {
                rounds.push(round);
            }
        })
        return rounds
    }

    /** Resolves to null when the round does not exist. */
    getRound = async (roundId) => {
        const roundSnapshot = await this.db.collection('rounds').doc(roundId).get()
        if (!roundSnapshot.exists) {
            return null
        }
        const [layers, userBuses, userPatterns] = await Promise.all([
            this.getLayers(roundId),
            this.getUserBuses(roundId),
            this.getUserPatterns(roundId)
        ])
        return { id: roundSnapshot.id, ...roundSnapshot.data(), layers, userBuses, userPatterns }
    }

    getLayers = async (roundId) => {
        const layerSnapshot = await this.db
            .collection("rounds")
            .doc(roundId)
            .collection('layers')
            .get();
        const layers = []
        layerSnapshot.forEach(layerDoc => {
            layers.push({ ...layerDoc.data(), id: layerDoc.id });
        })
        return layers
    }

    getUserBuses = async (roundId) => {
        const userBusesSnapshot = await this.db
            .collection("rounds")
            .doc(roundId)
            .collection('userBuses')
            .get();
        const userBuses = {}
        userBusesSnapshot.forEach(userBusDoc => {
            userBuses[userBusDoc.id] = { ...userBusDoc.data(), id: userBusDoc.id };
        })
        return userBuses
    }

    getUserPatterns = async (roundId) => {
        const userPatternsSnapshot = await this.db
            .collection("rounds")
            .doc(roundId)
            .collection('userPatterns')
            .get();
        const allUserPatterns = {}
        userPatternsSnapshot.forEach(userPatternsDoc => {
            allUserPatterns[userPatternsDoc.id] = { ...userPatternsDoc.data(), id: userPatternsDoc.id };
        })
        return allUserPatterns
    }

    /** Deletes every document in a collection, in batches. */
    deleteCollection = async (collectionRef) => {
        let snapshot = await collectionRef.limit(DELETE_BATCH_SIZE).get();
        while (snapshot.size > 0) {
            const batch = this.db.batch();
            snapshot.docs.forEach(doc => batch.delete(doc.ref));
            await batch.commit();
            if (snapshot.size < DELETE_BATCH_SIZE) {
                break
            }
            snapshot = await collectionRef.limit(DELETE_BATCH_SIZE).get();
        }
    }

    /** Deletes a round together with its layers, user buses and user patterns. */
    deleteRound = async (round) => {
        const roundRef = this.db.collection('rounds').doc(round.id)
        await this.deleteCollection(roundRef.collection('layers'))
        await this.deleteCollection(roundRef.collection('userBuses'))
        await this.deleteCollection(roundRef.collection('userPatterns'))
        await roundRef.delete()
    }

    deleteLayer = async (roundId, layerId) => {
        await this.db.collection('rounds').doc(roundId).collection('layers').doc(layerId).delete()
    }

    createRound = async (data) => {
        const round = _.cloneDeep(data)
        const layers = round.layers || []
        delete round.layers
        const userBuses = Object.entries(round.userBuses || {}).map(([userId, userBus]) => ({ ...userBus, id: userId }))
        delete round.userBuses
        const allUserPatterns = Object.entries(round.userPatterns || {}).map(([userId, userPatterns]) => ({ ...userPatterns, id: userId }))
        delete round.userPatterns
        round.createdAt = Date.now()

        await this.db.collection('rounds').doc(data.id).set(round)
        await Promise.all([
            ...layers.map(layer => this.createLayer(data.id, layer)),
            ...userBuses.map(userBus => this.createUserBus(data.id, userBus.id, userBus)),
            ...allUserPatterns.map(userPatterns => this.saveUserPatterns(data.id, userPatterns.id, userPatterns))
        ])
        return round
    }

    createLayer = async (roundId, layerData) => {
        const layer = _.cloneDeep(layerData)
        await this.db.collection('rounds')
            .doc(roundId)
            .collection('layers')
            .doc(layer.id)
            .set(layer)
    }

    createUserBus = async (roundId, id, userBus) => {
        const userBusClone = _.cloneDeep(userBus)
        delete userBusClone.id
        await this.db.collection('rounds')
            .doc(roundId)
            .collection('userBuses')
            .doc(id)
            .set(userBusClone)
    }

    saveUserPatterns = async (roundId, userId, userPatterns) => {
        const userPatternsClone = _.cloneDeep(userPatterns)
        delete userPatternsClone.id
        await this.db.collection('rounds')
            .doc(roundId)
            .collection('userPatterns')
            .doc(userId)
            .set(userPatternsClone)
    }

    updateRound = async (roundId, data) => {
        await this.db.collection('rounds').doc(roundId).set(data, { merge: true })
    }

    /** Adds a user to a round's members atomically (no read-modify-write of the array). */
    joinRound = async (roundId, userId) => {
        await this.db.collection('rounds').doc(roundId).set({
            currentUsers: app.firestore.FieldValue.arrayUnion(userId)
        }, { merge: true })
    }

    updateLayer = async (roundId, layerId, data) => {
        await this.db.collection('rounds')
            .doc(roundId)
            .collection('layers')
            .doc(layerId)
            .set(data, { merge: true })
    }

    updateUserBus = async (roundId, userId, userBus) => {
        await this.db.collection('rounds')
            .doc(roundId)
            .collection('userBuses')
            .doc(userId)
            .set(userBus, { merge: true })
    }

    // *** Custom samples ***
    createSample = async (sample) => {
        const sampleClone = _.cloneDeep(sample)
        delete sampleClone.id
        delete sampleClone.localURL
        await this.db.collection('samples').doc(sample.id).set(sampleClone)
    }

    getSample = async (id) => {
        const snapshot = await this.db.collection('samples').doc(id).get()
        return snapshot.exists ? { id: snapshot.id, ...snapshot.data() } : null
    }

    deleteSample = async id => {
        await this.db.collection('samples').doc(id).delete()
    }

    updateSample = async (sample) => {
        const sampleClone = _.cloneDeep(sample)
        delete sampleClone.id
        delete sampleClone.localURL
        await this.db.collection('samples').doc(sample.id).set(sampleClone, { merge: true })
    }

    getSamples = async (userId) => {
        const samplesSnapshot = await this.db
            .collection("samples")
            .where('createdBy', '==', userId)
            .get();
        const samples = []
        samplesSnapshot.forEach(sampleDoc => {
            samples.push({ ...sampleDoc.data(), id: sampleDoc.id });
        })
        return samples
    }
}

export default Firebase;
