# Grand Central Records

A basic ORM/ActiveRecord library for use in smaller Node projects or frameworks. Work in progress.

### TODO

* Finish tests
* Finish Query Method docs (below)
* Model#save()
* Model#remove()
* db#getColumns()
* Model validations
* MySQL Pool Connections
* Separate multiple queries for PG (like MySQL)
* Migration / synchronization

### Custom ORM

* Connects with
    * MySQL
    * Postgres
    * SQLite3
* Chainable queries
* Raw queries
    * .query() -- executes the given query
    * .queue(query string or chain) (accepts array, string, object)
    * .run() -- executes all queries in the queue

### Inspiration

* [JugglingDB](https://github.com/1602/jugglingdb)
* [Node-ORM](https://github.com/dresende/node-orm2)
* [Model](https://npmjs.org/package/model)
* [Persist](https://npmjs.org/package/persist)
* [Mongoose](https://npmjs.org/package/mongoose)

---------------------------------------
# Documentation

### Getting started

* [GCR()](#gcr)
* [model()](#model)

### Raw queries

* [query()](#query)
* [queue()](#queue)

### Models

* [Models](#models)
* [Expansion of models](#expansion)
* [reload()](#reload)

### Query methods

* [all()](#all)
* [find()](#find)
* [where()](#where)
* [select()](#select)
* [order()](#order)
* [limit()](#limit)
* [offset()](#offset)
* [insert()](#insert)
* [update()](#update)
* [remove()](#remove)

### Postgres

* [Query: returning()](#returning)
* [Data type: Array](#array)
* [Data type: hstore](#hstore)

---------------------------------------
## Getting started

<a name="gcr" />
### new GCR(connection, [table], [options])

__Arguments__

* __connection__ `json` — Database connection parameters.
	* *adapter* — mysql/MySQL, postgresql/postgres/pg, sqlite3/sqlite
	* *host*, *database*, *username*, *password* — connection parameters
* __table__ `string` — An optional table name if only a single table is being queried.
* __options__ `json` — Options to pass to the model.
	* *verbose* `boolean` —  Turning verbose on will log all queries on the console. `false` by default.
	* *idAttribute* `string` — The name of the unique ID attribute field (defaults to 'id');
    * *map* `boolean` — Set to `true` to map query results to a model. Otherwise, results will be in their raw format.
	* (see [Models](#models))

Creating a new instance of the GCR object creates a connection to a new database.

```js
var GCR = require('grand-central-records');

var Model = new GCR({
    adapter: "mysql",
    host: "localhost",
    database: "test",
    username: "admin",
    password: "admin"
}, "users");

Model.find(8, function(err, user){
    if (err) throw err;
    console.log(user.name);
});

Model.select(["name","address"]).where({admin: true}, function(err, result) {
    if (err) throw err;
    result.forEach(function(user) {
        ...
    });
});
```
<a name="model" />
### model(table, [options])

__Arguments__

* __table__ `string` — The name of the table the model is associated with.
* __options__ `json` — See above.

Multiple models can also be created from the same database.

```js
var GCR = require('grand-central-records');

var db = new GCR({
    adapter: "mysql",
    host: "localhost",
    database: "test",
    username: "admin",
    password: "admin"
}, { verbose: true });

var User = db.model("users"),
    Project = db.model("projects");
```

---------------------------------------
## Raw Queries

<a name="query" />
### query(query, [values], callback)

Execute raw query to database.

```js
db.query('SELECT 1 AS a', function(err, res) {
    console.log(res[0].a); //= 1
});

// Substitute with array of values
db.query('SELECT 1 AS a; SELECT %1 AS a;', ['hello'], function(err, res) {
    console.log(res[0].a); //= 1
    console.log(res[1].a); //= hello
});

// Substitute with key/values
db.query('SELECT :name AS a', { name: 'hello' }, function(err, res) {
    console.log(res[0].a); //= hello
})
```
<a name="queue" />
### queue(query, [values])

Add query to queue for later execution. Query can be a raw query string, a chained method object, or an array of either. Values can't be passed to objects or arrays (only raw strings);

```js
db.queue('SELECT 1 AS a')
  .queue('SELECT %1', [2])
  .queue('SELECT :name AS a', { name: 'hello' })
  .run(function(err, res) {
    console.log(res[0].a); //= 1
    console.log(res[2].a); //= hello
});

db.queue(Model.find(1))
  .queue(Model.select('name').limit(1))
  .run(function(err, res) {
    console.log(res[0]); // (row with ID of 1)
    console.log(res[1]); // (first row with only name column)
});

db.queue(['SELECT 1 AS a', 'SELECT 2 AS a']);
. . .
db.run(function(err, res) {
    console.log(res[0].a); //= 1
    console.log(res[1].a); //= 2
});
```
---------------------------------------
<a name="models" />
## Models

To map query results to a model, pass `map: true` to model options, like this:

```js
var User = db.model('users', { map: true });
```

Define a schema for default values and validations [* validations not implemented yet].

```js
var User = db.model('users', {
    map: true,
    schema: {
        first: String,
        last:  String,
        admin: { type: Boolean, default: false },
        created_at: Date,
        updated_at: Date
    }
});
```

<a name="expansion" />
### Expansion of models

__Methods__ are functions that can be called on the model.

```js
var User = db.model('users', {
    map: true,
    methods: {
        add: function(n) {
            return this.number + n;
        }
    }
});
. . .
console.log(user.number); //= 5
console.log(user.add(5)); //= 10
```

__Getters__ are methods that are called immediately and act as regular values for a model. They can supplement or replace previous values.

```js
var User = db.model('users', {
    map: true,
    getters: {
        first: function() { // No arguments
            return this.first.toUpperCase();
        },
        fullName: function() {
            return this.first + ' ' + this.last;
        }
    }
});
. . .
console.log(user.first);    //= PETER
console.log(user.last);     //= Parker
console.log(user.fullName); //= PETER Parker
```
<a name="reload" />
### reload()

Reloads the model's original data.

```js
User.find(1, function(err, user) {
    user.name = 'Mark';
    console.log(user.name); //= Mark
    user.reload();
    console.log(user.name); //= Adam (the original)
});
```
---------------------------------------
## Common Query Methods:

<a name="all"/>
### all(callback)

<a name="find"/>
### find(ids, [callback])

* __ids__ `number` `array` — The ID, or an array of IDs, of the row(s) to return.
* __callback(err, rows)__ — Optional callback to run the query.

```js
Animal.find(88, function(err, animals) {
    console.log(animals[0]); //= { id: 88, name: 'Tiger' }
});

Animal.find([6, 18], function(err, animals) {
    console.log(animals); //= [{ id: 6, name: 'Shark' }, { id: 18, name: 'Panda' }]
});
```
<a name="where"/>
### where(expression, [values], [callback])

<a name="select"/>
### select(fields, [callback])

<a name="order"/>
### order(orderBy, [callback])

<a name="limit"/>
### limit(number, [callback])

<a name="offset"/>
### offset(number, [callback])

<a name="insert"/>
### insert(data, [callback]), create()

* __data__ `object` `array` — An object of the data, with correctly named columns, to be inserted into the table. With Postgres & SQLite it also can be an array of objects.
* __callback(err, rows)__ — Optional callback to run the query.

For Postgres, #insert() also returns the ID attribute.

<a name="update"/>
### update(id, data, [callback])

<a name="remove"/>
### remove(id, [callback])

---------------------------------------
## *Postgres*

<a name="returning" />
### Query: returning(fields, [callback])

* __fields__ `string` `string[]` — the name of the field to return, or an array of fields.

Adding the #returning() method to a query chain (either __insert__ or __update__)

<a name="array" />
### Data type: Array

Values provided as an Array will be sent to the server as a Postgres Array data type (see more in the [Postgres docs](http://www.postgresql.org/docs/9.1/static/arrays.html)). So `[1, 2, 3, 4]` will be stored in Postgres as `'{1, 2, 3, 4}'`.

<a name="hstore" />
### Data type: hstore

Values provided as a JSON will be sent to the server as an hstore data type, a storage of key/values (see more in the [Postgres docs](http://www.postgresql.org/docs/9.0/static/hstore.html)). So `{ one: 1, two: 'three' }` will be stored in Postgres as `'one => 1, two => "three"'`.

<a name="noescape" />
### Data type: no escape (raw string)

Enclose the value in two nested arrays to avoid any value escaping. So `[['\n']]` will result in a String of `'\n'` and not `'\\n'` as usual.
