**tldr;** we compute a path for a UAV to follow to maximize the probability it will find its target

Slightly long tldr; We have a set of geopolygons for which our target might be in. Each geopolygon has a different probability that the target is contained within it. Furthermore, each geopolygon might have different properties which affect how easy it is to find our target. For example, lots of trees might obscure the view of the ground. Each geopolygon is supposed to represent some homogenous area of land. We have a single resouce (our UAV) which has a special camera that can see some area in front of it with some probability of detecting our target if we are looking at it. We want to compute some path that the UAV can fly in that will maximize target detection. The images taken by the UAV are examined later, so we want to UAV to fly around until it runs out of energy.


# The input:

## UAV
* flight time [s] (default = 1800s?)
* flight speed [m/s] (1 m/s?)
* flight height-above-ground [m] (30m?)
* camera tilt [º] [0º?]
    * range: [-45,45]?  [0,45]?  [0,90]?
    * resolution: 1º, 5º, 15º?
* launch point (lat/lon)
* landing point (lat/lon) (start point?)
* _Camera FOV as radius or angle or ...?_
   - W is an abstract measure, but we have a path
   - So we can approximate a lateral range curve 
   - If we know something about camera footprint

## Search Region
* Bounding polygon — UAV must stay within
  * Vertices as lat/lon
* List of Subregions each with:
  * Vertices of geopolygon (lat/lon)
  * Area [m^2] (though could be calculated from geopoly)
  * W for this UAV / altitude / speed [m]
  * PSR - probable success rate [Hz, ie 1/s]
  * POA - probability of area [nonnegative float] (though could be calculated 
$$POA = PSR*A / (W*v)$$)

## Sweep Widths
* If we assume a single UAV-altitude-speed-tilt then:
  * one W for each region
  * can be sent as part of region or as a table under UAV
* If we assume multiple UAVs each with fixed altitude-speed-tilt:
  * Then a UAV-by-region table of Ws
  * Maybe better to think of as a separate object
* If we allow choice of best altitude/speed/tilt per UAV
  * Then we need to extend SORAL to handle mutual exclusivity
  * And would have to supply larger tables


# The output:
   A path of geocoordinates. Elements need to specify longitude and latitude

High level overview of how we approached the problem:

   SORAL is a package which will tell us how much time to spend searching in each geopolygon.
   We are assuming that we will search each geopolygon so this is very similar to the travelling salesman problem
      Our approximation for the order from which to search geopolygons is just based on which is currently unvisited and closest.
      It's the greedy solution to the TSP.
   When we visit a given geopolygon we have a few high level steps:
      First we want our resource to travel to some point within the polygon. Doesn't really matter where so we just choose the closest point.
      Until our resouce has exhausted the time available, it does the following steps:

1. compute some random point in our polygon
2. use hill climbing repeatedly to find a point that has been "less" explored (so higher probability target is there)
3. travel to it, exploring points in our polygon as we travel
4. repeat

# So what we're doing is:

1. select the closest unvisited geopolygon
2. explore that geopolygon for some period of time that's determined by SORAL
3. repeat until no unvisited polygons exist

The challenging part was discretizing the polygon and finding a way to update the cells as the drone travelled. 

## Discretizing the polygon
Here's how we approached discretizing the geopolygon:

1. Find a bounding box for the polygon where the bounds were latitude and longitude (note: this will break for special edge cases, but we're not in Antartica or on the prime meridian)
2. Given a unit distance (the spacing between grid cells), we computed unit longitude and unit latitude. Unit longitude is just how much of a longitude differential was equal the unit distance, if latitude was fixed.
  * Note: our drone will probably only be able to fly for 20 minutes, so the obvious limitations here don't matter. Our bounding box should be pretty small.)
  * Same thing for unit latitude, it's how much of a latitude differential was equal to the unit distance, if longitude was fixed.
3. The number of rows was `Math.ceil()` of the height in longitude divided by the unit longitude. The number of columns was `Math.ceil()` of the width in latitude divided by the unit latitude.
4. Knowing some fixed point (here, the top left position of our bounding box as geocoordinates) as (0,0)...
  * we can compute the closest (i, j) approximation of some geocoordinate
  * for a given (i,j), we can convert it into its geocoordinate equivalent
5. Now for each (i,j) in our bounding box, we compute the geocoordinate equivalent and check if it's within our polygon
  * if it is, we mark grid[i][j] as 1
  * otherwise, we mark grid[i][j] as 0
  * This is about probabilities of finding our target.
6. The percentage explored of our area is (1 * (sum of all cell values) / (count of all cells initialized to 1)) * 100.

## Searching the geopolygon
Here's how we approached exploring our geopolygon with a resource

   1. First we transport our resource to the closest position that has a non*zero value within our discretized grid
   2. Compute a destination point, which can be configured by the user to use hill*climbing
   3. From the resources position and the destination position, we have a function which will give us a sequence of points spaced out by some parameter
      For example, if we were on the number line, our start position was 0, and our destination was 50
      We could construct a sequence of points that looks like [0, 10, 20, 30, 40, 50].
      We have a library which will do this for us.
      As far as what distance to choose as our spacing, it seemed like the unit distance used to determine how far away adjacent grid cells are was a good idea.
   4. For each successive point in our array of points
      * Tell the resouce to travel to it
         This may also update the orientation of the resource (i.e. if it travels right, it's facing right, and the camera might not be omnidirectional)
         The resource may have run out of fuel, so we need to check for that, too, in which case we stop.
      * Update our grid with the fixed position of the resource
         This is as if the resource were taking a picture
         Depending on the sweep width and orientation, it will see different cells in its field of view
            Note that there is a probability of detection, so even if the resource is facing it's target, it might miss it.
            The cells that are viewable are updated as probability_new = (1 * POD) * probability_old
               We're basically pretending that we never see our target when we update grid cells
   5. repeat steps b*d.

# Limitations
What are some limitations of this project?

   1. No handing of edge cases for geocoordinate computations. This is a prototype and we're looking to see if it works. Things will be fine in North America.
   2. We ignore the curvature of the earth when discretizing the geopolygons. For small polygons that don't span hundreds of kilometers this should be ok.
         We assume that within our bounding box, each unit of latitude is equal to the same fixed distance.
         We assume that within our bounding box, each unit of longitude is equal to the same fixed distance.
   3. When we update our geopolygons we only update the cells we just examined
         If we want our geopolygons to have the same aggregate probability we are techincally supposed to update the other cells to the aggregate probability remains fixed
            This is expensive computationally.
            For simpliclity, we are assuming that our UAV searching is reducing the probability the target is in the area because it hasn't been found.
            This will probably not be a problem, but it's something to consider.
   4. It can only handle one resource at a time.
   5. Visiting the distinct geopolygons is very similar to the travelling salesman problem, and we use a simple approximation.
         If the number of geopolygons were to be very large, how we traverse them might factor into the performance

# Cool Features
What are some cool features about this project?

   1. A lot of things are customizable. You can try new things out and see how it affects performance without major changes to the code.
      Here are some things you can customize:

## What's customizeable?

   1. Selecting a destination point to fly to when searching a subarea:
      * select random position in geopolygon
      * select random position in geopolygon and then hill climb
   2. Constraints on your resource to tell you if you can fly to a new position
      * always make sure you have enough fuel to fly to some specified destination point
      * always make sure you have enough fuel to travel to the new position
   3. How to assign allocations to the geopolygons
      * SORAL (not yet implemented as SORAL is still being repaired)
      * equal allocations among all geopolygons (1 / (number of geopolygons))
      * weighted allocations by POA (geopolygon.POA / (sum of all geopolygon POAs))
   4. Sweep width of resource
      * Circular sweep width of specified radius
      * todo: trapezoidal view based on orientation
   5. How to visualize the discrete geopolygons
      * use " ", "*", and "o" to represent 0 probability areas, unexplored areas with > 0 probability, and explored areas which started with > 0 probability.
         This is super helpful for testing
      * use "    " and "\d\d\d\d" to represent 0 probability areas and non*zero probability areas with their current probability

## Setting the settings:
    If running it on localhost you can use curl or Postman.
http://127.0.0.1:10010/define_settings/
```
{
  "start_date": "3/3/2017",
  "end_date": "3/3/2017",
  "total_flight_time": 99,
  "uav_speed": 20.1
}
```