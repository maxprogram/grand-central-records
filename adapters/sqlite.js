var sqlite3 = require('sqlite3');
var Q = require('q');
var _ = require('lodash');
var _str = require('underscore.string');

var _options = {};
var endConnectionAfter = 4000;


var Sqlite = module.exports = function Sqlite(connect, log) {
    _options = {
        host: connect.host,
        user: connect.username,
        password: connect.password,
        database: connect.database
    };

    _.bindAll(this);

    this.verbose = connect.verbose;
    this.q = "";
    this._inProgress = {};
    this.log = log;
};

var fn = Sqlite.prototype;

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
fn.close = function() {
    if (this.client) this.client.close();
    if (this._timer) clearTimeout(this._timer);
    this.client = null;
};
fn.end = fn.close;

fn.query = function (sql) {
    var _this = this;
    var _log = this.verbose ? this.log : function(){};

    var t1 = new Date().getTime();
    this._inProgress[t1] = sql;

    var client = this.client || new sqlite3.Database(_options.database);
    var serialize = Q.denodeify(client.serialize.bind(client));
    var query = Q.denodeify(client.all.bind(client));

    return serialize().then(function() {
        // query([sql,sql])
        if (Array.isArray(sql)) {
            return promiseSeries(sql.map(function(q) {
                return (q.trim() !== "") ? q : null;
            }), query);
        }
        return query(sql);
    })
    // Get insert row ID
    .then(function(rows) {
        if (!Array.isArray(sql) && _.contains(sql.split(" "), "INSERT")) {
            return query("SELECT last_insert_rowid() AS id").then(function(rows) {
                return rows[0].id;
            });
        }
        return rows;
    })
    // Close up
    .then(function(rows) {
        delete _this._inProgress[t1];
        var t2 = new Date().getTime();
        if (Array.isArray(sql)) {
            sql.forEach(function(q, n) {
                _log(q, "SQLite3 Query ("+n+")", t2-t1);
            });
        } else {
            _log(sql, "SQLite3 Query", t2-t1);
        }

        return rows;
    })
    .catch(function(err) {
        delete _this._inProgress[t1];
        if (err instanceof Error)
            err.message += ' (query: "' + sql + '")';
        return Q.reject(err);
    });
};

// Runs promise in series over an array
function promiseSeries(array, promise) {
    var newArray = [];
    return array.reduce(function(newPromise, value) {
        return newPromise.then(function() {
            return promise(value);
        }).then(function(newValue) {
            newArray.push(newValue);
            return newArray;
        });
    }, Q());
}

fn.escape = function(d) {
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
        return "'"+d+"'";
    }

    //if (Array.isArray(d)) return "'{"+d.join(",")+"}'";

    if (typeof d === "object") {
        return "'"+JSON.stringify(d)+"'";
    }

};

fn.newTable = function(name, columns, callback) {

    // USAGE: #newTable(name string, {column: datatype, ..})

    var keys = Object.keys(columns), cols = [];

    name = escape(name);

    cols.push("id INTEGER PRIMARY KEY AUTOINCREMENT");
    keys.forEach(function(col){
        var def = _this._buildColumns(col, columns[col]);
        cols.push(columns[col]);
    });
    var query = "CREATE TABLE "+name+" ("+cols.join(",")+")";
    this.query(query,callback);
};

// Creates new table if it doesn't exist

fn.sync = function(name, columns, callback) {
    var keys = Object.keys(columns),
        cols = [], queries = [], _this = this;

    name = escape(name);

    cols.push("id INTEGER PRIMARY KEY AUTOINCREMENT");
    keys.forEach(function(col){
        var def = _this._buildColumn(col, columns[col]);
        cols.push(def);
    });
    cols.push("created_at DATETIME");
    cols.push("updated_at DATETIME");

    queries.push("CREATE TABLE IF NOT EXISTS "+name+" ("+cols.join(", ")+")");

    this.query({sql: queries, verbose: true}, callback);
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
        throw new Error('SQLite3: Using restricted column name "'+name+'"');

    switch (type) {
        case "text":
            def = escape(name) + " TEXT";
            break;
        case "number":
            def = escape(name) + " INTEGER";
            break;
        case "boolean":
            def = escape(name) + " INTEGER UNSIGNED";
            break;
        case "date":
            def = escape(name) + " DATETIME";
            break;
        case "binary":
        case "object":
            def = escape(name) + " BLOB";
            break;
        case "enum":
            def = escape(name) + " INTEGER";
            break;
        default:
            throw new Error("Unknown property type: '" + type + "'");
    }

    if (required) def += " NOT NULL";
    if (defaultValue) def += " DEFAULT "+this.escape(defaultValue);

    return def;
};

// fn.addColumn
// fn.dropColumn
