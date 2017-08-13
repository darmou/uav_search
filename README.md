# UAV_SAR for FIND

**tldr;** we compute a UAV flight path to maximize the probability it will find its target

**Slightly long tldr;** We have a set of **regions** which our target might be in. Each region has a different **probability** that the target is contained within it. Furthermore, each region might have different properties which affect how easy it is to find our target. For example, lots of trees might obscure the view of the ground. We have a single UAV with a camera, and known **detectability** for our target, if we are looking at it. We want to compute a **path** the UAV can fly to maximize the probability of target detection. 
  * Because we need a path, the regions are geopolygons.
  * Probability and detectability are assumed constant across the region, before searching begins.
  * We assume little to no analysis can be performed during flight.

-----

# The input [units/default]:

## UAV
* flight time [1200s] - _Note: FIND UI will use minutes._
* flight speed [2 m/s] - ~4mph over full canopy
* flight height-above-ground [45m] - ~150'
* camera tilt [0º]
    - Allow [0..+45] in 5º increments
    - Allow <0?
* launch point [lat/lon] - User must set. FIND can default to IPP.
* landing point [lat/lon] - Default to start point
* **Camera FOV** - Some description of actual camera footprint
    - Suggest **angle subtended when pointed straight down**
    - Allows us to project trapezoid/frustrum
    - Sets absolute limit of detectability at a given time

## Search Regions

# Terminology
First some region terms.

* **Search Area**: The _entire_ area that needs to be searched.  _Much_ larger than is typically sent to `uav_search` at one time.  For our purposes in FIND we typically use the 95% ring from the IPP (horizontal displacement model).
* **Planning Region**:  These are very large areas typically used in the Mattson consensus process, breaking the search into about a dozen pieces.
* **Searchable Segments**:  This is the **actual area that a search resource will be tasked to search**.  In the case of a UAV, this might represent a single sortie, or possibly a few battery changes. But if we are defining the flight time by the battery duration, then each sortie can become the searchable segment from the air.
* **Autosegments**: FIND automatically creates segments based upon findable features on the ground from the perspective of a ground team (roads, paths, utility lines, hydrologogy, ridges).  The FIND planner can then combine _autosegments_ to make the _searchable segments_.  However, a UAV isn’t really limited by the autosegments or findable features.  Instead, it can really think of the world as a series of grids and follow coordinates.

And some search theory terms:

* **Sweep Width, _W_** An abstract measure of detectability, with units [m], being the width of a perfect "cookie-cutter" detector which would, on average, detect the same number of targets as our actual sensor.
* **Area, _A_**: Physical size of the region, in [m^2].
* **POA, _P_**: Probability of Area - the current subjective probability the subject is in this region, according to our best (averaged) estimate.
* **Pden, 𝜌**: _P_/_A_, the probability divided by the physical area. The region known as Earth has _very_ high probability, but an _exceedingly_ low Pden. 
* **PSR**: Probable Success Rate - the rate of change of probability at the start of the search, bigger is better, [Hz, ie 1/s]

With that in mind...

# Search Region Inputs
* **UAV Area** - the bounding geopoly the UAV _must_ stay within
    - Provided by FIND, by default equals the Search Area
    - _But may be smaller_, eg to deconflict multiple UAV planners
* **UAV Segments** - tiles the UAV Area into sortie-sized pieces that may or may not match the Searchable Segments. Each segment has:
    - Geopolygon for the border
    - _A_ (could be calculated from geopoly)
    - _W_ for this UAV-altitude-speed combo_
    - _PSR_ 
    - _P_ (could be calculated from as (PSR * A) / (W*v)

## Sweep Widths
* If we assume a single UAV-altitude-speed-tilt then:
    * one _W_ for each region
    * can be sent as part of region or as a table under UAV
* If we assume multiple UAVs each with fixed altitude-speed-tilt:
    * Then a UAV-by-region table of _W_s
    * Maybe better to think of as a separate object
* If we allow choice of best altitude/speed/tilt per UAV
    * Then we need to extend SORAL to handle mutual exclusivity
    * And would have to supply larger tables

FIND will eventually have a sweep width table that gives sweep width values or correction factors for things like height, canopy, tilt, speed, visibility. 


# The output:
A path of geocoordinates. Elements need to specify longitude and latitude.

**TODO: add detail here**

# High level overview of how we approached the problem:

We can use [SORAL](https://github.com/ctwardy/soral) to determine the total _amount_ of time to spend in each region. Our task is to find the path that gets as close as possible to the probability of success from the ideal SORAL plan.

## Noah writes:

We are assuming that we will search each geopolygon so this is very similar to the travelling salesman problem. Our approximation for the order from which to search geopolygons is just based on which is currently unvisited and closest: it's the greedy solution to the TSP.

When we visit a given geopolygon we have a few high level steps: First we want our resource to travel to some point within the polygon. Doesn't really matter where so we just choose the closest point. Then, until our resouce has exhausted the time available, it does the following steps:

1. compute some random point in our polygon
2. use hill climbing repeatedly to find a point that has been "less" explored (so higher probability target is there)
3. travel to it, exploring points in our polygon as we travel
4. repeat

### So what we're doing is:

1. select the closest unvisited geopolygon
2. explore that geopolygon for some period of time that's determined by SORAL
3. repeat until no unvisited polygons exist

The challenging part was discretizing the polygon and finding a way to update the cells as the drone travelled. 

### Discretizing the polygon
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

### Searching the geopolygon
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
    If running it on localhost you can use curl or Postman. The system will return the existing settings.
http://127.0.0.1:10010/define_settings/
```
{
  "total_flight_time": 99,
  "uav_speed": 20.1,
  "start_location_lat": -33,
  "start_location_lng": 288,
  "end_location_lat": -33,
  "end_location_lng": 222
}
```
To delete the existing settings so that the system uses the defaults:
```
{
  "reset": true
}
```

## Code Summary
All the search code is in a single file, **simulatePathWithSORAL.js**. It is called by the controller code which is run when you enter 'npm start' into the command line. 

Inside that file are javascript classes (e.g. function UAVPathPlanner(/*parameters*/) { /*body*/ }). Some of the classes are:
* Position - just our way of representing geocoordinates in code with some helper methods
* Polygon - used to take the polygon area bounding edges and converts them into a form that is easier to work with.
* AreaWrapper - contains an instance of the polygon class and some other data like POA, speed, ESW, etc.
* BoundingBox - used for discretizing a polygon into a grid of points, some of which are inside the polygon
* discretePolygonWrapper - main class for dealing with operations on discrete polygons with data and operations
* UAVPathPlanner - top-level class that contains all information to search over all areas with resource
* Resource - self-explanatory

Some relationships:
- A polygon is more or less a collection of Position instances (the vertices of the convex polygon)
- AreaWrapper contains a single instance of a polygon + metadata like POA, speed
- BoundingBox + Polygon classes are used by discretePolygonWrapper to create a discrete area
- UAVPathPlanner uses AreaWrapper instances to generate discretePolygonWrapper instances, which is uses for the algorithm.

The meat of the algorithm is done through the `explore()` function in UAVPathPlanner and the `explore()` function of discretePolygonWrapper. Basically UAVPathPlanner computes the SORAL stuff and decides how to explore the given discrete polygon areas. Then when it picks one, it runs the `explore()` method for the discretePolygonWrapper instance. In discretePolygonWrapper, `explore()` will try to transport the resource to the closest point inside the bounds of the polygon, then it will do hill climbing. This process will terminate when the resource does not have enough flight time left to move to whatever the next planned position is (this could be the first step or at some point during hill climbing).

Conceptually it would look something like

```
UAVPathPlanner
  function explore(resource):
    allocations = computeAllocations(resource)
    for allocation in allocations:
      allocation.discretePolygonWrapperInstance.explore(resource)

discretePolygonWrapper
  function explore(resource):
    closestPoint = getClosestPoint(resource)
    if !resource.canTravelTo(closestPoint):
      return
    resource.travelTo(closestPoint)
    while(true):
      nextPoint = getNextPointToTravelTo(resource)
      if !resource.canTravelTo(nextPoint):
        return
      resource.travelTo(nextPoint)
    return
```
