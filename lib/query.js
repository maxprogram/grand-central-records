module.exports = function(fn) {

fn.query = function(query, values, callback) {
    if (typeof values === 'function') {
        callback = values;
        values = null;
    } else if (typeof values === 'object') {
        // Replace if Postgres or if query has no SQL replacers
        if (this.adapter == 'pg' || !/\:(\w+)/.test(query)) {
            query = this._replace(query, values);
            values = null;
        }
    } else values = null;

    query = this.verbose ? {sql: query, verbose: true} : query;

    if (!values) return this.engine.query(query, callback);
    else return this.engine.query(query, callback);
};

fn._replace = function(query, values) {
    if (!values) return query;
    if (typeof query !== 'string') return query;

    // Replace '%1 %2 %3' with [0, 1, 2]
    if (Array.isArray(values)) {
        values.forEach(function(v,i){
            i++;
            v = this.engine.escape(v);
            query = query.replace(new RegExp("%"+i,"g"),v);
        }.bind(this));

    // Replace ':a :b :c' with {a: '', b: 2, c: true}
    } else if (typeof values === 'object') {
        query = query.replace(/\:(\w+)/g, function (txt, key) {
            if (values.hasOwnProperty(key)) {
                return this.engine.escape(values[key]);
            }
            return txt;
        }.bind(this));
    }
    return query;
};

fn.execute = fn._query;
fn.run = fn.execute;

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
    if (Array.isArray(query)) {
        for (var i=0; i < query.length; i++) this.add(query[i]);
    } else if (typeof query.q === 'object') {
        var q = this.db._replace(query.toString(), values);
        query._rebuild();
        this._queue.push(q);
    } else if (typeof query === 'string') {
        query = query.trim();
        query = this.db._replace(query, values);
        this._queue.push(query);
    }
    return this;
};

Queue.prototype.print = function(sep) {
    var sep = sep || '\n';
    var query = this._queue.join(';' + sep);
    if (query.slice(-1) != ';') query += ';';
    return query;
};

Queue.prototype.get = Queue.prototype.print;

Queue.prototype.execute = function(callback){
    var q = '';
    if (!this._queue || !this._queue.length) this.db._query(callback);
    else {
        if (this.db.adapter != 'sqlite') q = this.get(' ');
        this.db.query(q, callback);
    }
};

Queue.prototype.run = Queue.prototype.execute;

};
