var polyline = require('@mapbox/polyline');

const path = [[-120.2, 38.5], [-120.95, 40.7], [-126.453, 43.252]];
const encodedPoly = "zyivEgyem[BG@EBG@A@C@A@A@C@A@C@A@A@C@A@A@C@A@A@C@A@A@ABA@A@C@A@A@ABA@A@A@ABA@A@ABA@?@ABA@A@AB?@A@ABA@?BA@A@?BA@?BA@?BA@?BA@?B?@AB?@?@AB?@?B?@?BA@?B?@?B?B?@?B?@?B?@?B?@@B?@?B?@@@?B?@@B?@?B@@?B@@?B@@?B@@?@@B@@?@@@?@?@@JB@@@??@B@DB@BB@@@@@BB@@@@@@BB@@@B@@@@BB@@@B@@@B@@@B@@@B@@@B@B@@@B@B@@Rh@BNBH@F@B@@@B@@@BB@@@@B@@@@@B@@B@@@@B@@B@@@@@@@B@@B@@B@@@@@B@@@@?B@@@B@@@B@@?@@B@@@B?@@B@@?B@@?B@@?B@D@B?D@D@B?D@D?D@B?D@D?B?D@D?r@HH@L@P@F@@?XB";

function encodePoly(coord_arry){
    const encodedCoords = polyline.fromGeoJSON({ "type": "Feature",
        "geometry": {
          "type": "LineString",
          "coordinates": coord_arry
        },
        "properties": {}
    });
    return encodedCoords;
}

module.exports = {
    encodePoly
};