const express = require('express');
const https = require('https');
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
    await roadTripdocRef.set({path: fullgRoadsPath});
}

function getStoredPoints(tripname){
    //returns a promise with an array of lat long coords  [[lat,long],[lat2,long2],...]
    const sql_dbTbl = "heroku_bfbb423415a117e.gps_readings";
    let server_response_arry = [];
    var query = `SELECT time, lat, ${sql_dbTbl}.long from ${sql_dbTbl} WHERE tripname = "${tripname}" order by time DESC `;
    return new Promise(function(resolve,reject){
        sql.con_pool.getConnection()
        .then( conn => {
            const res = conn.query(query);
            conn.release();
            return res;
        }).then(result => {            
            result[0].forEach( result =>{
                server_response_arry.push([result.lat,result.long]) ;
                
                //console.log(count,": ",server_response_arry[count-1]);
            });
            resolve(server_response_arry);
        }).catch(err => {
            reject(err);
        });
    });
}

//
//GET or POST requests sent to server
//
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

//REMOVE - this was a test of the promise function  getStoredPoints
app.get('/sql', (req,res) =>{
    let server_response = "started \n";
    getStoredPoints(req.body.tripname).then( result => {
        let shortlist = utility.points_closer_than_x(result,1000);
        server_response += utility.arry_to_roadsString(shortlist)+"\n";
        server_response += "end \n";
        res.send(server_response);
    });
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
            server_response += "overwritting Path \n";
            //uses all the points in the mySQL database to call the Google Roads API
            //then overwrites the existing 
            //path in the Firestore database.
            
            //TODO check that req.body.tripname is included in post request
            //connect to the database
            let subset_recorded_coords = [];
            const max_dist_btw_pts = 1000; //meters
            let fullgRoadsPath = [];  //[ [lat1, long1], [lat1, long1],...]
            const roadTripdocRef = db.collection('Trips').doc(tripname);
            console.log(tripname,"\n");
            await getStoredPoints(tripname).then((arry_recorded_coords) => { 
                    console.log("104 - got here. \n",arry_recorded_coords.length);
                    while(arry_recorded_coords.length > 1){
                        console.log("106 - got here. \n");
                        subset_recorded_coords = utility.points_closer_than_x(arry_recorded_coords,max_dist_btw_pts);
                        let subset_string = utility.arry_to_roadsString(subset_recorded_coords);
                        let gRoadsRequest=`https://roads.googleapis.com/v1/snapToRoads?path=${subset_string}&interpolate=true&key=${process.env.GROADS_API_KEY}`;
                        console.log("gRoadsRequest: "+gRoadsRequest+"\n");
                        //TODO the Google roads request sometimes returns an error.
                        //consider using the Google directions API
                        //Make a gRoads API query with the subset
                            
                        https.get(gRoadsRequest, (resp) => {
                          let data = '';

                          // A chunk of data has been recieved.
                          resp.on('data', (chunk) => {
                            data += chunk;
                          });

                          resp.on('end', () => {
                            //Add all new points to the fullgRoadsPath array   
                            let gPath = JSON.parse(data).snappedPoints;
                            for( const point in gPath){
                                fullgRoadsPath.push([point.location.latitude,point.location.longitude]);
                            }
                          });
                        }).on("error", (err) => {
                          res.send("Error gRoads: " + err.message);
                        });
                        let last_in_subset = subset_recorded_coords[subset_recorded_coords.length - 1]; //last element
                        //remove the coordiantes that were sent to google API
                        arry_recorded_coords.splice(0,arry_recorded_coords.indexOf(last_in_subset)+1);   
                    }
                    replaceFSpath(roadTripdocRef, fullgRoadsPath)
                        .then(()=> server_response += "Path overwritten in Firestore")
                        .catch((err) => console.log("Error writing to Firestore: ",err));
                })
                .catch((err) => console.log(err));
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
    //res.send(server_response);
});

app.listen(port, () => console.log(`Example app listening at http://localhost:${port}`));