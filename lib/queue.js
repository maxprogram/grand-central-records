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

// Runs queue, returns promise
Queue.prototype.run = function() {
    var q = (this.db.adapter == 'sqlite') ? this._queue : this.get(' ');
    var map = this._map;

    return this.db.query(q).then(function(res) {
        if (!res) return null;
        return res.map(map);
    });
};
Queue.prototype.execute = Queue.prototype.run;

};
