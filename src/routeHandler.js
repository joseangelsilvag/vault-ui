'use strict';
var axios = require('axios');
var _ = require('lodash');

/* Returned body
   "auth": {
     "renewable": true,
     "lease_duration": 2764800,
     "metadata": {
       "username": "vishalnayak",
       "org": "hashicorp"
     },
     "policies": [
       "default",
       "dev-policy"
     ],
     "accessor": "f93c4b2d-18b6-2b50-7a32-0fecf88237b8",
     "client_token": "1977fceb-3bfa-6c71-4d1f-b64af98ac018"
   }
*/
var login = function (req, res) {
    let creds = _.get(req, "body.Creds");

    let endpoint = '';
    let body = {}
    let config = {}

    switch (creds.Type.toLowerCase()) {
        case 'github':
            endpoint = '/v1/auth/github/login';
            body = {
                token: creds.Token
            };
            break;
        case 'usernamepassword':
            endpoint = `/v1/auth/userpass/login/${creds.Username}`;
            body = {
                password: creds.Password
            };
            break;
        case 'token':
            endpoint = `/v1/auth/token/lookup`
            body = {
                token: creds.Token
            };
            config = {
                headers: { "X-Vault-Token": creds.Token }
            };
            break;
        default:
            res.status(400).send("Invalid auth method");
    }
    axios.post(`${_.get(req, "body.VaultUrl")}${endpoint}`, body, config)
        .then((resp) => {
            if (creds.Type.toLowerCase() === 'token') {
                res.json({
                    client_token: resp.data.data.id,
                    lease_duration: resp.data.lease_duration
                });
            } else {
                res.json(resp.data.auth);
            }
        })
        .catch((err) => {
            console.error(err.stack);
            res.status(err.response.status).send("Authorization failed");
        });
};

/* Returned body
 {
 "auth": null,
 "data": {
   "keys": ["foo", "foo/"]
 },
 "lease_duration": 2764800,
 "lease_id": "",
 "renewable": false
 }
*/
var listSecrets = function (req, res) {

    let namespace = decodeURI(req.query['namespace']);
    let endpoint = `/v1/secret${namespace}?list=true`;
    let vaultAddr = decodeURI(req.query['vaultaddr']);
    let config = { headers: { 'X-Vault-Token': decodeURI(req.query['token']) } }

    axios.get(`${vaultAddr}${endpoint}`, config)
        .then((resp) => {
            res.json(resp.data);
        })
        .catch((err) => {
            console.error(err.stack);
        });
}
/* Returned body
 {
   "foo": "bar"
 }
 Query params 'secret' and 'vaultaddr' must go through encodeURI()
*/
var getSecret = function (req, res) {
    let endpoint = `/v1/secret/${decodeURI(req.query['secret'])}`;
    let vaultAddr = decodeURI(req.query['vaultaddr']);
    let config = { headers: { 'X-Vault-Token': req.query['token'] } }

    axios.get(`${vaultAddr}${endpoint}`, config)
        .then((resp) => {
            res.json(resp.data.data);
        })
        .catch((err) => {
            console.error(err.stack);
        });
}

var writeSecret = function (req, res) {

    let endpoint = `/v1/secret${decodeURI(req.query['secret'])}`;
    let config = { headers: { 'X-Vault-Token': req.query['token'] } }

    let secretValue = _.get(req, "body.SecretValue")
    let vaultAddr = _.get(req, 'body.VaultUrl');

    try {
        secretValue = JSON.parse(secretValue)
    } catch(e) { }

    let body = {
        value: secretValue
    };

    axios.post(`${_.get(req, "body.VaultUrl")}${endpoint}`, body, config)
        .then((resp) => {
            res.json(resp.data.auth);
        })
        .catch((err) => {
            console.error(err.stack);
        });
}

module.exports = (function () {
    return {
        login: login,
        listSecrets: listSecrets,
        getSecret: getSecret,
        writeSecret: writeSecret
    }
})();
