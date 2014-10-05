# Models

To map query results to a model, define a schema for default values and validations. (To map results to a model *without* a schema, just define as an empty object `schema: {}`.)

```js
var User = db.model('users', {
    schema: {
        first: String,
        last:  String,
        admin: { type: Boolean, default: false },
        group: function(val) {
            if (val % 2 !== 0) return 'must be even';
            return true;
        },
        created_at: Date,
        updated_at: Date
    }
});
```

<a name="validations" />
### Validations

* `type`: type of input
    + `String`
    + `Number`
    + `Boolean`
    + `Date`
    + `Buffer`
    + `[value1, value2, value3, ...]` list of options
    + `[String]` array of values (Postgres only)
    + `function(value){}` custom validation (returns `true` if valid, `false` or a message string if invalid)
* `default`: default value if empty
* `allowNull`: `false` requires a value (default is `true`)
* `length`: the maximum length of a string
* `max`: the maximum value of a number or length of a string
* `min`: the minimum value of a number or length of a string
* `not`: an array of incompatible values
* `match`: a RegEx the string must match

__Custom Messages (%n replaced with required value):__
* `wrongType`: message if type doesn't match
* `tooShort`: message if string/number is too low
* `tooLong`: message if string/number is too high
* `doesntMatch`: message if RegEx doesn't match
* `isNull`: message if value is empty
* `notInList`: message if value isn't in list of options
* `inList`: message if value is in list of incompatible values

<a name="newmodels" />
### Creating & updating models

Creating a new model:
```js
var tiger = Animal.new({ name: 'Tiger', type: 'cat' });

// Run validations and insert into DB:
tiger.save().then(function(err) { ... });
```

Updating a model:
```js
Animal.where({ name: 'Tiger' })
.then(function(animals) {
    animals[0].name = 'Siberian Tiger';
    // Run validations and update in DB:
    return animals[0].save();
}).fail(function(err) { ... });

// Updating bulk data
Animal.where({ name: 'Tiger' })
.then(function(animals) {
    var tiger = animals[0];
    tiger.update({ name: 'Bengal', type: 'tiger' });
    return tiger.save();
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
User.find(1).then(function(users) {
    var mark = users[0];
    mark.name = 'Markus';
    console.log(mark.name); //= Markus
    mark.reload();
    console.log(mark.name); //= Mark (the original)
});
```
