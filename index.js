var _ = require('lodash'),
    Q = require('q'),
    _str = require('underscore.string'),
    path = require('path'),
    Log = require('./lib/log'),
    model = require('./lib/model');


/** Grand Central Records
 ************************
 ** Creates GCR object that connects to database
 * @param {object} connection  Connection parameters
 * @param {string} [table]     Table name
 * @param {object} [options]   Options
 */
var GCR = function(connection, table, options) {
    options = options || {};
    if (typeof table === "object") {
        options = table;
        table = null;
    }

    var verbose = options.hasOwnProperty("verbose") ? options.verbose : false;
    connection.verbose = verbose;

    // Define logging function
    // Can be in options.logger or options.verbose
    var logger = options.logger;
    if (_.isFunction(verbose)) logger = verbose;
    var log = this.log = new Log(logger);

    if (!connection || !connection.adapter)
        return log.error("No connection adapter provided");
    var adapter = connection.adapter;

    // DB engine already exists, so update options
    if (connection.engine) {
        this.adapter = adapter;
        this.engine = connection.engine;
        this.engine.verbose = verbose;

    // Create new DB engine
    } else {
        if (_.contains(['postgres','pg','postgresql'], adapter)) {
            this.adapter = "pg";
            var Postgres = require('./adapters/pg');
            this.engine = new Postgres(connection, log.database.bind(log));
            this.end = this.engine.end;

        } else if (_.contains(['mysql','mySQL','MySQL'], adapter)) {
            this.adapter = "mysql";
            var Mysql = require('./adapters/mysql');
            this.engine = new Mysql(connection, log.database.bind(log));

        } else if (_.contains(['sqlite','sqlite3'], adapter)) {
            this.adapter = "sqlite";
            if (connection.database != ':memory:')
                connection.database = path.join(connection.dir || '', connection.database);
            var Sqlite = require('./adapters/sqlite');
            this.engine = new Sqlite(connection, log.database.bind(log));
            this.end = this.engine.close;

        } else if (adapter == 'test') {
            this.adapter = "test";
            this.engine = new function(){
                this.verbose = verbose;
                this.log = log.database.bind(log);
            }();

        } else {
            return log.error("Database adapter '"+adapter+"' not recognized");
        }
    }

    // Set GCR options
    this._options = options;
    this.table = table;
    this.idField = options.idAttribute || "id";
    delete this.values;

    if (options.modelOptions) {
        this._model = options.modelOptions;
        this._schema = options.modelOptions.schema;
        model.setModelFunctions(this);
    }

    this._rebuild();
    connection = options = null;
};

var fn = GCR.prototype;

_.extend(fn, require('./lib/query'));
_.extend(fn, require('./lib/queue'));
_.extend(fn, require('./lib/promise'));
_.extend(fn, require('./lib/chain'));


/** Creates new GCR object on same database
 ** with new table (model) and options
 * @param {string} table     Table name
 * @param {object} [options] New options to pass to GCR
 * @returns {GCR}  New GCR object on specified table
 */
fn.model = function(table, options) {
    var _this = this,
        opts = _.extend(_.clone(this._options), options);

    if (options) {
        options._table = table;
        options._idField = opts.idAttribute || this.idField;
    }
    opts.modelOptions = options;

    return new GCR({
        adapter: _this.adapter,
        engine: _this.engine
    }, table, opts);
};

// Creates new entry with current model schema
fn.new = function(data) {
    return new model.Model(data, this._model, this);
};

// Chain utility to change table name
fn.setTable = function(table) {
    this.table = table;
    return this;
};

// Chain utility to change ID field
fn.setIdAttribute = function(id) {
    this.idField = id;
    return this;
};

// Syncronizes databases with model
fn.sync = function(data, callback) {
    if (!this.engine.sync) return this.log.error("Sync doesn't exist for this adapter");
    this.engine.sync(this.table, data, callback);
};

///////////////////////////////////////

// Rebuilds query to original blank slate
fn._rebuild = function() {
    this.q = {
        action: "SELECT *",
        from: "FROM",
        table: "%t%",
        where: "",
        others: {
            orderBy: "",
            limit: "",
            offset: "",
            returning: ""
        },
        unions: []
    };
};

// Turns query chain into string, then rebuilds for next time
fn.toString = function() {
    if (!this.q) return '';

    var other = " " +
        this.q.others.orderBy + " " +
        this.q.others.limit + " " +
        this.q.others.offset + " " +
        this.q.others.returning;

    var query = _str.clean([
        this.q.action,
        this.q.from,
        this.q.table,
        this.q.where,
        other
    ].join(' ')).replace(/%t%/g, this.table);

    if (this.q.unions.length) {
        query += ' ' + this.q.unions.join(' ');
    }

    this._rebuild();

    return query;
};
fn.toQuery = fn.toString;

/** Utility to add method to query chain
 * @param {string}   name  Method name
 * @param {function} func  Function that returns SQL query,
 *                         chain object, or queue object
 * @param {function} [map] Result mapping iterator
 */
fn.addQueryMethod = function(name, func, map) {
    var currentKeys = _.keys(this);
    if (_.contains(currentKeys, name))
        return this.log.error('Query method "'+name+'" reserved');

    this[name] = function() {
        var query = func.apply(this, arguments);

        if (query instanceof Error) {
            return Q.reject(query);
        } else if (_.isPlainObject(query.q)) {
            var db = query;
            var _model = db._model;
            map = map || function(d) {
                return new model.Model(d, _model, db);
            };
            query = query.toString();
        } else if (_.isArray(query._queue) && query.print) {
            query = query.print(' ');
        }

        return this.query(query).then(function(res) {
            if (!res) return null;
            if (_.isFunction(map) && _.isArray(res)) return res.map(map);
            return res;
        });
    };
};

module.exports = GCR;
