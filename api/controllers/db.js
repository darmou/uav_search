

var db = require("sqlite");

function findExistingSettings() {
    try {
        return db.get('SELECT * FROM settings');
    } catch (err) {
       return Promise.reject(err);
    }
}


function wrapValue(value) {
    return (isNaN(value)) ?  "'" + value + "'" : value;
}


function updateSQL(settings) {
    let sql = "update settings set ";
    Object.keys(settings).map((key, index) => {
        sql += key + "=" +  wrapValue(settings[key]) + ",";
    });
    sql = sql.substr(0,sql.length-1) + " where id=1";
    return sql;
}

function dropSettingsSQL() {
    return "delete from settings where id=1";
}

function insertIntoSQL(settings) {
    let sql = "insert into settings (";
    let key_list = "id, "; //Always insert into id
    let val_list = "1, ";
    Object.keys(settings).map((key, index) => {
        key_list += key + ", ";
        val_list += wrapValue(settings[key]) + ", ";
    });
    key_list = key_list.substr(0, key_list.length -2);
    val_list = val_list.substr(0, val_list.length -2);
    sql += key_list + ") values (" + val_list + ");";

    return sql;
}

module.exports = {
    updateSQL: updateSQL,
    insertIntoSQL: insertIntoSQL,
    dropSettingsSQL: dropSettingsSQL,
    findExistingSettings: findExistingSettings,
    lastName: 'Bond'
};