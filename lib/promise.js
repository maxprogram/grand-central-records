var _ = require('lodash');
var Q = require('q');

module.exports = function(fn) {


// Starts a promise chain
fn.then = function(callback) {
    var d = Q.defer();

    this._query(function(err, res) {
        if (err) return d.reject(err);
        if (!_.isFunction(callback)) return d.resolve(res);
        return d.resolve(callback(res));
    });

    return d.promise;
};

fn.fail = function(callback) {
    var d = Q.defer();

    this._query(function(err, res) {
        if (err) return d.reject(err);
        if (!_.isFunction(callback)) return d.resolve(res);
    });

    return d.promise.fail(callback);
};

fn._err = null;

// Call this elsewhere to reject promise chain
fn.reject = function(err) {
    this._err = err;
    this.q = null;

    return this;
};

// Runs callback or returns a promise
fn.run = function(cb) {
    var isPromise = (!_.isFunction(cb));
    if (isPromise) return this.then.apply(this);

    this._query(cb);
};

fn.execute = fn.run;

fn.parallel = Q.all;


};
