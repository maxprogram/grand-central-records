var mysql = require('mysql'),
    log = require('../lib/log').database,
    _ = require('lodash'),
    Q = require('q');

var _options;

var Mysql = module.exports = function Mysql(connect) {
    _options = {
        host: connect.host,
        user: connect.username,
        password: connect.password,
        database: connect.database
    };
    this.verbose = connect.verbose;
    this.q = "";
};

var fn = Mysql.prototype;

fn.query = function (sql, values) {
    var _this = this;
    var _log = this.verbose ? log : function(){};

    var t1 = new Date().getTime();

    var connect = mysql.createConnection(_options);
    var query = Q.denodeify(connect.query.bind(connect));
    var options = {};

    if (typeof sql === 'object') {
        // query(options)
        options = sql;
        values  = options.values;
        delete options.values;
    } else if (typeof values === 'function') {
        // query(sql)
        options.sql = sql;
    } else {
        // query(sql, values)
        options.sql = sql;
        options.values = values;
    }

    options.sql = connect.format(options.sql, values || []);

    return query(options).then(function(rows) {
        if (_.contains(options.sql.split(" "), "INSERT")) rows = rows.insertId;
        connect.end();
        var t2 = new Date().getTime();
        _log(options.sql, 'MySQL Query', t2 - t1);

        return rows;
    })
    .catch(function(err) {
        err += ' (query: "' + sql + '")';
        return Q.reject(new Error(err));
    });
};

fn.escape = function(d){
    return mysql.escape(d);
};

// fn.newTable
// fn.addColumn
// fn.dropColumn
