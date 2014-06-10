var _    = require('lodash'),
    _str = require('underscore.string');

module.exports = function(fn) {


fn.select = function(columns, callback) {

    // USAGE: #select(column string | [columns])

    // Join & add table name to columns
    var _this = this;
    if (Array.isArray(columns)) {
        columns = columns.map(function(col) {
            return _this.table + '.' + col;
        });
        columns = columns.join(", ");
    } else columns = this.table + '.' + columns;

    this.q.action = "SELECT " + columns;

    if (callback) this._query(callback);
    else return this;

};

fn.where = function(conditions, values, callback) {

    // USAGE: #where(expression string)
    // USAGE: #where(expression string %n, [values])
    // USAGE: #where({column: value, ..})

    var engine = this.engine;

    if (typeof conditions === "object") {
        if (values) callback = values;
        var keys = Object.keys(conditions), conds = [];
        keys.forEach(function(key) {
            var v = conditions[key];
            if (Array.isArray(v) && !Array.isArray(v[0])) {
                for (var i in v) v[i] = engine.escape(v[i]);
                conds.push(key + " IN (" + v.join() + ")");
            } else {
                v = engine.escape(v);
                conds.push(key + " = " + v);
            }
        });
        conditions = conds.join(" AND ");

    // Replace '%1 %2 %3' with [0, 1, 2]
    } else if (Array.isArray(values)) {
        values.forEach(function(v, i){
            i++;
            v = engine.escape(v);
            conditions = conditions.replace(new RegExp("%"+i,"g"), v);
        });

    // Replace ':a :b :c' with {a: '', b: 2, c: true}
    } else if (typeof values === "object") {
        conditions = conditions.replace(/\:(\w+)/g, function (txt, key) {
            if (values.hasOwnProperty(key)) {
                return engine.escape(values[key]);
            }
            return txt;
        });

    } else callback = values;

    this.q.where = "WHERE " + conditions;
    if (callback) this._query(callback);
    else return this;

};

fn.all = function(callback) {
    if (callback) this._query(callback);
    else return this;
};

fn.find = function(id, callback) {

    // USAGE: #find(id int | [ids])

    if (id === null || id === undefined)
        return new Error('#find() needs a valid ID');

    if (Array.isArray(id)) id = id.join(",");
    else if (isNaN(parseFloat(id)))
        return new Error('#find() should be an array or number');

    return this.where(this.idField + ' IN ('+id+')',callback);
};

fn.order = function(orderBy, callback) {

    // USAGE: #order(column DESC|ASC string)

    this.q.others.orderBy = " ORDER BY " + orderBy;
    if (callback) this._query(callback);
    else return this;
};

fn.limit = function(num, callback){

    // USAGE: #limit(int)

    this.q.others.limit = " LIMIT " + num;
    if (callback) this._query(callback);
    else return this;
};

fn.offset = function(num, callback) {

    // USAGE: #offset(int)

    this.q.others.offset += " OFFSET " + num;
    if (this.q.others.limit === "") this.q.others.limit = "9223372036854775807";

    if (callback) this._query(callback);
    else return this;
};

fn.returning = function(field, callback) {
    if (!field) return this;
    if (this.adapter == "pg") {
        if (Array.isArray(field)) {
            field = field.join(', ');
        }
        this.q.others.returning = " RETURNING " + field;
    } else {
        new Error('#returning() only available for Postgres');
    }
    if (callback) this._query(callback);
    return this;
};

fn._cleanData = function(data) {
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

fn.insert = function(data, callback) {
    var engine = this.engine,
        fields = [], values = [], row = [],
        field, value;

    // USAGE: #insert({column: value, ...})
    // USAGE: #insert([{}, {}, ...])
    // USAGE: #insert(Query.object)

    this.q.from = "";
    this.q.action = "INSERT INTO " + this.table;

    if (this.adapter == "pg" || this.adapter == "sqlite") {
        // Data = multiple rows
        if (_.isArray(data)) {
            data.forEach(function(row) {
                fields = fields.concat(Object.keys(row));
            });
            fields = _.uniq(fields);
            for (var i in data) {
                row = [];
                for (var f in fields) {
                    field = fields[f];
                    value = data[i][fields[f]];
                    if (value !== undefined) row.push(engine.escape(value));
                    else row.push('NULL');
                }
                values.push("(" + row.join() + ")");
            }
            this.q.action += " (" + fields.join() + ") VALUES " + values.join(', ');

        // Data = single row
        } else if (_.isPlainObject(data)) {
            data = this._cleanData(data);
            this.q.action += " ("+data.keyStr+") VALUES ("+data.dataStr+")";

        // Data = subquery
        } else if (_.isObject(data.q)) {
            this.q.action += " (" + data.toString() + ")";
        }
        this.q.others.returning = " RETURNING " + this.idField;

    } else if (this.adapter == "mysql") {
        this.q.action += " SET ?";
        this.values = data;
    }

    if (callback) this._query(callback);
    else return this;
};

fn.update = function(id, data, callback) {

    // USAGE: #update(id int, {column: value, ..})
    // USAGE: #update({column: value, ..}).where()

    var where = true;

    if (typeof id === "object"){
        if (data) callback = data;
        data = id;
        where = false;
    }

    this.q.from = "";
    if (this.adapter == "mysql") {
        this.q.action = "UPDATE "+this.table+" SET ?";
        this.values = data;

    } else if (this.adapter == "pg") {
        data = this._cleanData(data);
        this.q.action = "UPDATE "+this.table+" SET ("+data.keyStr+") = ("+data.dataStr+")";

    } else if (this.adapter == "sqlite") {
        var changes = [];
        data = this._cleanData(data);
        data.keys.forEach(function(key,i){
            changes.push(key + ' = ' + data.data[i]);
        });
        this.q.action = "UPDATE "+this.table+" SET "+changes.join(', ');
    }

    if (where) this.q.where += "WHERE "+this.idField+" = "+id;
    if (callback) this._query(callback);
    else return this;
};

fn.remove = function(id, callback) {

    // USAGE: #remove(id int)
    // USAGE: #where().remove()

    var where = false;

    if (typeof id !== "function") where = true;
    else callback = id;

    this.q.action = "DELETE";
    if (where) this.q.where += "WHERE "+this.idField+" = "+id;
    else if (this.q.where === "")
        return log.error(".where() must be called before .remove()");

    if (callback) this._query(callback);
    else return this;
};

fn.sync = function(data, callback) {
    if (!this.engine.sync) return new Error("Sync doesn't exist for this adapter");
    this.engine.sync(this.table, data, callback);
};


// Aliases

fn.findByIdAndUpdate = function(id, data, callback) {
    return this.update(id, data, callback);
};

fn.findByIdAndRemove = function(id, callback) {
    return this.remove(id, callback);
};

fn.create = function(data, callback) {
    return this.insert(data, callback);
};

}
