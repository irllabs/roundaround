const functions = require('firebase-functions');
const admin = require('firebase-admin');
var jwt = require('jsonwebtoken');
admin.initializeApp();
const fs = require('fs');

exports.getJaasToken = functions.https.onCall((data, context) => {
    try {
        const startTime = Math.round(new Date().getTime() / 1000)
        const expireTime = startTime + (12 * 3600);
        const header = {
            "alg": "RS256",
            //"kid": "vpaas-magic-cookie-ed842ad0fbe8446fbfeb14c7580a7f71/9fbc49",
            "kid": "vpaas-magic-cookie-6e18748a3e614d5696744abf547dd11c/ec8a8c",
            "typ": "JWT"
        };
        let payload = {
            "aud": "jitsi",
            "context": {
                "user": {
                    "id": data.userId,
                    "name": data.name,
                    "avatar": data.avatar,
                    "email": data.email,
                    "moderator": "true"
                },
                "features": {
                    "livestreaming": "false",
                    "outbound-call": "false",
                    "transcription": "false",
                    "recording": "false"
                }
            },
            "exp": expireTime,
            "iss": "chat",
            "nbf": startTime,
            "room": "*",
            //"sub": "vpaas-magic-cookie-ed842ad0fbe8446fbfeb14c7580a7f71"
            "sub": "vpaas-magic-cookie-6e18748a3e614d5696744abf547dd11c"
        };
        var privateKey = fs.readFileSync('jaasauth.pk');
        var token = jwt.sign(payload, privateKey, { algorithm: 'RS256', header });

        return { token };
    } catch (e) {
        console.log(e);
        throw new functions.https.HttpsError(
            'invalid-argument',
            'could not get token'
        );
    }
});