var admin = require('firebase-admin');

module.exports = {
  madApp: admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    databaseURL: "https://margeeanddave-6254b.firebaseio.com"
  }, 'margeeanddave')
};