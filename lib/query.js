var _ = require('lodash');
var log = require('../log');
var model = require('./model');

module.exports = function(fn) {

fn._query = function(callback) {
    var modelOps = this._model,
        query = this.toString(),
        values = this.values,
        db = this;

    var newCallback = function(err,res,fields){
        if (err) callback(log.error(err, false));
        else {
            if (modelOps && _.isPlainObject(modelOps.schema)) {
                var data = Array.isArray(res) ? res : modelOps.data || [];
                modelOps._query = query;
                callback(null, model.map(data, modelOps, db));
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
    else return this.engine.query(query, values, callback);
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

};
