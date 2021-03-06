var _ = require('lodash');
var Q = require('q');


exports.map = function(data, options, db) {
    return data.map(function(row) {
        return new Model(row, options, db);
    });
};

exports.setModelFunctions = function(GCR) {
    GCR.addGetter = function(name, fn) {
        if (!this._model) return;
        var getters = this._model.getters || {};

        getters[name] = fn;
        this._model.getters = getters;
    };

    GCR.addMethod = function(name, fn) {
        if (!this._model) return;
        var methods = this._model.methods || {};

        methods[name] = fn;
        this._model.methods = methods;
    };
};

// There may be a better way to do this, but I don't know it...
function addToPrototype(obj, data) {
    obj.__proto__ = _.extend(_.clone(obj.__proto__), data);
}

function loadDefaults(schema, data) {
    schema = _(schema).reduce(function(defaults, val, key) {
        if (val.default) defaults[key] = val.default;
        return defaults;
    }, {});
    return _.defaults(data, schema);
}


/** Model OBJECT for each database result
 */
function Model (data, options, db) {
    // Add data to prototype so it remains "invisible"
    // if user tries to access data normally
    addToPrototype(this, {
        _options: options,
        _original: loadDefaults(options.schema, data),
        _query: options._query || '',
        _db: db
    });
    this.reload();
};
exports.Model = Model;

var forbidden = [
    'save','destroy','remove','reload','validate',
    'changed','reset','toJSON','toString'
];

var fn = Model.prototype;

fn.reload = function() {
    var data = this._original,
        options = this._options,
        schema = options.schema,
        fn, key;

    if (schema) for (key in schema) {
        if (data[options._idField] === null || data[options._idField] === undefined) {
            this[options._idField] = -1;
        } else {
            this[options._idField] = data[options._idField];
        }

        if (_(data).has(key)) {
            this[key] = data[key];
        } else {
            this[key] = schema[key].default ? schema[key].default : null;
        }
    } else for (key in data) {
        this[key] = data[key];
    }

    if (options.getters) for (key in options.getters) {
        fn = options.getters[key].bind(this);
        this[key] = fn();
    }

    if (options.methods) for (key in options.methods) {
        if (!_.contains(forbidden, key)) {
            fn = options.methods[key].bind(this);
            var newProto = {};
            newProto[key] = fn;
            addToPrototype(this, newProto);
        }
    }

    return this;
};

fn.reset = fn.reload;

fn.update = function(data) {
    var schema = this._options.schema;

    _(data).each(function(val, key) {
        if (val && this[key] !== val && _.has(schema, key))
            this[key] = val;
    }, this);

    return this;
};

fn.toJSON = function() {
    var options = this._options;
    var original = this._original;
    var id = this[options._idField];
    var schema = options.schema;
    var json = {};

    if (id != -1) json[options._idField] = id;

    return _(schema).reduce(function(json, val, key) {
        if (_(this).has(key) && _(original).has(key) || _(this.changed()).has(key))
            json[key] = this[key];
        if (!this[key] && _(val).has('default')) {
            json[key] = val.default;
        }
        return json;
    }, json, this);
};

fn.changed = function() {
    var now = this;
    var orig = this._original;
    var schema = this._options.schema;

    return _(schema).reduce(function(changed, val, key) {
        if (orig[key] !== now[key] && now[key]) {
            changed[key] = now[key];
        }
        return changed;
    }, {}, this);
};

fn.validate = function() {
    var schema = this._options.schema;
    var data = this.toJSON();

    var defaultMessages = {
        wrongType:   "should be %n",
        tooShort:    "should be at least %n",
        tooLong:     "should not be more than %n",
        doesntMatch: "should match the RegEx %n",
        isNull:      "shouldn't be empty",
        notInList:   "should be in: %n",
        inList:      "shouldn't be included in: %n",
        custom:      "is invalid",
    };

    function isInvalid(field, checks) {
        var value = data[field];

        if (!_.isPlainObject(checks)) checks = { type: checks };
        var type = checks.type;

        var messages = _.defaults(checks, defaultMessages);
        function msg(message, replace) {
            return messages[message].replace(/%n/g, replace);
        }

        // Check is custom validation
        if (_.isFunction(type) && type.name === '') {
            var validate = type(value);
            if (_.isString(validate)) return validate;
            if (!validate) return msg('custom');
            return false;
        }

        // Check if null
        if (!value) {
            if (_(checks).has('allowNull') && !checks.allowNull) {
                return msg('isNull');
            }
            return false;
        }

        // Check value type
        if (_.isArray(type) && _.isFunction(type[0])) {
            if (!_.isArray(value)) return msg('wrongType','array');
            type = type[0];
            value = value[0];
        }

        if (_.isArray(type)) {
            if (!_.contains(type, value))
                return msg('notInList', type.join(', '));
        }

        switch (type.name) {
        case 'String':
            if (!_.isString(value)) return msg('wrongType','string');
            break;
        case 'Number':
            if (!_.isNumber(value)) return msg('wrongType','number');
            break;
        case 'Date':
            if (!_.isDate(value)) return msg('wrongType','date');
            break;
        case 'Boolean':
            if (!_.isBoolean(value)) return msg('wrongType','boolean');
            break;
        case 'Buffer':
            if (!Buffer.isBuffer(value)) return msg('wrongType','buffer');
            break;
        }

        // Checks exclusions
        if (_.isArray(checks.not)) {
            if (_.contains(checks.not, value))
                return msg('inList', checks.not.join(', '));
        }

        // Check length
        if (_(checks).has('length')) {
            if (value.length > checks.length)
                return msg('tooLong', checks.length + ' characters');
        }
        if (_(checks).has('max')) {
            if (type.name == 'String' && value.length > checks.max)
                return msg('tooLong', checks.max + ' characters');
            if (value > checks.max)
                return msg('tooLong', checks.max);
        }
        if (_(checks).has('min')) {
            if (type.name == 'String' && value.length < checks.min)
                return msg('tooShort', checks.min + ' characters');
            if (value < checks.min)
                return msg('tooShort', checks.min);
        }

        // Check RegEx match
        if (_(checks).has('match') && _.isString(value)) {
            var match = value.match(checks.match);
            if (!match || match.index !== 0)
                return msg('doesntMatch', checks.match);
        }

        return false;
    }

    return _(schema).reduce(function(errs, check, key) {
        var msg = isInvalid(key, check);
        if (msg) errs[key] = msg;
        return errs;
    }, {});
};

fn.save = function() {
    var validation = this.validate();
    if (!_.isEmpty(validation)) {
        var err = new Error();
        err.message = 'Data for model "' + this._db.table + '" is invalid';
        err.detail = validation;

        return Q.reject(err);
    }

    var isNew = (this[this._options._idField] == -1);
    var data = isNew ? this.toJSON() : this.changed();

    // If model hasn't changed, don't update
    if (!isNew && _.isEmpty(data)) {
        this._db.q = null;
        return this._db;
    // Otherwise run callback or return promise
    } else if (isNew) {
        return this._db.insert(data);
    } else {
        return this._db.update(this.id, data);
    }
};

fn.destroy = function() {
    var id = this[this._options._idField];
    if (id == -1) return;

    return this._db.remove(id);
};

fn.remove = fn.destroy;
