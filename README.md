# Grand Central Records (GCR)

[![Gitter](https://badges.gitter.im/Join%20Chat.svg)](https://gitter.im/maxprogram/grand-central-records?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)

[![Build Status](https://travis-ci.org/maxprogram/grand-central-records.png?branch=master)](https://travis-ci.org/maxprogram/grand-central-records)
[![NPM version](https://badge.fury.io/js/grand-central-records.svg)](http://badge.fury.io/js/grand-central-records)

A promise-based Node ORM/ActiveRecord library that can connect to MySQL, Postgres, and SQLite3. Allows chainable, raw or queueable queries.

---------------------------------------
## Getting started

<a name="gcr" />
### new GCR(connection, [table], [options])

```js
var GCR = require('grand-central-records');

var Model = new GCR({
    adapter: "mysql",
    host: "localhost",
    database: "test",
    username: "admin",
    password: "admin"
}, "users");

Model.find(8).then(function(users) {
    console.log(users[0].name);
}).catch(console.error);

Model.select(["name","address"]).where({admin: true})
.then(function(result) {
    result.forEach(function(user) { ... });
});
```

Creating a new instance of the GCR object creates a connection to a new database.

* __connection__ `object` — Database connection parameters.
    * *adapter* — mysql/MySQL, postgresql/postgres/pg, sqlite3/sqlite
    * *host*, *database*, *username*, *password* — connection parameters
* __table__ `string` — An optional table name if only a single table is being queried.
* __options__ `object` — Options to pass to the model.
    * *verbose* `boolean` `function` —  Turning verbose on will log all queries to the console. `false` by default. If a function is provided, it will be used to log all outputs.
    * *idAttribute* `string` — The name of the unique ID attribute field (defaults to `'id'`).
    * (see [Models](./docs/Models.md#models))

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

---------------------------------------
# Documentation

### Getting started

* [GCR()](#gcr)
* [model()](#model)

### Raw queries

* [query()](./docs/Queries.md#query)
* [queue()](./docs/Queries.md#queue)

### Models

* [Models](./docs/Models.md#models)
* [Validations](./docs/Models.md#validations)
* [Creating & Updating Models](./docs/Models.md#newmodels)
* [Expansion of models](./docs/Models.md#expansion)
* [reload()](./docs/Models.md#reload)

### Other functions

* [setTable](./docs/Other.md#setTable)
* [addGetter](./docs/Other.md#addGetter)
* [addMethod](./docs/Other.md#addMethod)
* [addQueryMethod](./docs/Other.md#addQueryMethod)
* [Promise aliases](./docs/Other.md#promises)
    - [parallel](./docs/Other.md#parallel)
    - [thenOne](./docs/Other.md#thenOne)
    - [thenEach](./docs/Other.md#thenEach)
    - [thenMap](./docs/Other.md#thenMap)

### Query methods

* [all()](./docs/Query-Methods.md#all)
* [find()](./docs/Query-Methods.md#find)
* [where()](./docs/Query-Methods.md#where)
* [select()](./docs/Query-Methods.md#select)
* [order()](./docs/Query-Methods.md#order)
* [limit()](./docs/Query-Methods.md#limit)
* [offset()](./docs/Query-Methods.md#offset)
* [insert()](./docs/Query-Methods.md#insert)
* [update()](./docs/Query-Methods.md#update)
* [remove()](./docs/Query-Methods.md#remove)

#### Postgres

* [end()](./docs/Postgres.md#end)
* [Query: returning()](./docs/Postgres.md#returning)
* [Data type: Array](./docs/Postgres.md#array)
* [Data type: hstore](./docs/Postgres.md#hstore)

---------------------------------------
### Inspiration

* [JugglingDB](https://github.com/1602/jugglingdb)
* [Node-ORM](https://github.com/dresende/node-orm2)
* [Model](https://npmjs.org/package/model)
* [Persist](https://npmjs.org/package/persist)
* [Mongoose](https://npmjs.org/package/mongoose)


