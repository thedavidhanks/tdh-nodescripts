var polyline = require('@mapbox/polyline');
const axios = require('axios');

function deg_to_rad(x){
    return x * Math.PI/180;
}

function great_circle_arc(a,b){
    //calculates the distance in radians between a & b where,
    //a and b are arrays or format [lattitude, longditude]
    //this assumes that all points are in the Nort/west hemispheres
    //REFERENCE - http://edwilliams.org/avform.htm#Dist
    
    const lat1_rad = deg_to_rad(Math.abs(a[0]));
    const lat2_rad = deg_to_rad(Math.abs(b[0]));
    const long1_rad = deg_to_rad(Math.abs(a[1]));
    const long2_rad = deg_to_rad(Math.abs(b[1]));
    
    const distance_radians = 2*Math.asin(Math.sqrt((Math.sin((lat1_rad-lat2_rad)/2)) ** 2 
            + Math.cos(lat1_rad)*Math.cos(lat2_rad)*(Math.sin((long1_rad-long2_rad)/2)) ** 2));
    
    //console.log("radians: ",distance_radians,"\n");
    return distance_radians;
}

//Distance in meters between point A & B
function meters_a_b(a,b){
    const distance_radians = great_circle_arc(a,b);
    const dist_nm = ((180*60)/Math.PI)*distance_radians; //distance in nautical miles
    //console.log("Nautical Miles: ",dist_nm,"\n");
    const dist_meters =  dist_nm*1852;  
    
    console.log("meters: ",dist_meters,"\n");
    return dist_meters;
}
function points_closer_than_x(arry_of_coords, x){
    //returns an array where the first point is within x meters of the last point.
    //arry_of_coords is an array of array coords [ [lat1,long1],[lat2,long2],...]
    let index_of_last;
    let first = arry_of_coords[0];
    
    for( const [i, coord] of arry_of_coords.entries()){
        index_of_last = i;  //the last index where the distance between first and 
                          //current < x or the last index of arry_of_coords
        if(meters_a_b(first,coord) >= x){
            break;
        }  
    }
    return arry_of_coords.slice(0 , index_of_last + 1); 
}

function arry_to_roadsString(coords){
    //coords is of format [ [lat1,long1],[lat2,long2],...]
    //returns a string of format "lat1,long1|lat2,long2..."
    //string format is utilized for a call to google Roads API
    let arry_of_strings = [];
    
    coords.forEach( coord => {
        arry_of_strings.push(coord.join());
    });
    
    return arry_of_strings.join('|');
}

function encodePoly(coord_arry){
    //encodes an array of lat,long coords to a google-ish encoded polyline
    //see: https://github.com/mapbox/polyline
    
    const encodedCoords = polyline.fromGeoJSON({ "type": "Feature",
        "geometry": {
          "type": "LineString",
          "coordinates": coord_arry
        },
        "properties": {}
    });
    return encodedCoords;
}

// takes an array of [lat,long] and returns the first 10 pts
// if less than 10 exist in full_path, returns the remaining as long as 2 remain
// if only 1 would remain, returns 9
function reduce_path(full_path){
    let partial_path = [];
    if(full_path.length === 11){
        partial_path = full_path.slice(0,9);   
    }else{
        partial_path = full_path.slice(0,10);
    };
    return partial_path;
}

function test(){
    let was_empty = [];
    recursion_ex([1,2,3,4,5,6],was_empty).then( (data)=>{
        console.log(data);
    });
    
}

//REMOVE for testing
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

//REMOVE for testing
function recursion_ex(nums,fullgRoadsPath){
    //let nums = [1,2,3,4,5,6,7,8,9,10];
    return new Promise( function(resolve,reject){
       if(nums.length === 0){
           //console.log(fullgRoadsPath);
           resolve(fullgRoadsPath);
       }else{
           fullgRoadsPath.push(nums.pop()+1);
           return recursion_ex(nums,fullgRoadsPath);
       }
    });
}
    //This while won't work.  
//    //Try: https://stackoverflow.com/questions/43780163/javascript-while-loop-where-condition-is-a-promise 
//    while(nums.length > 0){
//        await setTimeout(function(){
//            num = nums.pop();
//            console.log("num:",num);
//            fullgRoadsPath.push(num+1);
//        },1000);
//        console.log("looping..\n");
//    }
//    console.log(fullgRoadsPath);
//}

function fnpromise(result){
    return new Promise( (resolve,reject) =>{
        resolve(result);
    });
}

function this_fails(foobar,raboof){
    console.log("this_fails  => foobar: ",foobar.length," & raboof: ",raboof.length);
    return new Promise( (resolve,reject)=>{
        if(!Array.isArray(foobar) || !Array.isArray(raboof)){
            reject("foobar is not array");
        }
        if(foobar.length === 0){
            console.log("this_fails => foobar: ",foobar.length," & raboof: ",raboof.length);
            //resolve(raboof);
            resolve("this_fails resolved");
        }else{
            raboof.push(foobar.pop());
            this_fails(foobar,raboof);
        }
    });
}

function this_works(foobar,raboof){
    while(foobar.length > 0){
        raboof.push(foobar.pop());
    }
    console.log("this_works => foobar: ",foobar.length," & raboof: ",raboof.length);
    return new Promise( (resolve,reject)=>{
        if(true){
            resolve("this_works resolved",raboof);
        }else{
            reject("foobar has content");
        }
    });
    
}

async function promise_test(){
    foobar = [1,2,3];
    fail_foobar = [4,5,6];
    raboof = [];
    let work = await this_works(foobar,raboof).catch((e)=>{return e;});
    let fail = await this_fails(foobar,raboof).catch((e)=>{return e;});
    console.log(work);
    console.log(fail);
}
function gTripDir(arry_recorded_coords,gCompiledPath){
    //arry_recorded_coords is of the format [ [lat1,long1],[lat2,long2],...]
    // it is all the coordinates that have been recorded to the mysql db by
    // the tracker
    return new Promise( (resolve,reject) => {
        //if the arry_recorded_coords length is 0 resolve/return the directions object
        if(!arry_recorded_coords.length){ 
            //console.log("final gCompiledPath: ",gCompiledPath);  //works. getting full response
            //console.log("at the end");
            resolve("Hello");
        }
        else{
            //get a subset and process directions.
            let subset_coords = reduce_path(arry_recorded_coords);
            arry_recorded_coords.splice(0,subset_coords.length);  //removes the subset from the full path
            let origin = subset_coords.shift();
            let dest = subset_coords.pop();
            let waypoints = subset_coords;
            let waypoints_para = "";
            
            if(waypoints.length > 1){
                let encoded_waypoints = encodePoly(waypoints);
                let waypoints_para = "&waypoints="+encoded_waypoints;
            }
            
            //Make a gRoads API query with the subset
            let gDirRequestURL = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin}&destination=${dest}${waypoints_para}&key=${process.env.GDIR_API_KEY}`;
            console.log("Request: ",gDirRequestURL);
            axios.get(gDirRequestURL)
            .then((gResp) => {
              //Add all new points to the gCompiledPath array
              if(gResp.data.routes.length > 0){
                  console.log(`Received gResp for ${origin} to ${dest}:`);
                  gResp.data.routes.forEach( (route) =>{
                    route.legs.forEach( (leg) => {                               
                        leg.steps.forEach( (step)=>{
                            gCompiledPath.push(step);
                            //console.log("step distance: ",step.distance);
                        });
                    });
                  });
                  return gCompiledPath;
              }else{
                console.log("no directions");  
                throw "No directions";
              }                
            })
            //call gTripDir with the shortened arry_recorded_coords and the additional directions
            .then( (longerPath) =>{
                console.log("arry_recorded_coords length: ",arry_recorded_coords.length,
                    " & gCompiledPath length: ",longerPath.length);
                return gTripDir(arry_recorded_coords,longerPath);    
            })
            .catch(function (error) {
                reject("google Directions API error: ",error);
            });
        }
    });
}
    
module.exports = {
    points_closer_than_x,
    arry_to_roadsString,
    great_circle_arc,
    meters_a_b,
    encodePoly,
    reduce_path,
    gTripDir,
    recursion_ex,
    promise_test
};