var _    = require('lodash'),
    _str = require('underscore.string');


function addChain(name, options) {
    exports[name] = function() {
        options = options || {};

        if (_.contains(options.notFor, this.adapter)) return this;

        // Get the constructor value
        if (options.init) options.init.apply(this);
        var value = options.constructor ?
            options.constructor.apply(this, arguments) : null;

        // Allows use of another chain method
        if (options.use) {
            return this[options.use].apply(this, value);
        }

        if (this.q) Object.keys(options).forEach(function(key) {
            if (_.contains(['action', 'from', 'where', 'table'], key)) {
                this.q[key] = (options[key] + ' ' + (value || '')).trim();
            }
            if (_.contains(['orderBy', 'limit', 'offset', 'returning'], key)) {
                this.q.others[key] = (options[key] + ' ' + (value || '')).trim();
            }
        }.bind(this));

        return this;
    };
}

exports._cleanData = function(data) {
    var keys = Object.keys(data),
        engine = this.engine,
        dataOnly = [];

    keys.forEach(function(key,i){
        var d = engine.escape(data[key]);
        dataOnly[i] = d;
    });

    return {keys: keys,
            data: dataOnly,
            keyStr: keys.join(","),
            dataStr: dataOnly.join(",")};
};

//==========================================================
// #select()
// USAGE: #select(string || string[])

addChain('select', {
    action: 'SELECT',
    constructor: function(columns) {
        var table = this.table;

        // Join & add table name to columns
        columns = _.isString(columns) ? _.compact(columns.split(/\s|,/g)) : columns;
        columns = columns.map(function(col) {
            return table + '.' + col.trim();
        });

        return columns.join(", ");
    }
});

//==========================================================
// #where()
// USAGE: #where(expression string)
// USAGE: #where(expression string %n, values[])
// USAGE: #where({column: value, ..})

addChain('where', {
    where: 'WHERE',
    constructor: function(conditions, values) {
        var engine = this.engine;

        if (_.isPlainObject(conditions)) {
            conditions = Object.keys(conditions).map(function(key) {
                var v = conditions[key];
                if (Array.isArray(v) && !Array.isArray(v[0])) {
                    v = v.map(function(v1) { return engine.escape(v1); });
                    return key + " IN (" + v.join() + ")";
                } else {
                    return key + " = " + engine.escape(v);
                }
            }).join(" AND ");

        // Replace '%1 %2 %3' with [0, 1, 2]
        } else if (_.isString(conditions) && _.isArray(values)) {
            values.forEach(function(v, i){
                i++;
                v = engine.escape(v);
                conditions = conditions.replace(new RegExp("%"+i,"g"), v);
            });

        // Replace ':a :b :c' with {a: '', b: 2, c: true}
        } else if (_.isString(conditions) && _.isPlainObject(values)) {
            conditions = conditions.replace(/\:(\w+)/g, function (txt, key) {
                if (values.hasOwnProperty(key)) {
                    return engine.escape(values[key]);
                }
                return txt;
            });

        }

        return conditions;
    }
});

//==========================================================
// #all()

addChain('all');

//==========================================================
// #find()
// USAGE: #find(id || id[])

addChain('find', {
    use: 'where',
    constructor: function(id) {
        if (id === null || id === undefined) id = 'NULL';

        var conds = {};
        conds[this.idField] = id;

        return [conds];
    }
});

//==========================================================
// #order()
// USAGE: #order(column DESC|ASC string)
// USAGE: #order(columns[])
// USAGE: #orderDesc() #orderAsc()

addChain('order', {
    orderBy: 'ORDER BY',
    constructor: function(columns) {
        var table = this.table;

        columns = _.isString(columns) ? columns.split(',') : columns;
        columns = columns.map(function(col) {
            return table + '.' + col.trim();
        });

        return columns.join(', ');
    }
});

addChain('orderBy', {
    use: 'order',
    constructor: function(columns) {
        return columns;
    }
});

addChain('orderDesc', {
    use: 'order',
    constructor: function(columns) {
        columns = _.isString(columns) ? columns.split(',') : columns;
        return [columns.map(function(col) {
            return col.trim() + ' DESC';
        })];
    }
});

addChain('orderAsc', {
    use: 'order',
    constructor: function(columns) {
        columns = _.isString(columns) ? columns.split(',') : columns;
        return [columns.map(function(col) {
            return col.trim() + ' ASC';
        })];
    }
});

//==========================================================
// #limit()
// USAGE: #limit(int)

addChain('limit', {
    limit: "LIMIT",
    constructor: function(num) {
        return num;
    }
});

//==========================================================
// #offset()
// USAGE: #offset(int)

addChain('offset', {
    offset: "OFFSET",
    constructor: function(num) {
        return num;
    }
});

//==========================================================
// #returning()
// POSTGRES ONLY!

addChain('returning', {
    returning: 'RETURNING',
    notFor: ['mysql', 'sqlite'],
    constructor: function(columns) {
        if (Array.isArray(columns)) columns = columns.join(', ');
        return columns;
    }
});

//==========================================================
// #insert()
// USAGE: #insert({column: value, ...})
// USAGE: #insert([{}, {}, ...])
// USAGE: #insert(Query.object)

addChain('insert', {
    action: 'INSERT INTO %t%',
    constructor: function(data) {
        var engine = this.engine;

        if (this.adapter == "pg" || this.adapter == "sqlite") {
            // Data = multiple rows
            if (_.isArray(data)) {
                var fields = _.uniq(data.reduce(function(list, row) {
                    return list.concat(Object.keys(row));
                }, []));

                var values = data.map(function(row) {
                    return '(' + fields.map(function(f) {
                        return (row[f] !== undefined) ? engine.escape(row[f]) : 'NULL';
                    }).join() + ')';
                });

                data = "(" + fields.join() + ") VALUES " + values.join(', ');

            // Data = single row
            } else if (_.isPlainObject(data)) {
                data = this._cleanData(data);
                data = "(" + data.keyStr + ") VALUES (" + data.dataStr + ")";

            // Data = subquery
            } else if (_.isObject(data.q)) {
                data = "(" + data.toString() + ")";
            }

            this.returning(this.idField);

        } else if (this.adapter == "mysql") {
            this.values = data;
            data = "SET ?";
        }

        this.q.from = this.q.table = "";
        return data;
    }
});

//==========================================================
// #update()
// USAGE: #update(int || int[], {column: value, ..})
// USAGE: #update({column: value, ..}).where()

addChain('update', {
    action: 'UPDATE %t%',
    constructor: function(id, data) {
        var byId = !_.isPlainObject(id);

        if (!byId) data = id;

        if (this.adapter == "mysql") {
            this.values = data;
            data = "SET ?";

        } else if (this.adapter == "pg") {
            data = this._cleanData(data);
            data = "SET (" + data.keyStr + ") = (" + data.dataStr + ")";

        } else if (this.adapter == "sqlite") {
            data = this._cleanData(data);
            data = data.keys.map(function(key, i){
                return key + ' = ' + data.data[i];
            });
            data = "SET " + data.join(', ');
        }

        if (byId) this.find(id);
        this.q.from = this.q.table = "";
        return data;
    }
});

//==========================================================
// #remove()
// USAGE: #remove(int || int[])
// USAGE: #where().remove()

addChain('remove', {
    action: 'DELETE',
    constructor: function(id) {
        var where = (id) ? true : false;

        if (where) {
            this.find(id);
            return '';
        } else if (this.q.where === "") {
            return '##where() must be called before #remove()#';
        }
    }
});

//==========================================================
// #union() #unionAll()
// USAGE: #union(QueryObject)
// USAGE: #union('query string')

exports.union = function(query) {
    if (_.isPlainObject(query.q)) query = query.toString();
    query = 'UNION (' + query + ')';
    this.q.union.push(query);

    return this;
};

exports.unionAll = function(query) {
    if (_.isPlainObject(query.q)) query = query.toString();
    query = 'UNION ALL (' + query + ')';
    this.q.union.push(query);

    return this;
};

// Aliases

exports.findByIdAndUpdate = function(id, data, callback) {
    return this.update(id, data, callback);
};

exports.findByIdAndRemove = function(id, callback) {
    return this.remove(id, callback);
};

exports.create = function(data, callback) {
    return this.insert(data, callback);
};

