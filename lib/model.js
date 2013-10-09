var _ = require('underscore');

var Model = exports.Model = function(data, options) {
    this._options = options;
    this._original = data;
    this._query = options._query || '';

    this.reload();
};

exports.map = function(data, options) {
    var newData = [];
    data.forEach(function(d) {
        newData.push(new Model(d, options));
    });

    data = newData;
    if (data.length == 1) data = data[0];
    return data;
};

exports.setModelFunctions = function(GCR) {
    GCR.addGetter = function(name, fn) {
        var ops, getters;
        ops = this._modelOps;
        if (!ops) return;
        getters = ops.getters || {};

        getters[name] = fn;
        this._modelOps.getters = getters;
    };

    GCR.addMethod = function(name, fn) {
        var ops, methods;
        ops = this._modelOps;
        if (!ops) return;
        methods = ops.methods || {};

        methods[name] = fn;
        this._modelOps.methods = methods;
    };
};

var fn = Model.prototype;

fn.reload = function() {
    var data = this._original,
        options = this._options,
        schema = options.schema,
        fn, key;

    if (schema) for (key in schema) {
        if (data.hasOwnProperty(key)) {
            this[key] = data[key];
        } else {
            this[key] = (schema[key].default) ?
                schema[key].default :
                null;
        }
        this[options._idField] = data[options._idField] || -1;
    } else for (key in data) {
        this[key] = data[key];
    }

    if (options.getters) for (key in options.getters) {
        fn = options.getters[key].bind(this);
        this[key] = fn();
    }

    if (options.methods) for (key in options.methods) {
        if (!_.contains(['save', 'destroy', 'remove', 'reload'], key)) {
            fn = options.methods[key].bind(this);
            this[key] = fn;
        }
    }

    return this;
};

fn.save = function(callback) {
    // TODO: Run validations
    // If valid, update or create record
};

fn.destroy = function(callback) {};

fn.remove = fn.destroy;
