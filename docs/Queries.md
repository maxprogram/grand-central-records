# Raw Queries

<a name="query" />
### query(query, [values], callback)

Execute raw query to database.

```js
db.query('SELECT 1 AS a').then(function(res) {
    console.log(res[0].a); //= 1
});

// Substitute with array of values
db.query('SELECT 1 AS a; SELECT %1 AS a;', ['hello'])
.then(function(res) {
    console.log(res[0].a); //= 1
    console.log(res[1].a); //= hello
});

// Substitute with key/values
db.query('SELECT :name AS a', { name: 'hello' })
.then(function(res) {
    console.log(res[0].a); //= hello
})
```

<a name="queue" />
### queue()

Add query to queue for later execution. Query can be a raw query string, a chained method object, or an array of either. Values can't be passed to objects or arrays (only raw strings);

#### queue.add(query, [values])
* **query** `string` `chain object` `queue object` 
* **[values]** `array` `object` — Optional values to substitute into query

#### queue.toString([separator]) || queue.print() || queue.get()
* **[separator]** `string` — Optional string to separate queries.

#### queue.run()

#### queue.map(iterator)
* **iterator** `function` — Iterator function to map query results.

Examples:
```js
var queue = db.queue();

queue.add('SELECT 1 AS a')
.add('SELECT %1 AS a', [2])
.add('SELECT :number AS a', { number: 3 })
.run().then(function(res) {
    console.log(res[0].a); //= 1
    console.log(res[1].a); //= 2
    console.log(res[2].a); //= 3
});

queue.add(Model.find(1))
.add(Model.select('name').limit(1))
.run().then(function(res) {
    console.log(res[0]); // (row with ID of 1)
    console.log(res[1]); // (first row with only name column)
});

queue.add(['SELECT 1 AS a', 'SELECT 2 AS a']);
. . .
console.log(queue.print()); //= "SELECT 1 AS a; SELECT 2 AS a;"
queue.run().then(function(res) {
    console.log(res[0].a); //= 1
    console.log(res[1].a); //= 2
}).catch(console.error);

// Add custom mapping function for results
queue.add(...).map(function(row) {
    return row.id;
}).run();
```