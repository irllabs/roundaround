'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { generateKeyPairSync } = require('node:crypto');
const jwt = require('jsonwebtoken');
const { buildJaasPayload, signJaasToken, TOKEN_LIFETIME_SECONDS } = require('../lib/jaas');

const APP_ID = 'vpaas-magic-cookie-test';

test('payload is scoped to one room, one user, and one hour', () => {
    const now = 1_700_000_000;
    const payload = buildJaasPayload({
        appId: APP_ID,
        roundId: 'round-1',
        uid: 'user-1',
        profile: { displayName: 'Ada', avatar: 'https://example.test/a.png' },
        authToken: { email: 'ada@example.test' },
        isModerator: false,
        now
    });
    assert.equal(payload.sub, APP_ID);
    assert.equal(payload.room, 'round-1');
    assert.equal(payload.exp - now, TOKEN_LIFETIME_SECONDS);
    assert.equal(payload.context.user.id, 'user-1');
    assert.equal(payload.context.user.name, 'Ada');
    assert.equal(payload.context.user.moderator, 'false');
    assert.equal(payload.context.features.recording, 'false');
});

test('only the round creator is a moderator, and guests get a fallback name', () => {
    const moderator = buildJaasPayload({ appId: APP_ID, roundId: 'r', uid: 'owner', isModerator: true });
    const guest = buildJaasPayload({ appId: APP_ID, roundId: 'r', uid: 'guest', isModerator: false });
    assert.equal(moderator.context.user.moderator, 'true');
    assert.equal(guest.context.user.moderator, 'false');
    assert.equal(guest.context.user.name, 'Guest');
});

test('identity fields cannot be supplied by the caller', () => {
    assert.throws(() => buildJaasPayload({ appId: APP_ID, roundId: 'r' }), /uid is required/);
    assert.throws(() => buildJaasPayload({ appId: APP_ID, uid: 'u' }), /roundId is required/);
});

test('token is RS256 signed with the key id in the header and verifies with the public key', () => {
    const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
    const pem = privateKey.export({ type: 'pkcs8', format: 'pem' });
    const payload = buildJaasPayload({ appId: APP_ID, roundId: 'round-9', uid: 'u9', isModerator: true });
    const token = signJaasToken(payload, pem, `${APP_ID}/abc123`);
    const decoded = jwt.verify(token, publicKey.export({ type: 'spki', format: 'pem' }), { algorithms: ['RS256'], audience: 'jitsi' });
    assert.equal(decoded.room, 'round-9');
    assert.equal(jwt.decode(token, { complete: true }).header.kid, `${APP_ID}/abc123`);
    assert.throws(() => signJaasToken(payload, '', 'kid'), /private key is not configured/);
});
