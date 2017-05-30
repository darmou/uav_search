var gju = require('geojson-utils');

var saved = [
            [
              -80.01574516296387,
              38.40840605494758
            ],
            [
              -80.01372814178467,
              38.40840605494758
            ],
            [
              -80.01372814178467,
              38.41005383575983
            ],
            [
              -80.01574516296387,
              38.41005383575983
            ],
            [
              -80.01574516296387,
              38.40840605494758
            ]
          ];           

var input = [
            [
              -80.01222610473633,
              38.406152906088074
            ],
            [
              -80.01068115234375,
              38.40527853089542
            ],
            [
              -80.01020908355713,
              38.40719541653097
            ],
            [
              -80.01115322113037,
              38.407800738274325
            ],
            [
              -80.00990867614746,
              38.408338797789796
            ],
            [
              -80.01093864440918,
              38.40924676413821
            ],
            [
              -80.01042366027832,
              38.41039011294187
            ],
            [
              -80.01205444335938,
              38.41106266261135
            ],
            [
              -80.01222610473633,
              38.406152906088074
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



function processPolygon(input) {
    var area = 0;
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
                discretePolygon[i][j] = "*";
                area += 1;
            } else {
                discretePolygon[i][j] = " ";
            }
        }
    }

    printGrid(discretePolygon);
    console.log("area is " + area + " * 100 sq meters");
}


function printGrid(grid) {
   for(var i = 0; i < grid.length; i++) {
      for(var j = 0; j < grid[i].length; j++) {
         process.stdout.write(String(grid[i][j]));
         process.stdout.write(" ");
      }
      process.stdout.write("\n");
   }
}

module.exports.processPolygon = processPolygon;











