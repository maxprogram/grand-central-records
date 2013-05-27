var pg = require('pg'),
    Step = require('step'),
    log = require('../log').database,
    _ = require('underscore'),
    _str = require('underscore.string');

var _options;

function Postgres(connect){
    _options = {
        host: connect.host,
        user: connect.username,
        password: connect.password,
        database: connect.database
    };
    this.q = "";
}

var fn = Postgres.prototype;

module.exports = Postgres;

fn.query = function (sql,values,cb){

    var client, self = this, verbose = false;

    var logging = function(){};
    if (sql.verbose){
        sql = sql.sql;
        verbose = true;
        logging = function(str, type, time){
            return log(str, type, time);
        };
    }

    var t1 = new Date().getTime();

    Step(function connect(){
        var Client = pg.Client;
        client = new Client(_options);
        client.connect(this);

    }, function runQueries(err,client){
        if (err) throw err;

        if (typeof sql === 'object' && sql.text) {
        // query({options}, cb)
            cb = values;
            logging("Executing object...");
            client.query(sql, this);

        } else if (typeof values === 'function' && typeof sql === 'string') {
        // query(sql, cb)
            cb = values;
            client.query(sql, this);

        } else if (typeof sql === 'object') {
        // query([sql, sql], cb)
            var group = this.group();
            cb = values;
            for (var i=1; i < sql.length; i++)
                sql[0] = sql[0].replace(new RegExp("%"+i,"g"),sql[i]);
            sql = sql[0].split(";");

            logging("Executing series...");
            for (var n in sql){
                if (sql[n] !== "") client.query(sql[n], group());
            }
        }
        // query(sql, values, cb)
        else client.query(sql, values, this);

    }, function finish(err, results){
        client.end();
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
    });

};

fn.queue = function(str,values){
    if (values) values.forEach(function(v,i){
        i++;
        str = str.replace(new RegExp("%"+i,"g"),v);
    });
    this.q += str + ";";
    return this;
};

fn.execute = function(callback){
    this.query([this.q],callback);
    this.q = "";
};

fn.run = function(callback){
    this.query([this.q],callback);
    this.q = "";
};

fn.escape = function(d){
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

    if (Array.isArray(d)) return "'{"+d.join(",")+"}'";

    if (typeof d === "object") {
        var command = Object.keys(d)[0], val = d[command];
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
