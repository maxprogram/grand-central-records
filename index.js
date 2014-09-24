// Custom ORM that connects with MySQL, Postgres, SQLite3

var _    = require('lodash'),
    _str = require('underscore.string'),
    path = require('path'),
    log = require('./lib/log'),
    model = require('./lib/model');


///////////////////////////////////////


var ORM = function(connection, table, options) {
    options = options || {};
    if (!connection || !connection.adapter)
        return log.error("No connection adapter provided");
    if (typeof table === "object") {
        options = table;
        table = null;
    }

    var verbose = options.hasOwnProperty("verbose") ? options.verbose : false;
    if (_.isFunction(verbose)) log.logger = verbose;
    connection.verbose = verbose;

    // Load database adapters

    var adapter = connection.adapter;

    if (connection.engine) {
        this.adapter = adapter;
        this.engine = connection.engine;
        this.engine.verbose = verbose;
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
                connection.database = path.join(connection.dir || '', connection.database);
            var Sqlite = require('./adapters/sqlite');
            this.engine = new Sqlite(connection);
            this.end = this.engine.close;

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
    model.setModelFunctions(fn);

    this._rebuild();
    connection = options = null;
};

var fn = ORM.prototype;

_.extend(fn, require('./lib/query'));
_.extend(fn, require('./lib/queue'));
_.extend(fn, require('./lib/promise'));
_.extend(fn, require('./lib/chain'));

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
    return new model.Model(data, this._model, this);
};

fn.setTable = function(table) {
    this.table = table;
    return this;
};

fn.setIdAttribute = function(id) {
    this.idField = id;
    return this;
};

fn.sync = function(data, callback) {
    if (!this.engine.sync) return new Error("Sync doesn't exist for this adapter");
    this.engine.sync(this.table, data, callback);
};

///////////////////////////////////////

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
        }
    };
};

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

    this._rebuild();

    return query;
};
fn.toQuery = fn.toString;

///////////////////////////////////////

fn.addQueryMethod = function(name, func, map) {
    this[name] = function() {
        var query = func.apply(this, arguments);

        if (query instanceof Error) {
            return log.error(query);
        } else if (_.isPlainObject(query.q)) {
            query = query.toString();
        } else if (_.isArray(query._queue) && query.print) {
            query = query.print(' ');
        }

        return this.query(query).then(function(res) {
            if (!res) return null;
            return res.map(map);
        });
    };
};

module.exports = ORM;
