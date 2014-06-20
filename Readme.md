# Grand Central Records

A basic ORM/ActiveRecord library for use in smaller Node projects or frameworks. Work in progress.

### TODO

* Implement Promises in SQl adapters
* Model validations
* Model#save()
* Model#remove()
* Query joins (see https://www.npmjs.org/package/sql)
* MySQL Pool Connections
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
* Callbacks *or* promises

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
* [Promises](#promises)

### Raw queries

* [query()](#query)
* [queue()](#queue)

### Models

* [Models](#models)
* [Expansion of models](#expansion)
* [reload()](#reload)

### Other functions

* [setTable](#setTable)
* [addGetter](#addGetter)
* [addMethod](#addMethod)

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

* [end()](#end)
* [Query: returning()](#returning)
* [Data type: Array](#array)
* [Data type: hstore](#hstore)

---------------------------------------
## Getting started

<a name="gcr" />
### new GCR(connection, [table], [options])

* __connection__ `json` — Database connection parameters.
	* *adapter* — mysql/MySQL, postgresql/postgres/pg, sqlite3/sqlite
	* *host*, *database*, *username*, *password* — connection parameters
* __table__ `string` — An optional table name if only a single table is being queried.
* __options__ `json` — Options to pass to the model.
	* *verbose* `boolean` `function` —  Turning verbose on will log all queries on the console. `false` by default. If a function is provided, it will be used to log all outputs.
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

### Promises

Execute a query using a callback:
```js
Model.find(52, function(err, res) {...});
Model.find(52).select('id').run(function(err, res) {...});
```

Or by using promises:
```js
Model.find(52)
  .then(function(res) {
    return res;
  })
  .then(function(res) {
    // do something...
  })
  .fail(function(err) {
    throw err;
  });

// Or in parallel using #parallel() as an alieas for Q's 'all'
db.parallel([
    Model.find(52).run(),
    Model.where({ type: 2 }).run()
]).done(function(res) {
    // do something...
}).fail(function(err) {...});
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
### queue()

Add query to queue for later execution. Query can be a raw query string, a chained method object, or an array of either. Values can't be passed to objects or arrays (only raw strings);

#### queue.add(query, [values])
#### queue.print() || queue.get()
#### queue.run(callback)

```js
var queue = db.queue();

queue.add('SELECT 1 AS a')
  .add('SELECT %1', [2])
  .add('SELECT :name AS a', { name: 'hello' })
  .run(function(err, res) {
    console.log(res[0].a); //= 1
    console.log(res[2].a); //= hello
});

queue.add(Model.find(1))
  .add(Model.select('name').limit(1))
  .run(function(err, res) {
    console.log(res[0]); // (row with ID of 1)
    console.log(res[1]); // (first row with only name column)
});

queue.add(['SELECT 1 AS a', 'SELECT 2 AS a']);
. . .
console.log(queue.print()); //= "SELECT 1 AS a; SELECT 2 AS a;"
queue.run(function(err, res) {
    console.log(res[0].a); //= 1
    console.log(res[1].a); //= 2
});
// OR as promise //
queue.run().then(function(res) {...})
  .fail(function(err) {...});
```
---------------------------------------
<a name="models" />
## Models

To map query results to a model, define a schema for default values and validations [* validations not implemented yet]. (To map results to a model *without* a schema, just define as an empty object `schema: {}`.)

```js
var User = db.model('users', {
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
    schema: {},
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
    schema: {},
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
## Other functions:

<a name="setTable"/>
### setTable(table)

Changes the table name of the database/model.

```js
db.setTable('products');
// or
Products.setTable('products').find(1);
```

<a name="addGetter"/>
### addGetter(name, fn)

<a name="addMethod"/>
### addMethod(name, fn)

---------------------------------------
## Common Query Methods:

<a name="all"/>
### all(callback)

Gets all table rows (`SELECT * FROM table`).

<a name="find"/>
### find(ids, [callback])

* __ids__ `int` `int[]` — The ID, or an array of IDs, of the row(s) to return.
* __callback(err, rows)__ — Optional callback to run the query.

```js
Animal.find(88, function(err, animals) {
    console.log(animals[0]); //= [{ id: 88, name: 'Tiger' }]
});
Animal.find([6, 18]);
```
<a name="where"/>
### where(expression, [values], [callback])

* __expression__ `string` `object` — An expression string (`"sales < 500 AND type = 'new'"`) or an object of property values to match (`{ type: 'new' }`).
* __values__ `array` `object` — Optional values to escape & substitute into expression string. An array of `[0, 1, 2]` replaces `%1 %2 %3`. An object of `{a: 1, b: 2}` replaces `:a :b`.
* __callback(err, rows)__ — Optional callback to run the query.

```js
Person.where("age >= 21");
    //= SELECT * FROM people WHERE age >= 21;
Person.where({ gender: "female", hand: "left" });
    //= SELECT * FROM people WHERE gender = 'female' AND hand = 'left';
Person.where("name = %1 OR name = %2", ['Jill', 'Jane']);
    //= SELECT * FROM people WHERE name = 'Jill' OR name = 'Jane';
Person.where("age >= :age", { age: 21 });
    //= SELECT * FROM people WHERE age >= 21;
// Subqueries (Postgres only):
Person.where({ id: Client.select('person_id').order('sales').limit(1) });
    //= SELECT * FROM people WHERE id = (SELECT person_id FROM clients ORDER BY sales LIMIT 1);
```

<a name="select"/>
### select(fields, [callback])

* __fields__ `string` `string[]` — An array or comma-separated string of the columns you want returned.
* __callback(err, rows)__ — Optional callback to run the query.

```js
Book.select("author");
Book.select("author, publisher");
Book.select(["author", "publisher", "title"]);
```

<a name="order"/>
### order(fields, [callback])

* __fields__ `string` `string[]` — An array or comma-separated string of the columns (and optionally ASC/DESC) you want ordered.
* __callback(err, rows)__ — Optional callback to run the query.

```js
Animal.order('size');
Animal.order('size ASC, bones DESC');
Animal.order(['size', 'number']);
// Shortcuts
Animal.orderDesc('size');
    //= SELECT * FROM animals ORDER BY size DESC;
Animal.orderAsc('bones');
    //= SELECT * FROM animals ORDER BY bones ASC;
```

<a name="limit"/>
### limit(number, [callback])

* __number__ `int` — A number to limit the results by.
* __callback(err, rows)__ — Optional callback to run the query.

<a name="offset"/>
### offset(number, [callback])

* __number__ `int` — A number to offset the results by.
* __callback(err, rows)__ — Optional callback to run the query.

<a name="insert"/>
### insert(data, [callback]), create()

* __data__ `object` `array` `query` — An object of the data, with correctly named columns, to be inserted into the table. With Postgres & SQLite it also can be an array of objects or a subquery.
* __callback(err, rows)__ — Optional callback to run the query.

For Postgres, #insert() also returns the ID attribute.

```js
Animal.insert({ name: 'Siberian Tiger', species: 'P. tigris altaica' });
    //= INSERT INTO animals (name,species) VALUES ('Siberian Tiger','P. tigris altaica') RETURNING id;
Animal.insert([
    { name: 'Puma', species: 'Puma concolor' },
    { name: 'Jackalope' }
]);
    //= INSERT INTO animals (name,species) VALUES ('Puma','Puma concolor'), ('Jackalope',NULL);
Person.create(Client.select('name').where({ type: 'new' }));
    //= INSERT INTO people (SELECT name FROM clients WHERE type = 'new');
```

<a name="update"/>
### update([id], data, [callback])

* __id__ `int` `int[]` — The optional id(s) of the items to update (if omitted, a `where()` method is required).
* __data__ `object` — An object of the data, with correctly named columns, to be updated.
* __callback(err, rows)__ — Optional callback to run the query.

```js
Book.update(55688, { title: 'The Great Gatsby' });
    //= UPDATE books SET (title) = ('The Great Gatsby') WHERE id IN (55688);
Book.update({ publisher: 'Brown Little' }).where({ publisher: 'Brown' });
    //= UPDATE books SET (publisher) = ('Brown Little') WHERE publisher = 'Brown';
```

<a name="remove"/>
### remove(id, [callback])

* __id__ `int` `int[]` — The optional id(s) of the items to update (if omitted, a `where()` method is required __before__ remove is called).
* __callback(err, rows)__ — Optional callback to run the query.

```js
Person.remove(345267);
Person.remove([5610, 5615]);
Person.where({ name: 'Mark' }).remove();
    //= DELETE FROM people WHERE name = 'Mark';
```

---------------------------------------
## *Postgres*

<a name="end" />
### db.end()

Ends the Postgres pool connection. Connection will end automatically after 10 seconds if no queries are running. (Otherwise a new connection begins when a query is run.)

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
