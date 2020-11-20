const express = require('express');
const axios = require('axios');
const cors = require('cors');

const sql = require('./include/db_cfg.js');
const utility = require('./include/utility.js');
const app = express();

app.use(express.json()); //to read json-encoded bodies
var port = process.env.PORT || 3100;

//FIRESTORE Config
const admin = require('firebase-admin');
const serviceAccount = require('../config/firebase_key.json');
admin.initializeApp({
	credential: admin.credential.cert(serviceAccount)
});
const db = admin.firestore();

//
//Local FUNCTIONS
//
async function replaceFSpath(roadTripdocRef, fullgRoadsPath){
    console.log("updating Firebase");
    await roadTripdocRef.set({path: fullgRoadsPath});
}

function getStoredPoints(tripname){
    //returns a promise with an array of lat long coords  [[lat,long],[lat2,long2],...]
    const sql_dbTbl = "heroku_bfbb423415a117e.gps_readings";
    let server_response_arry = [];
    //TODO REMOVE 'LIMIT 50' FROM QUERY
    var query = `SELECT time, lat, ${sql_dbTbl}.long from ${sql_dbTbl} WHERE tripname = "${tripname}" order by time DESC LIMIT 5`;
    return new Promise(function(resolve,reject){
        sql.con_pool.getConnection()
        .then( conn => {
            const res = conn.query(query);
            conn.release();
            return res;
        }).then(result => {            
            result[0].forEach( result =>{
                server_response_arry.push([result.lat,result.long]) ;
            });
            resolve(server_response_arry);
        }).catch(err => {
            reject(err);
        });
    });
}

let promise = new Promise( (resolve,reject) =>{
        resolve('Success!');
});

function fnpromise(result){
    return new Promise( (resolve,reject) =>{
        resolve(result);
    });
}


//
//GET or POST requests sent to server
//
app.use(cors());
app.get('/', (req, res) => res.send('Hello World!'));
app.get('/embedinsta',(req,resp) => {
    
    //send a request to facebook for an instagram post
    let url = 'https://graph.facebook.com/v9.0/instagram_oembed/';
    //let param =  '?url=https://www.instagram.com/p/{postid}/&access_token=secretcode';
    if(req.query.postid){
        axios.get(url,{
        params: {
          url: `https://www.instagram.com/p/${req.query.postid}/`,
          access_token: process.env.FB_APP_ACCESS_TOKEN
        }})
        .then(res => {
            console.log(res.data);
            resp.send(res.data);})
        .catch( e => console.log("error fetching insta"+e));
    }else{
        resp.send("include a postid parameter");
    }
});

app.post('/gps-tracker', async function(req, res){
    //This path is used by the gps tracker to add points to the Firestore path document
    //let server_response = typeof req.body.mode;
    let server_response = "accessed gps-tracker \n ";
    
    //Check the input parameters.
    let tripname = req.body.tripname;
    let mode = req.body.mode;
    let parameter_check = (tripname === undefined || mode === undefined);
    parameter_check = ( parameter_check || tripname === "" || mode === "");
    
    if (parameter_check){
        server_response += "Parameter(s) missing. \n";
    }else{
        switch(req.body.mode){
            case "overwriteFullPath":
                let fullgRoadsPath = [];
                let fs_updated = false;
                server_response += "overwritting Path \n";
                //uses all the points in the mySQL database to call the Google Roads API
                //then overwrites the existing 
                //path in the Firestore database.

                //connect to the database
                await getStoredPoints(tripname)
                .then( (arry_recorded_coords) => {
                    console.log("points received: ",arry_recorded_coords);
                    //return fnpromise("Success"); //utility.gTripDir(arry_recorded_coords,fullgRoadsPath);
                    return utility.gTripDir(arry_recorded_coords,fullgRoadsPath);
                //After the google Directions response for all points is added to the
                //array fullRoadsPath...
                }).then((x)=>{
                    console.log("fullgRoadsPath: ",x);
    //                if(directions_rec){
    //                    const roadTripdocRef = db.collection('Trips').doc(tripname);
    //                    roadTripdocRef.set({paths: x});
    //                    fs_updated = true;
    //                }
                }).then(() =>{
                    if(fs_updated) server_response += "Firestore path updated. \n";
                    else server_response += "Firestore path not updated. \n";
                }).catch((err) =>{
                    console.log("trouble getting directions: ",err);
                    server_response += err;
                });

//                replaceFSpath(roadTripdocRef, fullgRoadsPath)
//                    .then(()=> server_response += "Path overwritten in Firestore")
//                    .catch((err) => console.log("Error writing to Firestore: ",err));
//                })
            //TODO the code leaves the switch statement before the data is resolved.
            //the entire switch-case statement needs to be an asyc funct
            // see: https://stackoverflow.com/questions/40185880/making-a-promise-work-inside-a-javascript-switch-case
            // or: https://stackoverflow.com/questions/54281977/how-to-resolve-a-different-promise-in-each-case-of-a-switch-block-and-pass-their/54282061
                break;
            case "addPointToPath":
                //adds one point to the Firestore path document for the specified trip
                break;
            default:
                res.send("nothing requested");
                break;
        }
    }
    await res.send(server_response);
});

app.listen(port, () => console.log(`Example app listening at http://localhost:${port}`));