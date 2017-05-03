'use strict';
var mongoose   = require('mongoose')
    , ObjectId   = mongoose.Schema.Types.ObjectId;

var schema = mongoose.Schema({
    username: {type: String, lowercase: true},
    firstname: String,
    lastname: String,
    email: {type: String, lowercase: true},

});