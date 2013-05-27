var mysql = require('mysql'),
    Step = require('step'),
    log = require('../log').database,
    _ = require('underscore');

var _options;

function Mysql(connect){
    _options = {
        host: connect.host,
        user: connect.username,
        password: connect.password,
        database: connect.database
    };
    this.q = "";
}

var fn = Mysql.prototype;

module.exports = Mysql;

fn.query = function (sql,values,cb) {

    var logging = function(){};
    if (sql.verbose){
        sql = sql.sql;
        logging = function(str, type, time){
            return log(str, type, time);
        };
    }

    var t1 = new Date().getTime();

    var connect = mysql.createConnection(_options);
    var options = {};

    if (typeof sql === 'object') {
        // query(options, cb)
        options = sql;
        cb      = values;
        values  = options.values;

        delete options.values;
    } else if (typeof values === 'function') {
        // query(sql, cb)
        cb          = values;
        options.sql = sql;
        values      = undefined;
    } else {
        // query(sql, values, cb)
        options.sql    = sql;
        options.values = values;
    }

    options.sql = connect.format(options.sql, values || []);

    // Runs the query, then the callback, then closes & logs the connection
    connect.query(options, function(err, rows, fields){
        if (_.contains(options.sql.split(" "), "INSERT")) rows = rows.insertId;
        connect.end();
        var t2 = new Date().getTime();
        logging(options.sql, 'MySQL Query', t2 - t1);
        cb(err, rows, fields);
    });
};

fn.escape = function(d){
    return mysql.escape(d);
};

// fn.newTable
// fn.addColumn
// fn.dropColumn
