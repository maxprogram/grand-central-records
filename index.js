// Custom ORM that connects with MySQL, Postgres, SQLite3, MongoDB

var _    = require('lodash'),
    _str = require('underscore.string'),
    path = require('path'),
    log = require('./log'),
    model = require('./lib/model');


///////////////////////////////////////


var ORM = function(connection, table, options){
    if (!connection || !connection.adapter)
        return log.error("No connection adapter provided");
    if (typeof table === "object") {
        options = table;
        table = null;
    } else if (!options) options = {};

    var adapter = connection.adapter,
        verbose = options.hasOwnProperty("verbose") ? options.verbose : false;

    if (typeof options.logger === 'function') log.logger = options.logger;

    // Load database adapters

    if (connection.engine){
        this.adapter = adapter;
        this.engine = connection.engine;
    } else {
        if (_.contains(['postgres','pg','postgresql'], adapter)) {
            this.adapter = "pg";
            var Postgres = require('./adapters/pg');
            this.engine = new Postgres(connection);
            this.end = this.engine.end;

        } else if (_.contains(['mysql','mySQL','MySQL'], adapter)) {
            this.adapter = "mysql";
            var Mysql = require('./adapters/mysql');
            this.engine = new Mysql(connection);

        } else if (_.contains(['sqlite','sqlite3'], adapter)) {
            this.adapter = "sqlite";
            if (connection.database != ':memory:')
                connection.database = path.join(connection.dir, connection.database);
            var Sqlite = require('./adapters/sqlite');
            this.engine = new Sqlite(connection);

        } else if (adapter == 'test') {
            this.adapter = "test";
            this.engine = function(){};

        } else {
            return log.error("Database adapter '"+adapter+"' not recognized");
        }
    }

    this._options = options;
    this.verbose = verbose;
    this.table = table;

    if (options.modelOptions) {
        this._model = options.modelOptions;
        this._schema = options.modelOptions.schema;
    }

    this.idField = options.idAttribute || "id";
    this.values = null;

    this._rebuild();
    connection = options = null;
};

var fn = ORM.prototype;

require('./lib/query')(fn);
require('./lib/chain')(fn);
model.setModelFunctions(fn);

module.exports = ORM;

///////////////////////////////////////

fn.model = function(table, options) {
    var _this = this,
        opts = _.extend(_.clone(this._options), options);

    if (options) {
        options._table = table;
        options._idField = opts.idAttribute || this.idField;
    }
    opts.modelOptions = options;

    return new ORM({
        adapter: _this.adapter,
        engine: _this.engine
    }, table, opts);
};

fn.new = function(data) {
    return new model.Model(data, this._model);
};

fn.setTable = function(table) {
    this.table = table;
    return this;
};

fn.setIdAttribute = function(id) {
    this.idField = id;
    return this;
};

///////////////////////////////////////

fn._rebuild = function() {
    this.q = {
        action: "SELECT *",
        from: "FROM " + this.table,
        where: "",
        others: {
            orderBy: "",
            limit: "",
            offset: "",
            returning: ""
        }
    };
};

fn.toString = function() {
    var other = "" +
        this.q.others.orderBy +
        this.q.others.limit +
        this.q.others.offset +
        this.q.others.returning;

    var query = _str.clean(this.q.action + " " +
       this.q.from + " " +
       this.q.where + " " +
       other);

    this._rebuild();

    return query;
};

fn._query = function(callback) {
    var modelOps = this._model,
        query = this.toString(),
        values = this.values;

    var newCallback = function(err,res,fields){
        if (err) log.error(err, false);
        else {
            if (modelOps && modelOps.map) {
                var data = Array.isArray(res) ? res : modelOps.data || [];
                modelOps._query = query;
                callback(null, model.map(data, modelOps));
            } else {
                callback(null, res);
            }
        }
    };

    if (!this.table) {
        callback(log.error("Model doesn't exist! (No table provided)"));
    } else if (this.table == ':test:') {
        newCallback(null, query);
    } else {
        this.query(query, values, newCallback);
    }
};
