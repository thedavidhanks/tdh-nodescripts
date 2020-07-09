const express = require('express');
const app = express();
var port = process.env.PORT || 3100;

const admin = require('firebase-admin');
const serviceAccount = require('../config/firebase_key.json');
admin.initializeApp({
	credential: admin.credential.cert(serviceAccount)
});
const db = admin.firestore();

app.get('/', (req, res) => res.send('Hello World!'));

app.get('/user', (req, res) => {
    const docRef = db.collection('users').doc('alovelace');

    docRef.set({
      first: 'Ada',
      last: 'Lovelace',
      born: 1815
    })
    .then( () =>res.send("done"));
});

app.post('/gps-tracker', (req, res) => {
    //This path is used by the gps tracker to add points to the Firestore path document
    switch(req.body.mode){
        case "overwriteFullPath":
            //uses all the points in the mySQL database to overwrite the existing 
            //path in the Firestore database;
            break;
        case "addPointToPath":
            //adds one point to the Firestore path document for the specified trip
            break;
    }
});

app.listen(port, () => console.log(`Example app listening at http://localhost:${port}`));