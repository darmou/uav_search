'use strict';
//import Promise from 'bluebird';
var Promise = require("bluebird");
var db = require("sqlite");
//import db from 'sqlite';


/*
 'use strict' is not required but helpful for turning syntactical errors into true errors in the program flow
 https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Strict_mode
*/

/*
 Modules make it possible to import JavaScript files into your application.  Modules are imported
 using 'require' statements that give you a reference to the module.

  It is a good idea to list the modules that your application depends on in the package.json in the project root
 */
var util = require('util');

/*
 Once you 'require' a module you can reference the things that it exports.  These are defined in module.exports.

 For a controller in a127 (which this is) you should export the functions referenced in your Swagger document by name.

 Either:
  - The HTTP Verb of the corresponding operation (get, put, post, delete, etc)
  - Or the operationId associated with the operation in your Swagger document

  In the starter/skeleton project the 'get' operation on the '/hello' path has an operationId named 'hello'.  Here,
  we specify that in the exports of this module that 'hello' maps to the function named 'hello'
 */
module.exports = {
  submit_search_data: submit_search_data,
  define_settings:   define_settings
};

/*
  Functions in a127 controllers used for operations should take two parameters:

  Param 1: a handle to the request object
  Param 2: a handle to the response object
 */
function submit_search_data(req, res) {
  // variables defined in the Swagger document can be referenced using req.swagger.params.{parameter_name}
    let json = JSON.parse(req.body);
         let type = json.type;
         if(type === "FeatureCollection") {
             //We have a list of polygons
             let features = json.features;
             features.map((feature) =>  {

             });

         }
}

function update_sql(my_var, var_name, sql) {
    if(sql.length > 0) {
        sql += " AND ";
    }
    sql += my_var + ""
}

function find_existing_settings() {
    try {

            db.get('SELECT * FROM settings');


    } catch (err) {
        next(err);
    }
}

function  insert_into_sql() {
    let settings = JSON.parse(req.body);
    let sql = "insert into settings (";
    let key_list = "id, "; //Always insert into id
    let val_list = "1, ";
    Object.keys(settings).map(function(key, index) {
        //settings[key]
        key_list += key + ",";
        val_list += settings[key];
    });
    key_list = key_list.substr(0, key_list.length -2);
    val_list = key_list.substr(0, key_list.length -2);
    sql += key_list + ") values (" + val_list + ");"
    console.log(sql);
    //db.run(sql);

}

function  define_settings(req, res) {



    try {


        db.get('SELECT * FROM settings;').then((res) => {
            if(typeof (res) === "undefined") {
                //Nothing in there yet so lets insert
                insert_into_sql(req);
            } else {
                //Need to update
            }
        }).catch(err => console.error(err.stack));


        //res.render('post', { post, categories });
    } catch (err) {
        console.log(err);
        //next(err);
    }
    /*  Promise.resolve()
          .then(());
    db.get('SELECT * FROM Category');*/
    /*let settings = JSON.parse(req.body);
    //We can have start_point, end_point and total_flight_time
    //Lets see if there are already some settings
    let search_sql  = "select  * from settings";


    let update_sql = '';
    if(settings.hasOwnProperty('start_point')) {
        update_sql += "start_point=" + settings.start_point;
    }
    if(settings.hasOwnProperty('end_point')) {

        update_sql += "start_point=" + settings.end_point;
    }
    if(settings.hasOwnProperty('total_flight_time')) {
        let total_flight_time = settings.total_flight_time;
    }*/
    res.sendStatus(200);
}
