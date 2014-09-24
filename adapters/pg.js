var _ = require('lodash');
var Q = require('q');
var pg = require('pg');
var log = require('../lib/log').database;
var _str = require('underscore.string');

var _options = {};
var endConnectionAfter = 4000;


var Postgres = module.exports = function(connect) {
    _options = {
        host: connect.host || 'localhost',
        user: connect.username || 'postgres',
        password: connect.password,
        database: connect.database
    };

    _.bindAll(this);

    this.verbose = connect.verbose;
    this.q = "";
    this._inProgress = {};
};

var fn = Postgres.prototype;

// Timer that ends DB connection after X seconds
fn._resetTime = function() {
    if (this._timer) clearTimeout(this._timer);
    this._timer = setTimeout(function() {
        if (this.client && !Object.keys(this._inProgress).length) {
            this.client.end();
            this.client = null;
            this._inProgress = {};
        }
        if (Object.keys(this._inProgress).length) this._resetTime();
    }.bind(this), endConnectionAfter);
};

// Ends the DB connection
fn.end = function() {
    if (this.client) this.client.end();
    if (this._timer) clearTimeout(this._timer);
    this.client = null;
};

// Initialize PG connection
fn.init = function() {
    if (this.client) {
        this._resetTime();
        return Q(this.client.query);
    }
    this.client = new pg.Client(_options);
    this.client.connect = Q.denodeify(this.client.connect.bind(this.client));
    this.client.query = Q.denodeify(this.client.query.bind(this.client));

    return this.client.connect().then(function() {
        this._resetTime();
    }.bind(this));
};

// Traditional SQL query
fn.query = function(sql, values) {
    var _this = this;
    var _log = this.verbose ? log : function(){};

    var t1 = new Date().getTime();
    this._inProgress[t1] = sql;

    return this.init()
    // Run queries
    .then(function() {
        if (_.isArray(sql)) {
            return Q.all(sql.map(function(q) {
                return (q.trim() !== "") ? _this.client.query(q) : null;
            }));
        }
        return _this.client.query(sql, values);
    })
    // Clean up results
    .then(function(results) {
        delete _this._inProgress[t1];

        if (_this.verbose) {
            var t2 = new Date().getTime();
            if (_.isArray(sql)) sql.forEach(function(q, n) {
                _log(q, "PG Query ("+n+")", t2-t1);
            });
            else _log(sql, "Postgres Query", t2-t1);
        }

        // Checks if there are multiple results, normalizes
        if (_.isArray(results) && results.length == 1) {
            results = results[0].rows;
        } else if (_.isArray(results)) {
            results = results.map(function(res) {
                return res.rows;
            });
        } else if (!results) {
            results = null;
        } else {
            results = results.rows;
        }

        return results;
    })
    .catch(function(err) {
        delete _this._inProgress[t1];
        err += ' (query: "' + sql + '")';
        return Q.reject(new Error(err));
    });
};

// Escapes value for PG query
fn.escape = function(d) {
    var _this = this;

    if (d === undefined || d === null) return "NULL";

    if (typeof d === "boolean") return (d) ? 'true' : 'false';

    if (typeof d === "number") return d+'';

    if (d instanceof Date) {
        var dt = new Date(d);
        var tz = 0;

        dt.setTime(dt.getTime() + (dt.getTimezoneOffset() * 60000));
        if (tz !== false) {
            dt.setTime(dt.getTime() + (tz * 60000));
        }

        var year   = dt.getFullYear();
        var month  = _str.pad(dt.getMonth() + 1, 2, '0');
        var day    = _str.pad(dt.getDate(), 2, '0');
        var hour   = _str.pad(dt.getHours(), 2, '0');
        var minute = _str.pad(dt.getMinutes(), 2, '0');
        var second = _str.pad(dt.getSeconds(), 2, '0');

        return "'" + year + '-' + month + '-' + day + ' ' + hour + ':' + minute + ':' + second + "'";
    }

    if (typeof d === "string") {
        d = d.replace(/[\0\n\r\b\t\\\'\"\x1a]/g, function(s) {
            switch(s) {
              case "\0": return "\\0";
              case "\n": return "\\n";
              case "\r": return "\\r";
              case "\b": return "\\b";
              case "\t": return "\\t";
              case "\x1a": return "\\Z";
              default: return "\\"+s;
            }
        });
        if (d === '') return 'NULL';
        else return "'"+d+"'";
    }

    // 2 nested arrays nullifies escape
    if (Array.isArray(d[0])) return d[0][0];

    // Array
    if (Array.isArray(d)) {
        return "'{" + d.map(function(a) {
            return _this.escape(a).replace(/'/g,'"');
        }).join(",") + "}'";
    }

    // Subquery
    if (d.q && typeof d.q === 'object') {
        return "(" + d.toString() + ")";
    }

    // Object/hstore
    if (typeof d === "object") {
        var keys = Object.keys(d),
            hstore = [], value;
        if (keys[0] == 'noEscape') return d[keys[0]];
        keys.forEach(function(key) {
            value = _this.escape(d[key]);
            value = value.replace(/'/g, "\"");
            hstore.push(key + ' => ' + value);
        });
        return "'"+hstore.join(", ")+"'";
    }

};

fn.newTable = function(name,columns,callback){

    // USAGE: #newTable(name string, {column: datatype, ..})

    var keys = Object.keys(columns), cols = [];

    name = escape(name);
    keys.forEach(function(col){
        var def = _this._buildColumn(col, columns[col]);
        cols.push(def);
    });
    var query = "CREATE TABLE "+name+" ("+cols.join(",")+")";
    this.query(query,callback);
};

function escape(str) {
    return str.toLowerCase()
        .replace(/[\0\n\s\r\b\t\\\'\"\.\!]/g, "");
}

// Builds SQL text for column creation

fn._buildColumn = function(name, type, required, defaultValue) {
    var def;
    required = required || false;
    defaultValue = defaultValue || null;

    var restrictions = [
        "order", "end", "if", "insert", "select",
        "update", "offset", "limit", "where"
    ];
    if (_.contains(restrictions, name))
        throw new Error('PG: Using restricted column name "'+name+'"');

    switch (type) {
        case "text":
            def = escape(name) + " VARCHAR(255)";
            break;
        case "number":
            def = escape(name) + " INTEGER";
            break;
        case "boolean":
            def = escape(name) + " BOOLEAN";
            break;
        case "date":
            def = escape(name) + " DATE";
            break;
        case "datetime":
            def = escape(name) + " TIMESTAMP WITHOUT TIME ZONE";
            break;
        case "binary":
        case "object":
            def = escape(name) + " BYTEA";
            break;
        default:
            def = escape(name) + " " + type.toUpperCase();
    }

    if (required) def += " NOT NULL";
    if (defaultValue) def += " DEFAULT "+this.escape(defaultValue);

    return def;
};

// fn.addColumn
// fn.dropColumn
