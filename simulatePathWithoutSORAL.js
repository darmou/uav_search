var gju = require('geojson-utils');
var gjt = require('geojson-tools');

function AreaWrapper(pointArray, POA, area) {
   this.polygon = new Polygon(pointArray);
   this.POA = POA;
   this.area = area;
}

// should i have all the discrete polygons in memory?
// right now i compute the discrete polygon when i need it but maybe that's unweildy?
function UAVPathPlanner(areaWrappers, unitDistance, startPosition, endPosition) {
   this.areaWrappers = areaWrappers;
   this.unitDistance = unitDistance;
   this.startPosition = startPosition;
   this.endPosition = endPosition;

   // soral processing can be done here.
   var that = this;
   function extendWithAllocations() {
      console.log('extending allocations on area wrappers');
      var allocation = .5;
      that.areaWrappers.forEach(function(areaWrapper) {
         areaWrapper.allocation = allocation;
         allocation = allocation / 2;
      });
   }

   function createDiscreteAreas() {
      console.log('createing discrete subareas');
      that.areaWrappers.forEach(function(areaWrapper) {
         areaWrapper.discreteArea = new discretePolygonWrapper(areaWrapper.polygon, that.unitDistance);
      });
   }

   // same as reset, really
   this.initialize = function() {
      extendWithAllocations();
      createDiscreteAreas();
      //this.print();
   }


   this.print = function() {
      console.log('printing all subareas');
      this.areaWrappers.forEach(function(areaWrapper) {
         areaWrapper.discreteArea.print(exploredPathAsSymbols); // this will just show path and nothing else.
      });
   }

   this.setPointSelectionImplementation = function(impl) {
      this.areaWrappers.forEach(function(areaWrapper) {
         areaWrapper.selectPositionImpl = impl;
      });
   }

   this.score;

   // the way we score this is percentage of area explored weighted by allocation
   // all the allocations should add to some positive number no greater than 1
   // contribution of subarea score is percentage explored times allocation
   // this score should add to some number between 0 and 100.
   this.explore = function(resource) {
      console.log('in explore(resource) for UAVPathPlanner');
      this.score = 0;
      var totalFlightTime = resource.flightTimeRemaining;
      console.log('total flight time is ')
      //console.log('total flight time is ' + totalFlightTime);
      console.log(totalFlightTime);
      // the resource should have some initial position
      resource.travelTo(this.startPosition);
      // we want to sort allocations by allocation variable from high to low
      // by the way in the future we want a better way of selecting where to go to.
      // like... after we explore, we look at the closest next polygon
      // maybe this can be user configured?
      // right now this explores areas in order of highest allocations
      this.areaWrappers.sort(function(a, b) {
         a.allocation - b.allocation;
      });

      this.areaWrappers.forEach(function(areaWrapper) {
         console.log('area allocation is ' + areaWrapper.allocation);
         var discreteArea = areaWrapper.discreteArea;
         var areaFlightTime = areaWrapper.allocation * totalFlightTime;
         console.log('area flight time is ' + areaFlightTime);
         discreteArea.explore(resource, areaFlightTime); 

         // score has to be weighted by alloction and area, i think.
         // maybe i should only return a normalized score?
         // like percentage explored?
         that.score += discreteArea.normalizedScore() * areaWrapper.allocation;
         console.log(that.score);
      });

      resource.travelTo(this.endPosition);
      console.log('score is: ' + Math.round(this.score));
   } 

   this.initialize();
}

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

   //console.log(this);

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

   var that = this;  // for private methods to have access to this

   this.ijCoordinatesToPosition = function(i, j) {
      var longitude = this.topLeftPosition.longitude + this.unitLongitude * j;
      var latitude = this.topLeftPosition.latitude - this.unitLatitude * i;
      var position = new Position(longitude, latitude);
      position.i = i;
      position.j = j;
      return position;
   }

   this.closestPositionInArea = function(targetPosition) {
      console.log('in closestPositionToArea');
      var closestDistance = Infinity;
      var closestPosition;
      var t = this;
      for(var k = 0; k < pointsInPolygon.length; k++) {
         var i = pointsInPolygon[k][0];
         var j = pointsInPolygon[k][1]; 

         var position = this.ijCoordinatesToPosition(i, j);
         //console.log(position);

         var distance = position.distanceFrom(targetPosition);
         if(distance < closestDistance) {
            closestPosition = position;
            closestDistance = distance;
         }
      };
      return closestPosition;
   }

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
      return that.selectPositionImpl.call(that);
   }

   this.selectPositionImpl = function() {
      return this.randomPosition();
   }

   // returns the modified flight time
   function transportResourceToArea(resource, areaFlightTime) {
         console.log('in transportResourceToArea() for discretePolygonWrapper');
         var start = that.closestPositionInArea(resource.position); 
         console.log('closest position is');
         console.log(start);
         var timeToTravelToArea = resource.timeToTravelTo(start);
         resource.travelTo(start);
         return areaFlightTime - timeToTravelToArea;
   } 

   this.explore = function(resource, areaFlightTime) {
      // we need to transport the resource within our bounding box
      console.log('in explore() for discretePolygonWrapper');
      areaFlightTime = transportResourceToArea(resource, areaFlightTime);
      var iterations = 0;
      var canContinueExploring = true;
      while(canContinueExploring) {
         iterations += 1;
         //console.log('area flight time for iteration is ' + areaFlightTime);
         var destination = selectPosition(); // later change to this.selectPosition

         var positions = getDiscretePath(resource.position, destination);
         //console.log(positions);

         // due to a bug in geojson-tools the first two positions are duplicates of the first position
         // to avoid duplicate values in our explored path we only consider points beyond the first
         // position when making our resource travel along a path.
         for(var i = 2; i < positions.length; i++) {
            var timeToFlyToPosition = resource.timeToTravelTo(positions[i]);
            if(timeToFlyToPosition > areaFlightTime) {
               console.log('flight time is over for subarea');
               canContinueExploring = false;
               break;
            }
            if(!resource.travelTo(positions[i])) { 
               console.log('flight time is over for resource');
               canContinueExploring = false;
               break;
            }
            areaFlightTime -= timeToFlyToPosition;
            update(resource);
         }
      }
      console.log('there were ' + iterations + ' iterations');
   }


   function update(resource) {
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

   // a normalized score would just be a percentage of the area explored
   this.normalizedScore = function() {
      return Math.round((this.score() / pointsInPolygon.length) * 100);
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

   //console.log('in discretePolygonWrapper constructor');
   //console.log('polygon is ' );
   //console.log(polygon);
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
   var continueHillClimb = true;
   while(continueHillClimb) {
      continueHillClimb = false;
      for(var a = i-1; a <= i+1; a++) {
         for(var b = j-1; b <= j+1; b++) {
            if(Array.isArray(this.data[a]) && Boolean(this.data[a][b])) { // use isValidIJ ?
               if(this.data[a][b] > maxValue) {
                  //console.log('selecting better point in hill climbing');
                  maxValue = this.data[a][b];
                  maxij = [a,b];
                  continueHillClimb = true;
               }
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

// all distance units are meters
// all time units are seconds
function Resource(speed, flightTime, position) {
   this.path = [];
   this.setPosition = function(position) {
      this.position = position;
      this.path = [position];
      this.distanceTraveled = 0;
   }
   this.flightTimeRemaining = flightTime; // in seconds
   this.speed = speed; // in meters/second
   this.distanceTraveled = 0; // in meters

   this.timeToTravelTo = function(position) {
      var distance = this.position.distanceFrom(position);
      var timeRequired = distance / this.speed;
      return timeRequired;

   }
   this.travelTo = function(position) {
      // make sure to return a bool and update fuel
      var timeRequired = this.timeToTravelTo(position);
      var distance = this.position.distanceFrom(position);
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
      var radius = 10; // meters
      return this.position.distanceFrom(position) <= radius;
   }

   this.setOrientation = function(destination) {
      this.orientation = 0; // do nothing for now
   }

   // error in computing position from offset could be innacurate to (1/2 unit distance) * sqrt(2)
   // to be safe you will want to set you hint to account for this
   this.radiusHint = 20; 

   // needed for inialization of extra varaibles
   this.setPosition(position);
}

var input ={"type":"FeatureCollection","features":[{"type":"Feature","properties":{"POA":0.01,"area":2.3},"geometry":{"type":"Polygon","coordinates":[[[-80.01574516296387,38.40840605494758],[-80.01372814178467,38.40840605494758],[-80.01372814178467,38.41005383575983],[-80.01574516296387,38.41005383575983],[-80.01574516296387,38.40840605494758]]]}},{"type":"Feature","properties":{"POA":0.04,"area":0.4},"geometry":{"type":"Polygon","coordinates":[[[-80.01372814178467,38.41008746354846],[-80.01372814178467,38.40840605494758],[-80.01424312591551,38.406522830869775],[-80.01274108886719,38.4072963038403],[-80.01218318939209,38.406152906088074],[-80.01209735870361,38.41106266261135],[-80.01372814178467,38.41008746354846]]]}},{"type":"Feature","properties":{"POA":0.1,"area":0.3},"geometry":{"type":"Polygon","coordinates":[[[-80.01222610473633,38.406152906088074],[-80.01068115234375,38.40527853089542],[-80.01020908355713,38.40719541653097],[-80.01115322113037,38.407800738274325],[-80.00990867614746,38.408338797789796],[-80.01093864440918,38.40924676413821],[-80.01042366027832,38.41039011294187],[-80.01205444335938,38.41106266261135],[-80.01222610473633,38.406152906088074]]]}},{"type":"Feature","properties":{"POA":0.2,"area":0.7661791},"geometry":{"type":"Polygon","coordinates":[[[-80.01033782958984,38.41039011294187],[-80.01093864440918,38.40928039230239],[-80.00982284545898,38.40837242637651],[-80.00784873962402,38.409952952300074],[-80.01033782958984,38.41039011294187]]]}},{"type":"Feature","properties":{"POA":0.09,"area":0.12999},"geometry":{"type":"Polygon","coordinates":[[[-80.00754833221436,38.40944853288866],[-80.00917911529541,38.40813702594095],[-80.00977993011475,38.407800738274325],[-80.00947952270508,38.40722904564973],[-80.00699043273926,38.406993641489834],[-80.00754833221436,38.40944853288866]]]}},{"type":"Feature","properties":{"POA":0.1,"area":1.1},"geometry":{"type":"Polygon","coordinates":[[[-80.00977993011475,38.40342885620873],[-80.00733375549316,38.40342885620873],[-80.00733375549316,38.40564846015252],[-80.00977993011475,38.40564846015252],[-80.00977993011475,38.40342885620873]]]}},{"type":"Feature","properties":{"POA":0.08,"area":".7"},"geometry":{"type":"Polygon","coordinates":[[[-80.00982284545898,38.4056820899911],[-80.0073766708374,38.4056820899911],[-80.00699043273926,38.40692638301762],[-80.00947952270508,38.40722904564973],[-80.00982284545898,38.4056820899911]]]}}]}; 

var areaWrappers = input.features.map(function(feature) {
   var POA = feature.properties.POA;
   var area = feature.properties.area;
   var pointArray = feature.geometry.coordinates[0]; 
   return new AreaWrapper(pointArray, POA, area);
});
//console.log(areaWrappers);

var unitDistance = 10;
var basePosition = areaWrappers[0].polygon.positions[0];
var start = basePosition;
var end = basePosition;
var pathPlanner = new UAVPathPlanner(areaWrappers, unitDistance, start, end);
pathPlanner.setPointSelectionImplementation(hillClimb); // untested
//console.log(pathPlanner.areaWrappers);

// we want to see initial state
pathPlanner.print();

var speed = 10; // in meters/second
var flightTime = 1200; // 20 minutes
var resource = new Resource(speed, flightTime, basePosition);
pathPlanner.explore(resource);

// now this is the final state
pathPlanner.print();

console.log('distance travelled: ' + Math.round(resource.distanceTraveled));
console.log('time spent flying: ' + Math.round(resource.distanceTraveled / resource.speed));
console.log('path length ' + resource.path.length);
console.log('normalized score: ' + Math.round(pathPlanner.score));
console.log('distance from UAV and endpoint: ' + resource.position.distanceFrom(end));



//var polygon = new Polygon(input);

/*
var dpw = new discretePolygonWrapper(polygon, unitDistance);
//console.log(dpw);

var start = dpw.randomPosition();

var originalScore = dpw.score();
var iterations = 100;
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
console.log("second quality of search is " + 
            100 * (explored / resource.distanceTraveled) / (100 / dpw.getArea()));

dpw.print(asSymbolsGenerator(start, end));
dpw.print(exploredPath);
dpw.print(asSymbolsGeneratorWithTransform(start, end, exploredPathAsSymbols));
*/
