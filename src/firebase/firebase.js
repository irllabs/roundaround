// The modular ("v9") entry points: every product is imported as tree-shakeable functions, so the
// bundle only carries the parts of the SDK this wrapper actually calls.
import { getApp, getApps, initializeApp } from 'firebase/app';
import {
    createUserWithEmailAndPassword,
    getAuth,
    GoogleAuthProvider,
    onAuthStateChanged as onAuthStateChangedSdk,
    signInAnonymously as signInAnonymouslySdk,
    signInWithEmailAndPassword,
    signInWithPopup,
    signOut as signOutSdk
} from 'firebase/auth';
import {
    arrayRemove,
    arrayUnion,
    collection,
    deleteDoc,
    doc,
    getDoc,
    getDocs,
    getFirestore,
    limit,
    onSnapshot,
    orderBy,
    query,
    setDoc,
    where,
    writeBatch
} from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { deleteObject, getStorage, ref } from 'firebase/storage';
import { getAnalytics, isSupported, logEvent } from 'firebase/analytics';
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
// Analytics event descriptions are truncated to what GA4 accepts.
const MAX_DESCRIPTION_LENGTH = 150

// Thin wrapper around the Firebase SDK: it owns every call into Firebase so the rest of the app
// never touches an SDK object. Every method is a plain async function (or, for the subscriptions,
// returns an unsubscribe): on failure it rejects, so callers can catch and show something instead
// of waiting on a promise that never settles. Access control lives in firestore.rules /
// storage.rules.
class Firebase {
    constructor() {
        this.app = getApps().length ? getApp() : initializeApp(firebaseConfig);
        this.auth = getAuth(this.app);
        this.db = getFirestore(this.app);
        this.functions = getFunctions(this.app);
        // add this for local function development
        //connectFunctionsEmulator(this.functions, 'localhost', 5001)
        this.storage = getStorage(this.app);
        this.analytics = null;
        this.initAnalytics();
    }

    // *** Auth ***
    /** Calls `cb` with the auth user (or null) whenever it changes. Returns the unsubscribe. */
    onAuthStateChanged = (cb) => onAuthStateChangedSdk(this.auth, cb);

    /** Each sign-in resolves to the auth user, so callers never see an SDK credential. */
    signInWithGoogle = async () => {
        const credential = await signInWithPopup(this.auth, new GoogleAuthProvider())
        return credential.user
    }

    signInWithEmail = async (email, password) => {
        const credential = await signInWithEmailAndPassword(this.auth, email, password)
        return credential.user
    }

    signUpWithEmail = async (email, password) => {
        const credential = await createUserWithEmailAndPassword(this.auth, email, password)
        return credential.user
    }

    signInAnonymously = async () => {
        const credential = await signInAnonymouslySdk(this.auth)
        return credential.user
    }

    signOut = () => signOutSdk(this.auth);

    // *** Users ***
    loadUser = async (id) => {
        const userSnapshot = await getDoc(doc(this.db, 'users', id))
        return userSnapshot.exists() ? { id: userSnapshot.id, ...userSnapshot.data() } : null
    }

    /** Creates or completes a user profile. Merges so two writers (sign-up dialog and the auth observer) cannot wipe each other's fields. */
    createUser = async (userData) => {
        const user = _.cloneDeep(userData)
        delete user.id
        await setDoc(doc(this.db, 'users', userData.id), user, { merge: true })
    }

    updateUser = async (id, userData) => {
        const user = _.cloneDeep(userData)
        delete user.id
        await setDoc(doc(this.db, 'users', id), user, { merge: true })
    }

    /**
     * Watches one user profile. Delivers `{ exists, data }` on every change (`data` is undefined
     * once the profile is gone). Returns the unsubscribe.
     */
    subscribeToUser = (userId, onNext, onError) => onSnapshot(
        doc(this.db, 'users', userId),
        snapshot => onNext({ exists: snapshot.exists(), data: snapshot.data() }),
        onError
    )

    // *** Cloud Functions ***
    // Both callables take a single { roundId } object; identity comes from the auth token server-side.
    getJitsiToken = async (roundId) => {
        const getJaasToken = httpsCallable(this.functions, 'getJaasToken');
        const result = await getJaasToken({ roundId })
        return result.data // { token, appId, room }
    }

    createShortLink = async (roundId) => {
        const createShortLink = httpsCallable(this.functions, 'createShortLink');
        const result = await createShortLink({ roundId })
        return result.data // { link }
    }

    // *** Rounds ***
    getRoundsList = async (userId, minimumVersion = 1) => {
        const roundsSnapshot = await getDocs(query(
            collection(this.db, 'rounds'),
            where('createdBy', '==', userId),
            orderBy('createdAt', 'desc')
        ));
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
        const roundSnapshot = await getDoc(doc(this.db, 'rounds', roundId))
        if (!roundSnapshot.exists()) {
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
        const layerSnapshot = await getDocs(collection(this.db, 'rounds', roundId, 'layers'));
        const layers = []
        layerSnapshot.forEach(layerDoc => {
            layers.push({ ...layerDoc.data(), id: layerDoc.id });
        })
        return layers
    }

    getUserBuses = async (roundId) => {
        const userBusesSnapshot = await getDocs(collection(this.db, 'rounds', roundId, 'userBuses'));
        const userBuses = {}
        userBusesSnapshot.forEach(userBusDoc => {
            userBuses[userBusDoc.id] = { ...userBusDoc.data(), id: userBusDoc.id };
        })
        return userBuses
    }

    getUserPatterns = async (roundId) => {
        const userPatternsSnapshot = await getDocs(collection(this.db, 'rounds', roundId, 'userPatterns'));
        const allUserPatterns = {}
        userPatternsSnapshot.forEach(userPatternsDoc => {
            allUserPatterns[userPatternsDoc.id] = { ...userPatternsDoc.data(), id: userPatternsDoc.id };
        })
        return allUserPatterns
    }

    /**
     * Watches a round document. Delivers `{ exists, data }` on every change (`data` is undefined
     * once the round is deleted). Returns the unsubscribe.
     */
    subscribeToRound = (roundId, onNext, onError) => onSnapshot(
        doc(this.db, 'rounds', roundId),
        snapshot => onNext({ exists: snapshot.exists(), data: snapshot.data() }),
        onError
    )

    /**
     * Shared by the three round sub-collection subscriptions below. Delivers the changes of every
     * snapshot as an array of `{ type: 'added'|'modified'|'removed', id, data }`.
     */
    subscribeToRoundSubCollection = (roundId, name, onChanges, onError) => onSnapshot(
        collection(this.db, 'rounds', roundId, name),
        snapshot => onChanges(snapshot.docChanges().map(change => ({
            type: change.type,
            id: change.doc.id,
            data: change.doc.data()
        }))),
        onError
    )

    subscribeToLayers = (roundId, onChanges, onError) => this.subscribeToRoundSubCollection(roundId, 'layers', onChanges, onError)

    subscribeToUserBuses = (roundId, onChanges, onError) => this.subscribeToRoundSubCollection(roundId, 'userBuses', onChanges, onError)

    subscribeToUserPatterns = (roundId, onChanges, onError) => this.subscribeToRoundSubCollection(roundId, 'userPatterns', onChanges, onError)

    /** Deletes every document in a collection, in batches. */
    deleteCollection = async (collectionRef) => {
        let snapshot = await getDocs(query(collectionRef, limit(DELETE_BATCH_SIZE)));
        while (snapshot.size > 0) {
            const batch = writeBatch(this.db);
            snapshot.docs.forEach(docSnapshot => batch.delete(docSnapshot.ref));
            await batch.commit();
            if (snapshot.size < DELETE_BATCH_SIZE) {
                break
            }
            snapshot = await getDocs(query(collectionRef, limit(DELETE_BATCH_SIZE)));
        }
    }

    /** Deletes a round together with its layers, user buses and user patterns. */
    deleteRound = async (round) => {
        const roundRef = doc(this.db, 'rounds', round.id)
        await this.deleteCollection(collection(roundRef, 'layers'))
        await this.deleteCollection(collection(roundRef, 'userBuses'))
        await this.deleteCollection(collection(roundRef, 'userPatterns'))
        await deleteDoc(roundRef)
    }

    deleteLayer = async (roundId, layerId) => {
        await deleteDoc(doc(this.db, 'rounds', roundId, 'layers', layerId))
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

        await setDoc(doc(this.db, 'rounds', data.id), round)
        await Promise.all([
            ...layers.map(layer => this.createLayer(data.id, layer)),
            ...userBuses.map(userBus => this.createUserBus(data.id, userBus.id, userBus)),
            ...allUserPatterns.map(userPatterns => this.saveUserPatterns(data.id, userPatterns.id, userPatterns))
        ])
        return round
    }

    createLayer = async (roundId, layerData) => {
        const layer = _.cloneDeep(layerData)
        await setDoc(doc(this.db, 'rounds', roundId, 'layers', layer.id), layer)
    }

    createUserBus = async (roundId, id, userBus) => {
        const userBusClone = _.cloneDeep(userBus)
        delete userBusClone.id
        await setDoc(doc(this.db, 'rounds', roundId, 'userBuses', id), userBusClone)
    }

    saveUserPatterns = async (roundId, userId, userPatterns) => {
        const userPatternsClone = _.cloneDeep(userPatterns)
        delete userPatternsClone.id
        await setDoc(doc(this.db, 'rounds', roundId, 'userPatterns', userId), userPatternsClone)
    }

    updateRound = async (roundId, data) => {
        await setDoc(doc(this.db, 'rounds', roundId), data, { merge: true })
    }

    /**
     * Adds a user to a round's members and to its contributors atomically (no read-modify-write of
     * either array). `currentUsers` is who is in the round now; `contributors` is everyone who has
     * ever been in it, so their layers keep their colour once they have gone.
     */
    joinRound = async (roundId, userId) => {
        await setDoc(doc(this.db, 'rounds', roundId), {
            currentUsers: arrayUnion(userId),
            contributors: arrayUnion(userId)
        }, { merge: true })
    }

    /**
     * The join a round whose security rules predate `contributors` still accepts: it changes
     * `currentUsers` and nothing else. Only for the `permission-denied` fallback in PlayRoute —
     * once the rules from this branch are deployed, `joinRound` above is the one that runs, and the
     * missing contributors entry is added on the next open.
     */
    joinRoundLegacy = async (roundId, userId) => {
        await setDoc(doc(this.db, 'rounds', roundId), {
            currentUsers: arrayUnion(userId)
        }, { merge: true })
    }

    /** Takes a user out of a round's members. Nobody is ever taken out of `contributors`. */
    leaveRound = async (roundId, userId) => {
        await setDoc(doc(this.db, 'rounds', roundId), {
            currentUsers: arrayRemove(userId)
        }, { merge: true })
    }

    /**
     * Gives a round written before `contributors` existed the list it should have had. A union, so
     * two clients opening the round at the same time cannot drop each other's ids, and so a second
     * run adds nothing. Does not write when there is nothing to add.
     */
    backfillContributors = async (roundId, userIds) => {
        if (_.isEmpty(userIds)) {
            return
        }
        await setDoc(doc(this.db, 'rounds', roundId), {
            contributors: arrayUnion(...userIds)
        }, { merge: true })
    }

    updateLayer = async (roundId, layerId, data) => {
        await setDoc(doc(this.db, 'rounds', roundId, 'layers', layerId), data, { merge: true })
    }

    updateUserBus = async (roundId, userId, userBus) => {
        await setDoc(doc(this.db, 'rounds', roundId, 'userBuses', userId), userBus, { merge: true })
    }

    // *** Custom samples ***
    createSample = async (sample) => {
        const sampleClone = _.cloneDeep(sample)
        delete sampleClone.id
        delete sampleClone.localURL
        await setDoc(doc(this.db, 'samples', sample.id), sampleClone)
    }

    getSample = async (id) => {
        const snapshot = await getDoc(doc(this.db, 'samples', id))
        return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null
    }

    deleteSample = async id => {
        await deleteDoc(doc(this.db, 'samples', id))
    }

    /** Deletes the uploaded .wav behind a sample. Storage paths are `{userId}/{sampleId}.wav`. */
    deleteSampleFile = async (userId, sampleId) => {
        await deleteObject(ref(this.storage, `${userId}/${sampleId}.wav`))
    }

    updateSample = async (sample) => {
        const sampleClone = _.cloneDeep(sample)
        delete sampleClone.id
        delete sampleClone.localURL
        await setDoc(doc(this.db, 'samples', sample.id), sampleClone, { merge: true })
    }

    getSamples = async (userId) => {
        const samplesSnapshot = await getDocs(query(
            collection(this.db, 'samples'),
            where('createdBy', '==', userId)
        ));
        const samples = []
        samplesSnapshot.forEach(sampleDoc => {
            samples.push({ ...sampleDoc.data(), id: sampleDoc.id });
        })
        return samples
    }

    // *** Analytics / error reporting ***
    /**
     * Analytics only runs in a production build, and only where the browser supports it. It never
     * loads under `yarn start` or in tests, so neither sends events to the live property.
     */
    initAnalytics = async () => {
        if (import.meta.env.MODE !== 'production') {
            return
        }
        try {
            if (await isSupported()) {
                this.analytics = getAnalytics(this.app)
            }
        } catch {
            // Analytics is best effort: a blocked measurement script must not break the app.
        }
    }

    /**
     * Reports an error as an Analytics `exception` event when analytics is running, and always to
     * the console. Descriptions carry no PII: pass a `context` that names the place that failed,
     * never an email address, user id or round id.
     */
    reportError = (error, { fatal = false, context } = {}) => {
        const name = (error && error.name) || 'Error'
        const message = (error && error.message) || String(error)
        const description = `${name}: ${message}${_.isNil(context) ? '' : ` [${context}]`}`.slice(0, MAX_DESCRIPTION_LENGTH)
        if (!_.isNil(this.analytics)) {
            logEvent(this.analytics, 'exception', { description, fatal })
        }
        console.error(description, error)
    }
}

export default Firebase;
