const geolib = require('geolib');
const xrange = require('xrange');


// Converts from degrees to radians.
Math.radians = function(degrees) {
  return degrees * Math.PI / 180;
};
 
// Converts from radians to degrees.

Math.degrees = function(radians) {
  return radians * 180 / Math.PI;
};

function getPathLength(lat1, lng1, lat2, lng2) {
	return geolib.getDistance({latitude:lat1, longitude:lng1},
		{latitude:lat2, longitude:lng2});

}
function getDestinationLatLong(lat, lng, azimuth, distance) {
	let bearing = Math.radians(azimuth);
	let R = 6378.1; //Radius of the Earth in km
	let d = distance/1000; //Distance m converted to km
 	let lat1r = Math.radians(lat); //Current dd lat point converted to radians
    let lon1r = Math.radians(lng); //Current dd long point converted to radians
    let lat2c = Math.asin(Math.sin(lat1r) * Math.cos(d/R) + Math.cos(lat1r)* Math.sin(d/R)* Math.cos(bearing));
    let lon2c = lon1r + Math.atan2(Math.sin(bearing) * Math.sin(d/R)* Math.cos(lat1r), Math.cos(d/R)- Math.sin(lat1r)* Math.sin(lat2c));
    //convert back to degrees
    lat2c = Math.degrees(lat2c);
    lon2c = Math.degrees(lon2c);
    return[lat2c, lon2c];
}

function calculateBearing(lat1, lng1, lat2, lng2) {
	//calculates the azimuth in degrees from start point to end point
	let startLat = Math.radians(lat1);
	let startLong = Math.radians(lng1);
	let endLat = Math.radians(lat2);
	let endLong = Math.radians(lng2);
	let dLong = endLong - startLong;
	
	let dPhi = Math.log(Math.tan( (endLat/2.0)+(Math.PI/4.0)) / (Math.tan((startLat/2.0) + (Math.PI/4.0))) );
    if (Math.abs(dLong) > Math.PI) {
         if (dLong > 0.0) {
             dLong = -(2.0 * Math.PI - dLong);
         } else {
             dLong = (2.0 * Math.PI + dLong);
		}	 
	}	 
    let bearing = (Math.degrees(Math.atan2(dLong, dPhi)) + 360.0) % 360.0;
    return bearing;
}

function main(interval, azimuth, lat1, lng1, lat2, lng2) {
	/* returns every coordinate pair inbetween two coordinate 
    pairs given the desired interval */
	let d = getPathLength(lat1,lng1,lat2,lng2);
	let dist = Math.trunc(d/interval);
	let counter = parseFloat(interval);
	let coords = [];
    let disIndx;
	for (disIndx in xrange(0,parseInt(dist)).toArray()) {
	    let coord = getDestinationLatLong(lat1, lng1 ,azimuth ,counter );
	    counter = counter + parseFloat(interval);
		coords.push(coord);
	}
	return coords;
}

//console.log(getPathLength(32.87,-122.878,22, -122.878) + " meters away.");
//Returns very coordinate pair between two coordinate pairs given desired interval
let lat1 = 37.776749;
let lat2 = 37.7821176;
let lng1 = -122.415723;
let lng2 = -122.406217;
let interval = 5;
azimuth = calculateBearing(lat1, lng1, lat2, lng2);
console.log(azimuth);
coords = main(interval, azimuth, lat1, lng1, lat2, lng2);
console.log(coords);

//gen random number from 1 to 10
Math.floor((Math.random() * 10) + 1);

//remainder, dist = Math.



	

