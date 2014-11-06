var _ = require('lodash');
var Q = require('q');

var fn = exports;

// Aliases for common Q methods
// See: https://github.com/kriskowal/q/wiki/API-Reference
// All run the query first, then whatever method was called

fn.run = fn.execute = fn.then = function(next, rejected, progress) {
    if (!_.isFunction(next)) return this._query();
    return this._query().then(next, rejected, progress);
};

fn.thenResolve = function(value) {
    return Q(value);
};

fn.thenOne = function(next, rejected, progress) {
    return this._query().then(function(res) {
        return res[0];
    }, rejected, progress).then(next);
};

fn.thenEach = function(func) {
    return this._query().then(function(res) {
        if (_.isArray(res)) _.forEach(res, func);
        return res;
    });
};

fn.thenMap = function(iterator) {
    return this._query().then(function(res) {
        if (!_.isArray(res)) return res;
        return _.map(res, iterator);
    });
};

fn.fail = fn.catch = function(next) {
    return this._query().fail(next);
};

fn.progress = function(progress) {
    return this._query().progress(progress);
};

fn.fin = fn.finally = function(callback) {
    return this._query().fin(callback);
};

fn.done = function(next, rejected, progress) {
    return this._query().done(next, rejected, progress);
};

fn._err = null;

// Call this elsewhere to reject promise chain
fn.reject = fn.throw = function(err) {
    this._err = err;
    this.q = null;

    return this;
};

fn.parallel = Q.all;
