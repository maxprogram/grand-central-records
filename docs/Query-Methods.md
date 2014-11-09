# Query Methods

<a name="all"/>
### all(callback)

Gets all table rows (`SELECT * FROM table`).

<a name="find"/>
### find(ids, [callback])

* __ids__ `int` `int[]` — The ID, or an array of IDs, of the row(s) to return.
* __callback(err, rows)__ — Optional callback to run the query.

```js
Animal.find(88).then(function(animals) {
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

* __fields__ `string` `string[]` `object` — An array of field names, comma-separated string of field names, or object in the form of `{ alias: 'field_name' }`.
* __callback(err, rows)__ — Optional callback to run the query.

```js
Book.select("author");
Book.select("author, publisher");
Book.select(["author", "publisher", "title"]);
Book.select({ pub: "publisher" });
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
