var gju = require('geojson-utils');
var gjt = require('geojson-tools');

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

var pointsInPolygon = [];
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
         pointsInPolygon.push([i,j]);
         discretePolygon[i][j] = 1.0;
         area += 1;
      } else {
         discretePolygon[i][j] = 0.0;
      }
   }
}

var xyPoint = pointsInPolygon[Math.floor(Math.random() * pointsInPolygon.length)];
var longitude = topLeft.longitude + unitLongitude * xyPoint[1];
var latitude = topLeft.latitude - unitLatitude * xyPoint[0];
var startXY = {i: xyPoint[0], j: xyPoint[1]};
var start = new Position(longitude, latitude);


var xyPoint = pointsInPolygon[Math.floor(Math.random() * pointsInPolygon.length)];
var longitude = topLeft.longitude + unitLongitude * xyPoint[1];
var latitude = topLeft.latitude - unitLatitude * xyPoint[0];
var destinationXY = {i: xyPoint[0], j: xyPoint[1]};
var destination = new Position(longitude, latitude);
//discretePolygon[xyPoint[0]][xyPoint[1]] = "X";

console.log("start is ");
console.log(start);
console.log("destionation is ");
console.log(destination);
console.log(getDiscretePath(start, destination, unitDistance));

function identity(x) {
   return x;
}

function threeDecimals(x) {
   if(x == 0) return "    ";
   return x.toFixed(2);
}

function exploredPath(x) {
   if(x == 0 || x == 1) return "    ";
   return x.toFixed(2);
}

function exploredPathAsSymbols(x) {
   if(x == 0) return " ";
   if(x == 1) return "*";
   return "o";
}

function asSymbolsGenerator(startXY, destinationXY) {
   return function(data, i, j) {
      if(startXY.i === i && startXY.j === j) {
         return "S";
      }
      if(destinationXY.i === i && destinationXY.j === j) {
         return "D";
      }
      if(data === 0) {
         return " ";
      } 
      return "*";
   };
}

function asSymbolsGeneratorWithTransform(startXY, destinationXY, transform) {
   return function(data, i, j) {
      if(startXY.i === i && startXY.j === j) {
         return "S";
      }
      if(destinationXY.i === i && destinationXY.j === j) {
         return "D";
      }
      return transform(data);
   };
}


function printGrid(grid, transformationFn) {
   for(var i = 0; i < grid.length; i++) {
      for(var j = 0; j < grid[i].length; j++) {
         process.stdout.write(String(transformationFn(grid[i][j], i, j)));
         process.stdout.write(" ");
      }
      process.stdout.write("\n");
   }
}



//printGrid(discretePolygon, identity);
//printGrid(discretePolygon, asSymbolsGenerator(startXY, destinationXY));
function Resource() {
   this.position = undefined;
   this.setPosition = function(position) {
      this.position = position;
   }
   this.orientation = 0; // in radians
   this.inSweepWidth = function(position) {
      var radius = 10; // meters
      return this.position.distanceFrom(position) <= radius;
   }
   this.setOrientation = function(destination) {
      this.orientation = 0; // do nothing for now
   }
}

var resource = new Resource();
resource.setPosition(start);

let positions = getDiscretePath(start, destination, unitDistance);
resource.setOrientation(destination);
for(var i = 0; i < positions.length; i++) {
   resource.setPosition(positions[i]);
   updateDiscreteSubarea(discretePolygon, resource, unitLatitude, unitLongitude, topLeft); // will update probabilities
}
printGrid(discretePolygon, asSymbolsGenerator(startXY, destinationXY));
printGrid(discretePolygon, exploredPath);
//printGrid(discretePolygon, exploredPathAsSymbols);
printGrid(discretePolygon, asSymbolsGeneratorWithTransform(startXY, destinationXY, exploredPathAsSymbols));
//path.append(nextPoint)

function getDiscretePath(currentPosition, nextPosition, unitDistance) {
   // gjt takes coordinates in [lat, long] form
   return gjt.complexify([[currentPosition.latitude, currentPosition.longitude], 
                      [nextPosition.latitude, nextPosition.longitude]], unitDistance / 1000).map(
         function(simplePosition) {
            return new Position(simplePosition[1], simplePosition[0]);
         });
}

function updateDiscreteSubarea(discretePolygon, resource, unitLatitude, unitLongitude, topLeft) {
   var POD = .5;
   // brute force is to look at everything. we can actually examine how long it takes and then do it better
   for(var i = 0; i < discretePolygon.length; i++) {
      for(var j = 0; j < discretePolygon[i].length; j++) {
         if(0 == discretePolygon[i][j]) continue;
         var longitude = topLeft.longitude + unitLongitude * j;
         var latitude = topLeft.latitude - unitLatitude * i;
         var position = new Position(longitude, latitude);
         if(resource.inSweepWidth(position)) {
            discretePolygon[i][j] = (1 - POD) * discretePolygon[i][j];
         }
      }
   }
}







