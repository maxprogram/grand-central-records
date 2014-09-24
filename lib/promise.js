var _ = require('lodash');
var Q = require('q');

module.exports = function(fn) {

// Aliases for common Q methods
// See: https://github.com/kriskowal/q/wiki/API-Reference
// All run the query first, then whatever method was called

fn.run = fn.execute = fn.then = function(next, rejected, progress) {
    if (!_.isFunction(next)) return this._query();
    return this._query().then(next, rejected, progress);
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

};
