'use strict';

const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { defineSecret, defineString } = require('firebase-functions/params');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { buildJaasPayload, signJaasToken } = require('./lib/jaas');

initializeApp();

// Secrets live in Secret Manager: `firebase functions:secrets:set JAAS_PRIVATE_KEY` (paste the .pk file)
// and `firebase functions:secrets:set BITLY_TOKEN`. Plain parameters are prompted for on deploy or
// read from functions/.env.<project>.
const JAAS_PRIVATE_KEY = defineSecret('JAAS_PRIVATE_KEY');
const JAAS_APP_ID = defineString('JAAS_APP_ID', {
    description: 'JaaS tenant / app id (vpaas-magic-cookie-...)',
    default: 'vpaas-magic-cookie-6e18748a3e614d5696744abf547dd11c'
});
const JAAS_KEY_ID = defineString('JAAS_KEY_ID', {
    description: 'JaaS API key id, usually <app id>/<key suffix>',
    default: 'vpaas-magic-cookie-6e18748a3e614d5696744abf547dd11c/ec8a8c'
});
const BITLY_TOKEN = defineSecret('BITLY_TOKEN');
const BITLY_GROUP_GUID = defineString('BITLY_GROUP_GUID', { description: 'Optional Bitly group GUID', default: '' });
const APP_ORIGIN = defineString('APP_ORIGIN', { description: 'Public origin used for share links', default: 'https://rounds.studio' });

const ROUND_ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;

function requireAuth(request) {
    if (!request.auth || !request.auth.uid) {
        throw new HttpsError('unauthenticated', 'Sign in to use this feature.');
    }
    return request.auth;
}

function requireRoundId(request) {
    const roundId = request.data && request.data.roundId;
    if (typeof roundId !== 'string' || !ROUND_ID_PATTERN.test(roundId)) {
        throw new HttpsError('invalid-argument', 'A valid roundId is required.');
    }
    return roundId;
}

/** Loads the round and checks the caller has opened it (creator or listed in currentUsers). */
async function loadRoundForMember(roundId, uid) {
    const snapshot = await getFirestore().collection('rounds').doc(roundId).get();
    if (!snapshot.exists) {
        throw new HttpsError('not-found', 'Round not found.');
    }
    const round = snapshot.data();
    const members = Array.isArray(round.currentUsers) ? round.currentUsers : [];
    if (round.createdBy !== uid && !members.includes(uid)) {
        throw new HttpsError('permission-denied', 'You are not a member of this round.');
    }
    return round;
}

exports.getJaasToken = onCall({ secrets: [JAAS_PRIVATE_KEY] }, async (request) => {
    const auth = requireAuth(request);
    const roundId = requireRoundId(request);
    const round = await loadRoundForMember(roundId, auth.uid);
    const profileSnapshot = await getFirestore().collection('users').doc(auth.uid).get();
    const profile = profileSnapshot.exists ? profileSnapshot.data() : {};
    const appId = JAAS_APP_ID.value();

    const payload = buildJaasPayload({
        appId,
        roundId,
        uid: auth.uid,
        profile,
        authToken: auth.token || {},
        isModerator: round.createdBy === auth.uid
    });
    const token = signJaasToken(payload, JAAS_PRIVATE_KEY.value(), JAAS_KEY_ID.value());
    return { token, appId, room: roundId };
});

exports.createShortLink = onCall({ secrets: [BITLY_TOKEN] }, async (request) => {
    const auth = requireAuth(request);
    const roundId = requireRoundId(request);
    const round = await loadRoundForMember(roundId, auth.uid);
    if (typeof round.shortLink === 'string' && round.shortLink.length > 0) {
        return { link: round.shortLink };
    }

    const body = { long_url: `${APP_ORIGIN.value()}/play/${roundId}`, domain: 'bit.ly' };
    if (BITLY_GROUP_GUID.value()) {
        body.group_guid = BITLY_GROUP_GUID.value();
    }
    const response = await fetch('https://api-ssl.bitly.com/v4/shorten', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${BITLY_TOKEN.value()}`
        },
        body: JSON.stringify(body)
    });
    if (!response.ok) {
        throw new HttpsError('unavailable', `The link shortener returned HTTP ${response.status}.`);
    }
    const result = await response.json();
    if (typeof result.link !== 'string') {
        throw new HttpsError('internal', 'The link shortener returned no link.');
    }
    await getFirestore().collection('rounds').doc(roundId).set({ shortLink: result.link }, { merge: true });
    return { link: result.link };
});
