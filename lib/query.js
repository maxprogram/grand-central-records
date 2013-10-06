module.exports = function(fn) {

fn.query = function(query, values, callback) {
    query = this.verbose ? {sql: query, verbose: true} : query;

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

    if (!values) return this.engine.query(query, callback);
    else return this.engine.query(query, callback);
};

fn._replace = function(query, values) {
    if (!values) return query;

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

fn._queue = [];

fn.queue = function(query, values) {
    if (Array.isArray(query)) {
        for (var i=0; i < query.length; i++) this.queue(query[i]);
    } else if (typeof query.q === 'object') {
        this._queue.push(query._buildQuery());
        query._rebuild();
    } else if (typeof query === 'string') {
        query = this._replace(query, values);
        this._queue.push(query);
    }
    return this;
};

fn.execute = function(callback){
    var q = '';
    if (!this._queue.length) this._query(callback);
    else {
        if (this.adapter != 'sqlite') q = this._queue.join('; ');

        this.query(q, callback);
        this._queue = [];
    }
};

fn.run = fn.execute;

};