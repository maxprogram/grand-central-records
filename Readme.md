# Grand Central Records

A basic ORM/ActiveRecord library for use in smaller Node projects or frameworks. Work in progress.

### TODO

* Finish tests
* Finish Query Method docs (below)
* Model#save()
* Model#remove()
* db#getColumns()
* MySQL Pool Connections
* Model validations
* Separate multiple queries for PG (like MySQL)
* Migration / synchronization
* MongoDB integration

### Custom ORM

* Connects with
    * MySQL
    * Postgres
    * SQLite3
* Chainable queries
* Other functions/aliases
    * .findByIdAndUpdate()
    * .findByIdAndRemove()
    * .create()
* Raw queries
    * .query() *(on SQL databases)* -- executes the given query
    * .queue(query string or chain) (accepts array, string, object)
    * .run() -- executes all queries in the queue

### Inspiration

* [JugglingDB](https://github.com/1602/jugglingdb)
* [Node-ORM](https://github.com/dresende/node-orm2)
* [Model](https://npmjs.org/package/model)
* [Persist](https://npmjs.org/package/persist)
* [Mongoose](https://npmjs.org/package/mongoose)

# Documentation

## Samples:
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

## Raw Queries

### .query(query, [values], callback)

Execute raw query to database.
```js
db.query('SELECT 1 AS a', function(err, res) {
    console.log(res[0].a); // 1
});

// Substitute with array of values
db.query('SELECT 1 AS a; SELECT %2 AS a;', ['hello'], function(err, res) {
    console.log(res[0].a); // 1
    console.log(res[1].a); // hello
});

// Substitute with key/values
db.query('SELECT :name AS a', { name: 'hello' }, function(err, res) {
    console.log(res[0].a); // hello
})
```

### .queue(query, [values])

Add query to queue for layer execution. Query can be a raw query string, a chained method object, or an array of either. Values can't be passed to objects or arrays (only raw strings);
```js
db.queue('SELECT 1 AS a')
  .queue('SELECT %1', [2])
  .queue('SELECT :name AS a', { name: 'hello' })
  .run(function(err, res) {
    console.log(res[0].a); // 1
    console.log(res[2].a); // hello
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
    console.log(res[0].a); // 1
    console.log(res[1].a); // 2
});
```

## Models

To map query results to a model, pass `map: true` to model options, like this:
```js
var User = db.model('users', { map: true });
```

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
console.log(user.number); // 5
console.log(user.add(5)); // 10
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
console.log(user.first);    // PETER
console.log(user.last);     // Parker
console.log(user.fullName); // PETER Parker
```

### .reload()

Reloads the model's original data.
```js
User.find(1, function(err, user) {
    user.name = 'Mark';
    console.log(user.name); // Mark
    user.reload();
    console.log(user.name); // Adam (the original)
});
```

## Query Methods:

### .all()
### .find()
### .where()
### .select()
### .order()
### .limit()
### .offset()
### .insert()
### .update()
### .remove()
