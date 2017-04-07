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

function BoundingBox(polygon) {
   //console.log('in BoundingBox constructor');
   var left = polygon.positions[0].longitude;
   var right = polygon.positions[0].longitude;
   var top = polygon.positions[0].latitude;
   var bottom = polygon.positions[0].latitude;

   for(let i = 0; i < polygon.positions.length; i++) {
      let position = polygon.positions[i];
      left = Math.min(left, position.longitude);
      right = Math.max(right, position.longitude);
      bottom = Math.min(bottom, position.latitude);
      top = Math.max(top, position.latitude);
   }

   this.left = left;
   this.right = right;
   this.bottom = bottom;
   this.top = top;

   this.widthMeters = function () {
      var topLeft = new Position(this.left, this.top);
      var topRight = new Position(this.right, this.top);
      return topLeft.distanceFrom(topRight);
   }

   this.widthLongitude = function() {
      return Math.abs(this.left - this.right);
   }

   this.heightMeters = function () {
      var topLeft = new Position(left, top);
      var bottomLeft = new Position(left, bottom);
      return topLeft.distanceFrom(bottomLeft);
   }

   this.heightLatitude = function () {
      return Math.abs(this.top - this.bottom);
   }
}


function discretePolygonWrapper(polygon, unitDistance) {
   //console.log('In discretePolygonWrapper constructor');
   //console.log(polygon);
   //console.log(unitDistance);
   //console.log(bb);
   //console.log('rows is ' + rows);
   //console.log('cols is ' + cols);

   var that = this;  // for private methods to have access to this

   this.randomPosition = function() {
      var xyPoint = pointsInPolygon[Math.floor(Math.random() * pointsInPolygon.length)];
      var longitude = this.topLeftPosition.longitude + this.unitLongitude * xyPoint[1];
      var latitude = this.topLeftPosition.latitude - this.unitLatitude * xyPoint[0];
      var destination = new Position(longitude, latitude);
      destination.i = xyPoint[0];
      destination.j = xyPoint[1];
      return destination;
   } 

   function attachIJCoordinates(position) {
      position.j = Math.round((position.longitude - that.topLeftPosition.longitude) / ( that.unitLongitude));
      position.i = Math.round((position.latitude  - that.topLeftPosition.latitude)  / (-that.unitLatitude));
   }

   function getDiscretePath(currentPosition, nextPosition) {
      // gjt takes coordinates in [lat, long] form
      //console.log('that.unitDistance is ' + that.unitDistance);
      // this complexify function makes a sequence of points separated by at most a distance we specify
      // i've found that the accuracy of the distance between two consecutive points is accurate to
      // up to half a meter.
      // That is, if our parameter is 10, we might have points separated by a distance bounded by [9.5, 10.5]
      return gjt.complexify([[currentPosition.latitude, currentPosition.longitude], 
                         [nextPosition.latitude, nextPosition.longitude]], that.unitDistance / 1000).map(
            function(simplePosition) {
               var position = new Position(simplePosition[1], simplePosition[0]);
               attachIJCoordinates(position);
               return position;
            });
   }

   function selectPosition() {
      //console.log('in selectPosition');
      return that.selectPositionImpl.apply(that);
   }

   this.selectPositionImpl = function() {
      //console.log('in selectPositionImpl');
      return this.randomPosition();
   }

   // later rather than iterations we'd want to do flight time
   this.explore = function(resource, iterations) {
      //console.log('in explore');
      for(var k = 0; k < iterations; k++) {
         //var destination = this.randomPosition(); // later change to this.selectPosition
         var destination = selectPosition(); // later change to this.selectPosition

         var positions = getDiscretePath(resource.position, destination);
         //console.log(positions);

         // due to a bug in geojson-tools the first two positions are duplicates of the first position
         // to avoid duplicate values in our explored path we only consider points beyond the first
         // position when making our resource travel along a path.
         for(var i = 2; i < positions.length; i++) {
            if(!resource.travelTo(positions[i])) { 
               return; 
            }
            update(resource);
         }
      }
   }

   this.ijCoordinatesToPosition = function(i, j) {
      var longitude = this.topLeftPosition.longitude + this.unitLongitude * j;
      var latitude = this.topLeftPosition.latitude - this.unitLatitude * i;
      var position = new Position(longitude, latitude);
      position.i = i;
      position.j = j;
      return position;
   }

   function update(resource) {
      // brute force is to look at everything. we can actually examine how long it takes and then do it better
      /*
      for(var i = 0; i < that.data.length; i++) {
         for(var j = 0; j < that.data[i].length; j++) {
            if(0 == that.data[i][j]) continue;
            var longitude = that.topLeftPosition.longitude + that.unitLongitude * j;
            var latitude = that.topLeftPosition.latitude - that.unitLatitude * i;
            var position = new Position(longitude, latitude);
            if(resource.inSweepWidth(position)) {
               that.data[i][j] = (1 - that.POD) * that.data[i][j];
            }
         }
      }
      */
      attachIJCoordinates(resource.position);
      var minI = 0;
      var maxI = that.data.length;
      var minJ = 0;
      var maxJ = that.data[0].length;
      if(!isNaN(resource.radiusHint) && resource.radiusHint !== Infinity) {
         var indexRadius = Math.ceil(resource.radiusHint / unitDistance);
         minI = resource.position.i - indexRadius;
         maxI = resource.position.i + indexRadius;
         minJ = resource.position.j - indexRadius;
         maxJ = resource.position.j + indexRadius;
      }
      updateWithHint(resource, minI, maxI, minJ, maxJ);
   }

   function isValidIJ(i, j) {
      return Array.isArray(that.data[i]) && !isNaN(that.data[i][j]);
   }

   function updateWithHint(resource, minI, maxI, minJ, maxJ) {
      for(var i = minI; i < maxI; i++) {
         for(var j = minJ; j < maxJ; j++) {
            if(!isValidIJ(i, j)) continue;
            if(0 == that.data[i][j]) continue;
            var position = that.ijCoordinatesToPosition(i, j);
            if(resource.inSweepWidth(position)) {
               that.data[i][j] = (1 - that.POD) * that.data[i][j];
            }
         }
      }

   }

   this.score = function() {
      var sum = 0;
      for(var i = 0; i < this.data.length; i++) {
         for(var j = 0; j < this.data[i].length; j++) {
            sum += this.data[i][j];
         }
      } 
      return sum;
   }

   this.print = function(transform) {
      for(var i = 0; i < this.data.length; i++) {
         for(var j = 0; j < this.data[i].length; j++) {
            process.stdout.write(String(transform(this.data[i][j], i, j)));
            process.stdout.write(" ");
         }
         process.stdout.write("\n");
      }
   }

   this.getArea = function() {
      return pointsInPolygon.length;
   }

   this.POD = 0.5;
   this.unitDistance = unitDistance;
   var boundingBox = new BoundingBox(polygon);
   this.topLeftPosition = new Position(boundingBox.left, boundingBox.top);
   var rows = Math.ceil(boundingBox.heightMeters() / unitDistance);
   var cols =  Math.ceil(boundingBox.widthMeters() / unitDistance); 
   this.unitLongitude = Math.abs(boundingBox.widthLongitude()) / cols;
   this.unitLatitude = Math.abs(boundingBox.heightLatitude()) / rows;
   var pointsInPolygon = [];
   var discretePolygon = [];
   for(let i = 0; i < rows; i++) {
      discretePolygon[i] = [];
      for(let j = 0; j < cols; j++) {
         var position = this.ijCoordinatesToPosition(i, j);
         if(polygon.contains(position)) {
            pointsInPolygon.push([i,j]);
            discretePolygon[i][j] = 1.0;
         } else {
            discretePolygon[i][j] = 0.0;
         }
      }
   }
   this.data = discretePolygon;
}

function hillClimb() {
   //console.log('in hill climb');
   var position = this.randomPosition();
   var i = position.i;
   var j = position.j;
   var maxij = [i, j];
   var maxValue = this.data[i][j];
   for(var a = i-1; a <= i+1; a++) {
      for(var b = j-1; b <= j+1; b++) {
         if(Array.isArray(this.data[a]) && Boolean(this.data[a][b])) {
            if(this.data[a][b] > maxValue) {
               //console.log('selecting better point in hill climbing');
               maxValue = this.data[a][b];
               maxij = [a,b];
            }
         }  
      }
   }
   return this.ijCoordinatesToPosition(maxij[0], maxij[1]);
}


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
   //console.log(startXY);
   //console.log(destinationXY);
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

function Resource() {
   this.position = undefined;
   this.path = [];
   this.setPosition = function(position) {
      this.position = position;
      this.path = [position];
      this.distanceTraveled = 0;
   }
   this.flightTimeRemaining = Infinity; // in seconds
   this.speed = Infinity; // in meters/second
   this.distanceTraveled = 0;
   this.travelTo = function(position) {
      // make sure to return a bool and update fuel
      var distance = this.position.distanceFrom(position);
      var timeRequired = distance / this.speed;
      if(timeRequired > this.flightTimeRemaining) {
         return false;
      }
      this.flightTimeRemaining -= timeRequired;
      this.path.push(position);
      this.distanceTraveled += distance;
      //console.log('we just travelled ' + distance);
      this.setOrientation(position);
      this.position = position;
      return true;
   }
   this.orientation = 0; // in radians
   this.inSweepWidth = function(position) {
      //console.log(position);
      return this.inSweepWidthImpl.call(this, position);
   }
   this.inSweepWidthImpl = function(position) {
      //console.log(this.position);
      //console.log(position);
      //console.log(this.position.distanceFrom(position));
      var radius = 10; // meters
      return this.position.distanceFrom(position) <= radius;
   }

   this.setOrientation = function(destination) {
      this.orientation = 0; // do nothing for now
   }

   // error in computing position from offset could be innacurate to (1/2 unit distance) * sqrt(2)
   // to be safe you will want to set you hint to account for this
   this.radiusHint = 20; 
}

var polygon = new Polygon(input);
var unitDistance = 10;

var dpw = new discretePolygonWrapper(polygon, unitDistance);
//console.log(dpw);

var start = dpw.randomPosition();

var originalScore = dpw.score();
var iterations = 100;
var resource = new Resource();
resource.setPosition(start);
dpw.selectPositionImpl = hillClimb;
dpw.explore(resource, iterations);
var end = resource.position; 
console.log('path is ' + resource.path.length + ' long');
console.log('distance traveled is ' + resource.distanceTraveled);
//console.log(resource.path);
var finalScore = dpw.score();
var explored = Math.round(100 * (1 - finalScore / originalScore));
console.log("percentage explored is " + explored);
console.log("quality of search is " + explored / resource.distanceTraveled);
console.log("second quality of search is " + 100 * (explored / resource.distanceTraveled) / (100 / dpw.getArea()));

dpw.print(asSymbolsGenerator(start, end));
dpw.print(exploredPath);
dpw.print(asSymbolsGeneratorWithTransform(start, end, exploredPathAsSymbols));
