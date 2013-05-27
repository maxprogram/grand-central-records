var sqlite3 = require('sqlite3'),
    Step = require('step'),
    log = require('../log').database,
    _ = require('underscore'),
    _str = require('underscore.string');

var _options;

function Sqlite(connect){
    _options = {
        host: connect.host,
        user: connect.username,
        password: connect.password,
        database: connect.database
    };
    this.q = "";
}

var fn = Sqlite.prototype;

module.exports = Sqlite;

fn.query = function (sql,values,cb) {

    var logging = function(){};

    if (sql.verbose){
        sql = sql.sql;
        logging = function(str, type, time){
            return log(str, type, time);
        };
    }

    var t1 = new Date().getTime();

    var db = new sqlite3.Database(_options.database);

    Step(function(){
        db.serialize(this);
    }, function(){

        // query([sql,sql], cb)
        if (Array.isArray(sql) && typeof values === 'function') {
            var group = this.group();
            cb = values;
            logging("Executing series...");
            sql.forEach(function(q) {
                db.all(q, group());
            });
        }

        // query(sql, cb)
        else if (typeof values === 'function') {
            cb = values;
            db.all(sql, this);
        }

        // query(sql, [values], cb)
        else {
            values.forEach(function(v,i) {
                sql = sql.replace(new RegExp("%"+i,"g"), v);
            });
            db.all(sql, this);
        }

    }, function(err, rows){
        // Get insert row ID
        var _this = this;
        if (!Array.isArray(sql) && !err && _.contains(sql.split(" "), "INSERT")) {
            db.get("SELECT last_insert_rowid() AS id", function(err,row){
                _this(err, row.id);
            });
        } else this(err, rows);

    }, function(err, rows){
        db.close();

        var t2 = new Date().getTime();
        if (Array.isArray(sql)) {
            sql.forEach(function(q,n) {
                logging(q, "SQLite3 Query ("+n+")", t2-t1);
            });
        } else {
            logging(sql, "SQLite3 Query", t2-t1);
        }

        cb(err, rows);
    });

};

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
