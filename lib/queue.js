var _ = require('lodash');
var Q = require('q');

module.exports = function(fn) {

/////////////////////////////
// Query queue
// var queue = db.queue();
// queue.add('...');

var Queue = function(_this, query) {
    this._queue = [];
    this.db = _this;
    if (query) this.add(query);
    return this;
};

fn.queue = function(query) {
    return new Queue(this, query);
};

Queue.prototype.add = function(query, values) {
    if (!query) return this;

    // Array
    if (Array.isArray(query)) {
        for (var i=0; i < query.length; i++) this.add(query[i]);

    // Query chain
    } else if (typeof query.q === 'object') {
        var q = this.db._replace(query.toString(), values);
        query._rebuild();
        this._queue.push(q);

    // Another queue
    } else if (Array.isArray(query._queue) && query.print) {
        this._queue.push(query.print(' '));

    // Query string
    } else if (typeof query === 'string') {
        query = query.trim();
        query = this.db._replace(query, values);
        this._queue.push(query);
    }
    return this;
};

Queue.prototype.print = function(sep) {
    sep = sep || '\n';
    var query = this._queue.join(';' + sep);
    if (query.slice(-1) != ';') query += ';';
    return query;
};

Queue.prototype.get = Queue.prototype.print;
Queue.prototype.toString = Queue.prototype.print;

Queue.prototype._map = function(row) {
    return row;
};

Queue.prototype.map = function(iterator) {
    if (_.isFunction(iterator)) this._map = iterator;
    return this;
};

// Starts a promise chain
Queue.prototype.then = function(callback) {
    var q = (this.db.adapter != 'sqlite') ? this.get(' ') : '';
    var map = this._map;
    var d = Q.defer();

    if (this._err) return Q.reject(this._err);
    this.db.query(q, function(err, res) {
        if (err) return d.reject(err);
        res = res.map(map);
        if (!_.isFunction(callback)) return d.resolve(res);
        return d.resolve(callback(res));
    });

    return d.promise;
};

// Runs callback or returns a promise
Queue.prototype.run = function(callback) {
    var q = (this.db.adapter != 'sqlite') ? this.get(' ') : '';
    var map = this._map;

    if (_.isFunction(callback)) {
        if (!this._queue || !this._queue.length) this.db._query(callback);
        else {
            if (this._err) callback(this._err);
            else this.db.query(q, function(err, res) {
                if (err) return callback(err);
                return callback(null, res.map(map));
            });
        }
    } else {
        return this.then.apply(this);
    }
};
Queue.prototype.execute = Queue.prototype.run;

Queue.prototype._err = null;

// Call this elsewhere to reject promise chain
Queue.prototype.reject = function(err) {
    this._err = err;
    return this;
};
Queue.prototype.throw = Queue.prototype.reject;

// Runs a callback if it exists
Queue.prototype.nodeify = function(callback) {
    if (_.isFunction(callback)) this.run(callback);
    return this;
};

};
