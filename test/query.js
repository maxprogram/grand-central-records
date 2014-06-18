var assert = require('assert');
var GCR = require('..');

var Model, db;

before(function() {
    db = new GCR({
        adapter: "postgres"
    }, { verbose: true });
    Model = db.model('model');
});

describe('query', function() {

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

});
