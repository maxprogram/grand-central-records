var _ = require('lodash');
var Q = require('q');
var log = require('./log');
var model = require('./model');


/* Prepares GCR query; maps results to model
 * @returns {promise:array} Query results
 */
exports._query = function() {
    var modelOps = this._model,
        query = this.toString(),
        values = this.values,
        db = this;

    var mapData = function(res) {
        if (modelOps && _.isPlainObject(modelOps.schema)) {
            var data = Array.isArray(res) ? res : modelOps.data || [];
            modelOps._query = query;

            return model.map(data, modelOps, db);
        }
        return res;
    };

    if (!this.table) {
        return Q.reject(log.error("Model doesn't exist! (No table provided)"));
    } else if (this.table == ':test:') {
        return Q(query).then(mapData);
    } else if (query === '') {
        var err = this._err;
        this._err = null;
        this._rebuild();

        if (err) return Q.reject(err);
        return Q([]);
    }
    return this.query(query, values).then(mapData);
};

/* Queries GCR engine
 * @param {string} query
 * @param {object} [values] Values to substitute
 * @returns {promise:array} Query results
 */
exports.query = function(query, values) {
    if (typeof values === 'object') {
        // Replace if Postgres or if query has no SQL replacers
        if (this.adapter == 'pg' || this.adapter == 'sqlite' || !/\:(\w+)/.test(query)) {
            query = this._replace(query, values);
            values = null;
        }
    } else values = null;

    return this.engine.query(query, values);
};

exports._replace = function(query, values) {
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
