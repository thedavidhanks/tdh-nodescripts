const express = require('express');
const https = require('https');
const sql_db = require('./include/db_cfg.js').con;
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

//TODO Move function to module
async function replaceFSpath(roadTripdocRef, fullgRoadsPath){
    await roadTripdocRef.set({path: fullgRoadsPath});
}

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
app.get('/sql', (req, res) =>{
    const sql_dbTbl = "heroku_bfbb423415a117e.gps_readings";
    let server_response_arry = [];
    let server_response = "";
    let count = 0;
    sql_db.connect(function(err) {
        server_response += "Connecting to SQL \n";
                
        if (err) throw err;
        console.log("Connected! \n");
        var sql = `SELECT time, lat, ${sql_dbTbl}.long from ${sql_dbTbl} WHERE tripname = "${req.body.tripname}" order by time DESC `;
        sql_db.query(sql, function (err, results) {
            if (err) throw err;
            results.forEach( result =>{
                //console.log(`{time: "${result.time}", lat: "${result.lat}"", long: "${result.long}"}`);
                count = server_response_arry.push(`{time: "${result.time}", lat: "${result.lat}", long: "${result.long}"}`) ;
                //count = server_response_arry.push(result.long);
                console.log(count,": ",server_response_arry[count-1]);
            });
        });
    });
    //The below executes before the result from the sql query is obtained
    //TODO wrap the SQL query in a promise, then continue with the functions
    //  try async function: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/async_function
    //  or try older promises: https://codeburst.io/node-js-mysql-and-promises-4c3be599909b
    //  or try mysql2 https://evertpot.com/executing-a-mysql-query-in-nodejs/
    console.log("END.",server_response_arry.join());
    if(Array.isArray(server_response_arry)){ console.log("It's a array");}
    else{ console.log("It's not an array");};
    res.json("{"+server_response_arry.join()+"}");
});
app.post('/gps-tracker', (req, res) => {
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
            let arry_recorded_coords = [];
            let subset_recorded_coords = [];
            const max_dist_btw_pts = 1000; //meters
            let fullgRoadsPath = [];  //[ [lat1, long1], [lat1, long1],...]
            const roadTripdocRef = db.collection('Trips').doc(req.body.tripname);
            const sql_dbTbl = "heroku_bfbb423415a117e.gps_readings";
            
            sql_db.connect(function(err) {
                if (err) {server_response += "SQL error: "+err+"\n";}
                else{
                    server_response += "Connected to SQL! \n";
                    var sel_query = `SELECT time, lat, ${sql_dbTbl}.long from ${sql_dbTbl} WHERE tripname = "${req.body.tripname}" order by time DESC `;
                    //get all the recorded points
                    sql_db.query(sel_query, function (err, result) {
                    if (err) {server_response += err;}
                    else{
                        result.forEach(row => {
                           //create an array {var arry_recorded_coords} of the results [ [lat1,long1],[lat2,long2],...]
                           //res.send(row.lat+','+row.long+'\n');
                           arry_recorded_coords.push([row.lat,row.long]);
                        });
                    }
                    });
                }
            });
            
            //if an array was created, 
            //  create a string to send to google Roads API
            //  shorten the array by the points sent to google Roads API
            //  make a gRoads request
            //  store the result in Firestore
            //  do it again
            
            if(Array.isArray(arry_recorded_coords) && arry_recorded_coords.length){
                while(arry_recorded_coords.length > 0){
                    subset_recorded_coords = utility.points_closer_than_x(arry_recorded_coords,max_dist_btw_pts);
                    let subset_string = utility.arry_to_roadsString(subset_recorded_coords);
                    let gRoadsRequest='https://roads.googleapis.com/v1/snapToRoads?${subset_string}&key=${GROADS_API_KEY}';
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
                      res.send("Error: " + err.message);
                    });
                    let last_in_subset = subset_recorded_coords[subset_recorded_coords.length - 1]; //last element
                    //remove the coordiantes that were sent to google API
                    arry_recorded_coords.splice(0,arry_recorded_coords.indexOf(last_in_subset)+1);   
                }
                
                //TODO overwrite the Firestore path doc with gRoadsPath
                replaceFSpath(roadTripdocRef, fullgRoadsPath)
                        .then(()=>{res.send("Path overwritten in Firestore");});
            }
            break;
        case "addPointToPath":
            //adds one point to the Firestore path document for the specified trip
            break;
        default:
            res.send("nothing requested");
            break;
    }
    }
    res.send(server_response);
});

app.listen(port, () => console.log(`Example app listening at http://localhost:${port}`));