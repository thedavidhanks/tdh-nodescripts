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
    
    console.log("radians: ",distance_radians,"\n");
    return distance_radians;
}

//Distance in meters between point A & B
function meters_a_b(a,b){
    const distance_radians = great_circle_arc(a,b);
    const dist_nm = ((180*60)/Math.PI)*distance_radians; //distance in nautical miles
    //console.log("Nautical Miles: ",dist_nm,"\n");
    const dist_meters =  dist_nm*1852;  
    
    //console.log("meters: ",dist_meters,"\n");
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

module.exports = {
    points_closer_than_x,
    arry_to_roadsString,
    great_circle_arc,
    meters_a_b
};