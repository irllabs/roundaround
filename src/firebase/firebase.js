import app from 'firebase/app';
import 'firebase/auth';
import 'firebase/firestore';
import 'firebase/functions';
import _ from 'lodash'
import firebase from 'firebase'

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
        if (!firebase.apps.length) {
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
            if (user) {
                this.currentUser = user;
                this.onUserUpdatedObservers.map(observer => observer(user));
            } else {
                // No user is signed in.
                this.currentUser = null;
                this.onUserUpdatedObservers.map(observer => observer(null));
            }
        });
    }

    uploadSound = (id, sounds) => {
        return new Promise(async (resolve, reject) => {
            try {
                const storageRef = this.storage.ref()
                const currentUserStorageRef = storageRef.child(`/${id}`)
                const fileURLs = []
                if (id && sounds && Array.isArray(sounds)) {
                    sounds.forEach(async sound => {
                        await currentUserStorageRef.child(sound.name).put(sound.file).then(async (uploadResponse) => {
                            const url = await uploadResponse.ref.getDownloadURL()
                            fileURLs.push(url)
                            if (fileURLs.length === sounds.length) {
                                resolve(fileURLs)
                            }
                        })
                    })
                }
                else reject({ message: 'missing required data' })
            } catch (e) {
                console.error(e)
            }
        })
    }

    // User
    loadUser = (id) => {
        // console.log('firebase::loadUser()', id);
        return new Promise(async (resolve, reject) => {
            try {
                const userSnapshot = await this.db.collection('users').doc(id).get()
                if (userSnapshot.exists) {
                    resolve({ id: userSnapshot.id, ...userSnapshot.data() })
                } else {
                    resolve(null)
                }
            } catch (e) {
                console.error(e)
            }
        })
    }

    createUser = (userData) => {
        return new Promise(async (resolve, reject) => {
            let user = _.cloneDeep(userData)
            delete user.id
            try {
                await this.db.collection('users')
                    .doc(userData.id)
                    .set(user)
                resolve()
            } catch (e) {
                console.error(e)
            }
        })

    }

    updateUser = (id, userData) => {
        return new Promise(async (resolve, reject) => {
            let user = _.cloneDeep(userData)
            delete user.id
            try {
                await this.db.collection('users')
                    .doc(id)
                    .set(user, { merge: true })
                resolve()
            } catch (e) {
                console.error(e)
            }
        })

    }

    signOut = () => this.auth.signOut();

    // *** Jitsi As A Service ***
    getJitsiToken = async (userId, name, email, avatar) => {
        let getJaasToken = this.functions.httpsCallable('getJaasToken');
        return getJaasToken(userId, name, email, avatar)
    }

    // *** Firebase API ***
    getRoundsList = (userId, minimumVersion = 1) => {
        //   console.log('getRoundsList', userId, minimumVersion);
        return new Promise(async (resolve, reject) => {
            let rounds = []
            try {
                const roundsSnapshot = await this.db
                    .collection("rounds")
                    .where('createdBy', '==', userId)
                    .orderBy('createdAt', 'desc')
                    .limitToLast()
                    .get();
                roundsSnapshot.forEach(roundDoc => {
                    let round = roundDoc.data();
                    round.id = roundDoc.id;
                    if (round.dataVersion >= minimumVersion) {
                        rounds.push(round);
                    }
                })

                resolve(rounds)
            }
            catch (e) {
                console.error(e)
                reject(e)
            }
        })
    }
    getRound = async (roundId) => {
        // console.log('getRound', roundId);
        return new Promise(async (resolve, reject) => {
            try {
                const roundSnapshot = await this.db.collection('rounds').doc(roundId).get()
                const round = { id: roundSnapshot.id, ...roundSnapshot.data(), layers: [] }
                round.layers = await this.getLayers(roundId)
                round.userBuses = await this.getUserBuses(roundId)
                round.userPatterns = await this.getUserPatterns(roundId)
                //  console.log('got round', round);
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
                    layers.push(layer);
                })

                resolve(layers)
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
    getUserPatterns = async (roundId) => {
        return new Promise(async (resolve, reject) => {
            let allUserPatterns = {}
            try {
                const userPatternsSnapshot = await this.db
                    .collection("rounds")
                    .doc(roundId)
                    .collection('userPatterns')
                    .get();
                userPatternsSnapshot.forEach(userPatternsDoc => {
                    let userPatterns = userPatternsDoc.data();
                    userPatterns.id = userPatternsDoc.id;
                    allUserPatterns[userPatterns.id] = userPatterns;
                })
                resolve(allUserPatterns)
            }
            catch (e) {
                console.error(e)
                reject(e)
            }
        })
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

    deleteRound = async (round) => {
        return new Promise(async (resolve, reject) => {
            for (const layer of round.layers) {
                await this.deleteLayer(round.id, layer.id)
            }
            await this.db.collection('rounds').doc(round.id).delete()
            resolve()
        })
    }

    deleteLayer = async (roundId, layerId) => {
        return this.db.collection('rounds').doc(roundId).collection('layers').doc(layerId).delete()
    }

    createRound = async (data) => {
        //  console.log('createRound()', data);
        return new Promise(async (resolve, reject) => {
            let round = _.cloneDeep(data)
            const layers = round && round.layers ? [...round.layers] : []
            delete round.layers
            const userBuses = []
            for (const [userId, userBus] of Object.entries(round.userBuses)) {
                userBus.id = userId
                userBuses.push(userBus)
            }
            delete round.userBuses
            const allUserPatterns = []
            for (const [userId, userPatterns] of Object.entries(round.userPatterns)) {
                userPatterns.id = userId
                allUserPatterns.push(userPatterns)
            }
            delete round.userPatterns
            round.createdAt = Date.now()
            try {
                await this.db.collection('rounds')
                    .doc(data.id)
                    .set(round)
                for (const layer of layers) {
                    await this.createLayer(data.id, layer)
                }
                for (const userBus of userBuses) {
                    await this.createUserBus(data.id, userBus.id, userBus)
                }
                for (const userPatterns of allUserPatterns) {
                    await this.saveUserPatterns(data.id, userPatterns.id, userPatterns)
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
            try {
                await this.db.collection('rounds')
                    .doc(roundId)
                    .collection('layers')
                    .doc(layer.id)
                    .set(layer)
                resolve()
            } catch (e) {
                console.error(e)
            }
        })
    }

    createUserBus = async (roundId, id, userBus) => {
        let userBusClone = _.cloneDeep(userBus)
        delete userBusClone.id
        return new Promise(async (resolve, reject) => {
            try {
                await this.db.collection('rounds')
                    .doc(roundId)
                    .collection('userBuses')
                    .doc(id)
                    .set(userBusClone)
                resolve()
            } catch (e) {
                console.error(e)
            }
        })
    }

    createSample = async (sample) => {
        let sampleClone = _.cloneDeep(sample)
        delete sampleClone.id
        delete sampleClone.localURL
        return new Promise(async (resolve, reject) => {
            try {
                await this.db.collection('samples')
                    .doc(sample.id)
                    .set(sampleClone).catch(e => {
                        console.log('create sample error', e)
                    })
                resolve()
            } catch (e) {
                console.error(e)
            }
        })
    }

    getSample = async (id) => {
        return new Promise(async (resolve, reject) => {
            try {
                const snapshot = await this.db.collection('samples').doc(id).get()
                if (snapshot.exists) {
                    resolve({ id: snapshot.id, ...snapshot.data() })
                } else {
                    resolve(null)
                }
            } catch (e) {
                console.error(e)
            }
        })
    }

    deleteSample = async id => {
        return this.db.collection('samples').doc(id).delete()
    }

    updateSample = async (sample) => {
        let sampleClone = _.cloneDeep(sample)
        delete sampleClone.id
        delete sampleClone.localURL
        return new Promise(async (resolve, reject) => {
            try {
                await this.db.collection('samples')
                    .doc(sample.id)
                    .set(sampleClone, { merge: true })
                resolve()
            } catch (e) {
                console.error(e)
            }
        })
    }

    getSamples = async (userId) => {
        return new Promise(async (resolve, reject) => {
            let samples = []
            try {
                const roundsSnapshot = await this.db
                    .collection("samples")
                    .where('createdBy', '==', userId)
                    .get();
                roundsSnapshot.forEach(sampleDoc => {
                    let sample = sampleDoc.data();
                    sample.id = sampleDoc.id;
                    samples.push(sample);
                })
                // console.log('getSamples()', samples);
                resolve(samples)
            }
            catch (e) {
                console.error(e)
                reject(e)
            }
        })
    }

    saveUserPatterns = async (roundId, userId, userPatterns) => {
        console.log('saveUserPatterns()', roundId, userId, userPatterns);
        let userPatternsClone = _.cloneDeep(userPatterns)
        return new Promise(async (resolve, reject) => {
            try {
                delete userPatternsClone.id
                await this.db.collection('rounds')
                    .doc(roundId)
                    .collection('userPatterns')
                    .doc(userId)
                    .set(userPatternsClone)
                resolve()
            } catch (e) {
                console.error(e)
            }
        })
    }

    updateRound = async (roundId, data) => {
        // console.log('updateRound', roundId, data)
        try {
            await this.db.collection('rounds')
                .doc(roundId)
                .set(data, { merge: true })
            //   console.log('updated round');
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

    updateUserBus = async (roundId, userId, userBus) => {
        // console.log('firebase::updateUserBus()', roundId, userId, userBus);
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