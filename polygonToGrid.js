var gju = require('geojson-utils');

var input = [
   [
      -80.01372814178467,
      38.41008746354846
   ],
   [
      -80.01372814178467,
      38.40840605494758
   ],
   [
      -80.01424312591551,
      38.406522830869775
   ],
   [
      -80.01274108886719,
      38.4072963038403
   ],
   [
      -80.01218318939209,
      38.406152906088074
   ],
   [
      -80.01209735870361,
      38.41106266261135
   ],
   [
      -80.01372814178467,
      38.41008746354846
   ]
]; 
function Position(longitude, latitude) {
   this.longitude = longitude;
   this.latitude = latitude;
   this.distanceFrom = function(position) {
      return gju.pointDistance({type: 'Point', coordinates: [this.longitude, this.latitude]},
              {type: 'Point', coordinates: [position.longitude, position.latitude]});
   }
   return this;
}

function Polygon(pointArray) {
   this.positions = pointArray.map(function(p) { return new Position(p[0], p[1]); });
   this.contains = function(position) {
      return gju.pointInPolygon(
            {"type":"Point","coordinates":[position.longitude, position.latitude]},
            {"type":"Polygon","coordinates":
            [this.positions.map(function(position) {
                  return [position.longitude, position.latitude];})
            ]});
   }
}

var polygon = new Polygon(input);
var unitDistance = 10;
var left = polygon.positions[0].longitude;
var right = polygon.positions[0].longitude;
var top = polygon.positions[0].latitude;
var bottom = polygon.positions[0].latitude;
for(let i = 0; i < polygon.positions.length; i++) {
   let point = polygon.positions[i];
   left = Math.min(left, point.longitude);
   right = Math.max(right, point.longitude);
   bottom = Math.min(bottom, point.latitude);
   top = Math.max(top, point.latitude);
}
var topLeft = new Position(left, top);
var topRight = new Position(right, top);
var bottomLeft = new Position(left, bottom);
var rows = Math.ceil(topLeft.distanceFrom(bottomLeft) / unitDistance);
var cols =  Math.ceil(topLeft.distanceFrom(topRight) / unitDistance); 
var unitLongitude = Math.abs(topLeft.longitude - topRight.longitude) /cols;
var unitLatitude = Math.abs(topLeft.latitude - bottomLeft.latitude) / rows;
var discretePolygon = [];
for(let i = 0; i < rows; i++) {
   discretePolygon[i] = [];
   for(let j = 0; j < cols; j++) {
      var longitude = topLeft.longitude + unitLongitude * j;
      var latitude = topLeft.latitude - unitLatitude * i;
      var p = new Position(longitude, latitude);
      if(polygon.contains(p)) {
         discretePolygon[i][j] = 1;
      } else {
         discretePolygon[i][j] = 0;
      }
   }
}
console.log(discretePolygon);
