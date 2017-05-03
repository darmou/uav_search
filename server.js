// // server.js
//
//
//
// // ROUTES FOR OUR API
// // =============================================================================
//
//  // <-- route middleware and first route are here
//
// // more routes for our API will happen here
//
// // on routes that end in /bears
// // ----------------------------------------------------
// router.route('/submit_search_data')
//
// // create a bear (accessed at POST http://localhost:8080/api/submit_search_data)
//     .post(function(req, res) {
//
//         let json = JSON.parse(req.body);
//         let type = json.type;
//         if(type === "FeatureCollection") {
//             //We have a list of polygons
//             let features = json.features;
//             features.map((feature) =>  {
//
//             });
//
//         }
//
//         //TODO: The res.json should return valid paths back to the user
//         res.json({ message: 'Processed successfully' });
//
//     });
//
// // REGISTER OUR ROUTES -------------------------------
// // all of our routes will be prefixed with /api
// app.use('/api', router);
//
// 'use strict';
var Promise = require("bluebird");
var db = require("sqlite");

var SwaggerExpress = require('swagger-express-mw');
var app = require('express')();
module.exports = app; // for testing

var config = {
    appRoot: __dirname // required config
};

SwaggerExpress.create(config, function(err, swaggerExpress) {
    if (err) { throw err; }

    // install middleware
    swaggerExpress.register(app);

    var port = process.env.PORT || 10010;

    Promise.resolve()
    // First, try to open the database
        .then(() => db.open('./settings.sqlite', { Promise }))      // <=
        // Update db schema to the latest version using SQL-based migrations
        .then(() => db.migrate({ force: 'last' }))              // <= // .then(() => db.migrate({ force: 'last' }))
        // Display error message if something went wrong
        .catch((err) => console.error(err.stack))
        // Finally, launch the Node.js app
        .finally(() => app.listen(port));
    //app.listen(port);

    if (swaggerExpress.runner.swagger.paths['/submit_search_data']) {
        console.log('try this:\ncurl http://127.0.0.1:' + port + '/submit_search_data');
    }
});




