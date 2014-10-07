# Other functions

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

<a name="promises"/>
## Promise aliases

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

<a name="thenOne"/>
### thenOne(output)
Returns only one result instead of an array.
```js
Person.where({ name: "Tom" }).thenOne(function(tom) {
    console.log(tom.name); //= "Tom"
});
```

<a name="thenEach"/>
### thenEach(iterator)
Runs an iterator on the results; returns the results.
```js
Animal.all().thenEach(function(animal) {
    console.log(animal.name);
}).then(function(animals) {...});
```

<a name="thenMap"/>
### thenMap(iterator)
Maps an iterator to the results; returns mapped array.
```js
Planes.where({ type: "propeller" }).thenMap(function(plane) {
    return plane.name;
});
```


