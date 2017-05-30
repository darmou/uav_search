'use strict';
var Promise = require("bluebird");
var db = require("sqlite");
var polygonToGrid = require('../../polygonToGrid');


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
  // variables defined in
    // the Swagger document can be referenced using req.swagger.params.{parameter_name}

    let json = req.body;

         let type = json.type;

         if(type === "FeatureCollection") {
             //We have a list of polygons
             let features = json.features;

             features.map((feature) =>  {
                 console.log("Feature");
                 console.log(feature.geometry.coordinates[0]);
                 polygonToGrid.processPolygon(feature.geometry.coordinates[0]);
             });

         }

    res.sendStatus(200);
}

function wrap_value(value) {
    return (isNaN(value)) ?  "'" + value + "'" : value;
}

function update_sql(settings) {
    let sql = "update settings set ";
    Object.keys(settings).map((key, index) => {
        sql += key + "=" +  wrap_value(settings[key]) + ",";
    });
    sql = sql.substr(0,sql.length-1) + " where id=1";
    return sql;
}

function find_existing_settings() {
    try {
            db.get('SELECT * FROM settings').then((res) => {
                if(typeof (res) === "undefined") {
                    return null;
                } else {
                    return res;
                }
            });

    } catch (err) {
        next(err);
    }
}

function  insert_into_sql(settings) {
    let sql = "insert into settings (";
    let key_list = "id, "; //Always insert into id
    let val_list = "1, ";
    Object.keys(settings).map((key, index) => {
        key_list += key + ", ";
        val_list += wrap_value(settings[key]) + ", ";
    });
    key_list = key_list.substr(0, key_list.length -2);
    val_list = val_list.substr(0, val_list.length -2);
    sql += key_list + ") values (" + val_list + ");";

    return sql;

}

function  define_settings(req, res) {


    let settings = req.body;

    try {

        db.get('SELECT * FROM settings;').then((res) => {
            let sql ="";
            if(typeof (res) === "undefined") {
                //Nothing in there yet so lets insert
               sql =  insert_into_sql(settings);
            } else {
                //Need to update
                console.log(res);
                sql = update_sql(settings);
            }
            console.log(sql);
            db.run(sql);
        }).catch(err => console.error(err.stack));


        //res.render('post', { post, categories });
    } catch (err) {
        console.log(err);
        //next(err);
    }


    res.sendStatus(200);
}
