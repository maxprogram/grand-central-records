var assert = require('assert');
var GCR = require('..');

var create = require('./helpers/createPG');

var db = new GCR({
    adapter: "postgres",
    database: "gcr_test"
}, { verbose: true });
var Model = db.model('model');

describe('queue', function() {

before(create.before);
after(create.after);

    it('should execute queue queries', function() {
        var queue = db.queue()
          .add("DELETE FROM test")
          .add("INSERT INTO test (name) VALUES(%1)", ['jack'])
          .add("INSERT INTO test (name,age) VALUES(:name,6)", { name: 'sam' })
          .add("SELECT * FROM test")
          .print(' ');

        assert.equal(queue, "DELETE FROM test; INSERT INTO test (name) VALUES('jack'); " +
            "INSERT INTO test (name,age) VALUES('sam',6); " +
            "SELECT * FROM test;");
    });

    it('should queue array', function() {
        var queue = db.queue()
          .add(["SELECT 1 as a", "SELECT 2 as a"])
          .print(' ');
        assert.equal(queue, "SELECT 1 as a; SELECT 2 as a;");
    });

    it('should queue chain object', function() {
        var queue = db.queue()
          .add(Model.where({ name: 'jack' }))
          .add(Model.select('age').where({ name: 'sam' }))
          .print(' ');
        assert.equal(queue, "SELECT * FROM model WHERE name = 'jack'; SELECT model.age FROM model WHERE name = 'sam';");
    });

    it('should execute queue', function(done) {
      var q = db.queue().add('SELECT 1 AS a')
        .add('SELECT %1 AS a', [2])
        .add('SELECT :number AS a', { number: 3 })
        .add('INSERT INTO test (name) VALUES (\'queue\')')
        .add('SELECT * FROM test WHERE id = 1')
        .run().then(function(res) {
            assert.equal(res[0].a, 1); //= 1
            assert.equal(res[1].a, 2); //= 2
            assert.equal(res[2].a, 3); //= 3
            assert.equal(res[3].name, 'queue');
        }).then(done, done);
    });

});
