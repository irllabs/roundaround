'use strict';

const jwt = require('jsonwebtoken');

const TOKEN_LIFETIME_SECONDS = 60 * 60;

/**
 * Build the JaaS (Jitsi as a Service) JWT payload for one user in one round.
 * Identity always comes from the verified auth context, never from the request body,
 * and the token is scoped to a single room (the round id) instead of "*".
 */
function buildJaasPayload({ appId, roundId, uid, profile = {}, authToken = {}, isModerator, now = Math.floor(Date.now() / 1000) }) {
    if (!appId) throw new Error('appId is required');
    if (!roundId) throw new Error('roundId is required');
    if (!uid) throw new Error('uid is required');
    return {
        aud: 'jitsi',
        iss: 'chat',
        sub: appId,
        room: roundId,
        nbf: now - 10,
        exp: now + TOKEN_LIFETIME_SECONDS,
        context: {
            user: {
                id: uid,
                name: profile.displayName || authToken.name || 'Guest',
                avatar: profile.avatar || authToken.picture || '',
                email: authToken.email || '',
                moderator: isModerator ? 'true' : 'false'
            },
            features: {
                livestreaming: 'false',
                'outbound-call': 'false',
                transcription: 'false',
                recording: 'false'
            }
        }
    };
}

function signJaasToken(payload, privateKey, keyId) {
    if (!privateKey) throw new Error('JaaS private key is not configured');
    if (!keyId) throw new Error('JaaS key id is not configured');
    return jwt.sign(payload, privateKey, {
        algorithm: 'RS256',
        header: { kid: keyId, typ: 'JWT' }
    });
}

module.exports = { buildJaasPayload, signJaasToken, TOKEN_LIFETIME_SECONDS };
