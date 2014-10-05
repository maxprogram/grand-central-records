# Other functions

<a name="parallel"/>
### parallel(queries)

An alias for Q's 'all': executes an array of query chains in parallel.
```js
db.parallel([
    Model.find(52),
    Model.where({ type: 2 })
]).done(function(res) {
    // do something...
}).fail(function(err) {...});
```

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

<a name="addQueryMethod"/>
### addQueryMethod(name, fn, [map])

* **name** `string` — name of the custom method (called with `db[name]()`)
* **fn** `function` — a function that returns a query (either a *string*, *query chain*, or *queue object*)
* **[map]** `function` — an optional function to map the results to (called per iteration)

```js
Model.addQueryMethod("nameFromJob", function(job) {
    return Model.select("name").where({ job: job });
}, function(row) {
    return row.name;
});
```
