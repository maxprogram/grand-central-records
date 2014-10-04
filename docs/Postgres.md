# Postgres

<a name="end" />
### db.end()

Ends the Postgres pool connection. Connection will end automatically after 4 seconds if no queries are running. (Otherwise a new connection begins when a query is run.)

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
