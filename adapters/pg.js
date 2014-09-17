var pg = require('pg'),
    log = require('../log').database,
    _ = require('lodash'),
    _str = require('underscore.string');

var _options;

function Postgres(connect){
    _options = {
        host: connect.host || 'localhost',
        user: connect.username || 'postgres',
        password: connect.password,
        database: connect.database
    };

    _.bindAll(this);

    this.q = "";
    this._inProgress = {};
}

var fn = Postgres.prototype;

module.exports = Postgres;

fn.init = function(cb) {
    if (this.client) {
        this._resetTime();
        return cb();
    }
    this.client = new pg.Client(_options);
    this.client.connect(cb);
    this._resetTime();
}

fn._resetTime = function() {
    if (this._timer) clearTimeout(this._timer);
    this._timer = setTimeout(function() {
        if (this.client && !Object.keys(this._inProgress).length) {
            this.client.end();
            this.client = null;
            this._inProgress = {};
        }
        if (Object.keys(this._inProgress).length) this._resetTime();
    }.bind(this), 4000);
};

fn.end = function() {
    if (this.client) this.client.end();
    if (this._timer) clearTimeout(this._timer);
    this.client = null;
};

fn.query = function(sql, values, cb) {
    var self = this, verbose = false;

    if (typeof values === 'function') {
        cb = values;
        values = null;
    }

    var logging = function(){};
    if (typeof sql === 'object'){
        verbose = sql.verbose;
        sql = sql.sql;
        logging = function(str, type, time){
            return log(str, type, time);
        };
    }

    var t1 = new Date().getTime();
    this._inProgress[t1] = sql;

    var runQueries = function (err) {
        if (err) return cb(err);

        if (typeof sql === 'object' && sql.text) {
        // query({options}, cb)
            cb = values;
            logging("Executing object...");
            this.client.query(sql, finish);

        } else if (typeof values === 'function' && typeof sql === 'string') {
        // query(sql, cb)
            cb = values;
            this.client.query(sql, finish);

        } else if (typeof sql === 'object') {
        // query([sql, sql], cb)
            cb = values;
            logging("Executing queries...");
            async.each(sql, function(q, next) {
                if (q.trim() !== "") this.client.query(q, next);
                else next();
            });
        }
        // query(sql, values, cb)
        else this.client.query(sql, values, finish);

    }.bind(this);

    this.init(runQueries);

    function finish(err, results) {
        delete self._inProgress[t1];
        if (err) return cb(err + '(query: ' + sql + ')');

        if (verbose) {
            var t2 = new Date().getTime();
            if (Array.isArray(sql)) {
                sql.forEach(function(q,n) {
                    logging(q, "PG Query ("+n+")", t2-t1);
                });
            } else logging(sql, "Postgres Query", t2-t1);
        }

        // Checks if there are multiple results, normalizes
        if (Array.isArray(results) && results.length==1) {
            results = results[0].rows;
        } else if (Array.isArray(results)) {
            results = results.map(function(res) {
                return res.rows;
            });
        } else if (!results) {
            results = null;
        } else {
            results = results.rows;
        }

        cb(err, results);
    };

};

fn.escape = function(d){
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

/*
fn.getColumns = function(callback){
    var pg = module.exports;
    pg.query(["SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='%1'",this.table], function(err,res){
        if (err) callback(err);
        else {
            var cols = [];
            res.rows.forEach(function(col){ cols.push(col.column_name); });
            callback(null,cols);
        }
    });
};
*/
