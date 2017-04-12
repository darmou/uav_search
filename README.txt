The tldr; we compute a path for a UAV to follow to maximize the probability it will find its target

Slightly long tldr; We have a set of geopolygons for which our target might be in. Each geopolygon has a different probability that the target is contained within it. Furthermore, each geopolygon might have different properties which affect how easy it is to find our target. For example, lots of trees might obscure the view of the ground. Each geopolygon is supposed to represent some homogenous area of land. We have a single resouce (our UAV) which has a special camera that can see some area in front of it with some probability of detecting our target if we are looking at it. We want to compute some path that the UAV can fly in that will maximize target detection. The images taken by the UAV are examined later, so we want to UAV to fly around until it runs out of fuel.

The input:
   Data in a format TBD, but at the least it should contain: 
      - vertices for a geopolygon (points must specify longitude, latitude).
      - the probability the target is in a given geopolygon
      - maybe the total area of the geopolygon, though technically we can compute it or approximate it ourselves

Some other information not passed as input but relevant:
   The resource
      - For our purposes, a drone
      - How much effort (time) is available for the resource to search
      - How fast the UAV can travel (all units are SI, so meters per second)
      - Sweep width 
         This is really function which tells us if certain geocoordinates are within the view of the camera
      - Radius hint
         We know nothing about the details of the sweep width and if we know the radius from the UAV where viewable objects are bounded, we can reduce the computation time by not looking things we know are too far away to be viewable. This variable might eventually become part of the sweep width.
   Hill climbing algorithm
      - I'll get more into this later, but it's relevant when searching a given subarea so we reduce overlap

The output:
   A path of geocoordinates
      Elements need to specify longitude and latitude

High level overview of how we approached the problem:
   SORAL is a package which will tell us how much time to spend searching in each geopolygon.
   We are assuming that we will search each geopolygon so this is very similar to the travelling salesman problem
      Our approximation for the order from which to search geopolygons is just based on which is currently unvisited and closest.
      It's the greedy solution to the TSP.
   When we visit a given geopolygon we have a few high level steps:
      First we want our resource to travel to some point within the polygon. Doesn't really matter where so we just choose the closest point.
      Until our resouce has exhausted the time available, it does the following steps:
         (a) compute some random point in our polygon
         (b) use hill climbing repeatedly to find a point that has been "less" explored (so higher probability target is there)
         (c) travel to it, exploring points in our polygon as we travel
         (d) repeat
   So what we're doing is:
      (a) select the closest unvisited geopolygon
      (b) explore that geopolygon for some period of time that's determined by SORAL
      (c) repeat until no unvisited polygons exist

The challenging part was discretizing the polygon and finding a way to update the cells as the drone travelled. 
Here's how we approached discretizing the geopolygon: 
   (a) find a bounding box for the polygon where the bounds were latitude and longitude (note: this will break for special edge cases, but we're not in Antartica or on the prime meridian)
   (b) given a unit distance (the spacing between grid cells), we computed unit longitude and unit latitude
      unit longitude is just how much of a longitude differential was equal the unit distance, if latitude was fixed
         fyi, our drone will probably only be able to fly for 20 minutes, so the obvious limitations here don't matter. Our bounding box should be pretty small.
      same thing for unit latitude, it's how much of a latitude differential was equal to the unit distance, if longitude was fixed
   (c) The number of rows was Math.ceil() of the height in longitude divided by the unit longitude
       The number of columns was Math.ceil() of the width in latitude divided by the unit latitude
   (d) Knowing some fixed point (here, the top left position of our bounding box as geocoordinates) as (0,0)...
         we can compute the closest (i, j) approximation of some geocoordinate
         for a given (i,j), we can convert it into its geocoordinate equivalent
   (e) Now for each (i,j) in our bounding box, we compute the geocoordinate equivalent and check if it's within our polygon
         if it is, we mark grid[i][j] as 1
         otherwise, we mark grid[i][j] as 0
         This is about probabilities of finding our target.
   (f) The percentage explored of our area is (1 - (sum of all cell values) / (count of all cells initialized to 1)) * 100.

Here's how we approached exploring our geopolygon with a resource
   (a) First we transport our resource to the closest position that has a non-zero value within our discretized grid
   (b) Compute a destination point, which can be configured by the user to use hill-climbing
   (c) From the resources position and the destination position, we have a function which will give us a sequence of points spaced out by some parameter
      For example, if we were on the number line, our start position was 0, and our destination was 50
      We could construct a sequence of points that looks like [0, 10, 20, 30, 40, 50].
      We have a library which will do this for us.
      As far as what distance to choose as our spacing, it seemed like the unit distance used to determine how far away adjacent grid cells are was a good idea.
   (d) For each successive point in our array of points
      - Tell the resouce to travel to it
         This may also update the orientation of the resource (i.e. if it travels right, it's facing right, and the camera might not be omnidirectional)
         The resource may have run out of fuel, so we need to check for that, too, in which case we stop.
      - Update our grid with the fixed position of the resource
         This is as if the resource were taking a picture
         Depending on the sweep width and orientation, it will see different cells in its field of view
            Note that there is a probability of detection, so even if the resource is facing it's target, it might miss it.
            The cells that are viewable are updated as probability_new = (1 - POD) * probability_old
               We're basically pretending that we never see our target when we update grid cells
   (e) repeat steps b-d.

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

What are some cool features about this project?
   1. A lot of things are customizable. You can try new things out and see how it affects performance without major changes to the code.
      Here are some things you can customize:

What's customizeable?
   1. Selecting a destination point to fly to when searching a subarea:
      - select random position in geopolygon
      - select random position in geopolygon and then hill climb
   2. Constraints on your resource to tell you if you can fly to a new position
      - always make sure you have enough fuel to fly to some specified destination point
      - always make sure you have enough fuel to travel to the new position
   3. How to assign allocations to the geopolygons
      - SORAL (not yet implemented as SORAL is still being repaired)
      - equal allocations among all geopolygons (1 / (number of geopolygons))
      - weighted allocations by POA (geopolygon.POA / (sum of all geopolygon POAs))
   4. Sweep width of resource
      - Circular sweep width of specified radius
      - todo: trapezoidal view based on orientation
   5. How to visualize the discrete geopolygons
      - use " ", "*", and "o" to represent 0 probability areas, unexplored areas with > 0 probability, and explored areas which started with > 0 probability.
         This is super helpful for testing
      - use "    " and "\d\d\d\d" to represent 0 probability areas and non-zero probability areas with their current probability
