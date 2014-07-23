var _ = require('lodash');
var Q = require('q');

module.exports = function(fn) {

function addPromiseMethods(promise) {
    // #run() shortcut
    promise.run = function() {
        return this;
    };
    return promise;
}

// Starts a promise chain
fn.then = function(callback) {
    var d = Q.defer();

    this._query(function(err, res) {
        if (err) return d.reject(err);
        if (!_.isFunction(callback)) return d.resolve(res);
        return d.resolve(callback(res));
    });

    return addPromiseMethods(d.promise);
};

fn.fail = function(callback) {
    var d = Q.defer();

    this._query(function(err, res) {
        if (err) return d.reject(err);
        if (!_.isFunction(callback)) return d.resolve(res);
    });

    return addPromiseMethods(d.promise).fail(callback);
};
fn.catch = fn.fail;

fn._err = null;

// Call this elsewhere to reject promise chain
fn.reject = function(err) {
    this._err = err;
    this.q = null;

    return this;
};

fn.throw = fn.reject;

// Runs callback or returns a promise
fn.run = function(cb) {
    var isPromise = (!_.isFunction(cb));
    if (isPromise) return this.then.apply(this);

    this._query(cb);
};

fn.execute = fn.run;

fn.parallel = Q.all;

// Runs a callback if it exists
fn.nodeify = function(callback) {
    if (_.isFunction(callback)) this.run(callback);
    return this;
};

};
