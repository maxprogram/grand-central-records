var assert = require('assert');
var GCR = require('..');


describe('postgres', function() {

var db, Model, q;

before(function() {
    db = new GCR({
        adapter: "sqlite",
        database: "test.sqlite3"
    });
    Model = db.model('test', { verbose: true });
});

after(function(done) {
    db.query('DROP TABLE test').then(db.end).fin(done);
});

describe('query', function() {
    it('should query SQLite3 engine', function(done) {
        db.queue()
        .add("CREATE TABLE test (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, age INTEGER)")
        .add("INSERT INTO test (name, age) VALUES('max', 27)")
        .run().then(function(res) {
            assert(res.length == 2);
        }).then(done, done);
    });

    it('should return correct results', function(done) {
        db.query('SELECT * FROM test')
        .then(function(res) {
            assert.equal(res[0].name, 'max');
        }).then(done, done);
    });
});

describe('#find()', function() {
    it('should query single id', function(done) {
        Model.find(1).then(function(res) {
            assert.equal(res[0].name, 'max');
        }).then(done, done);
    });
});

describe('#insert()', function() {
    it('should insert a row', function(done) {
        Model.insert({
            name: 'joe',
            age: 22
        }).then(function(id) {
            assert.equal(typeof id, 'number');
            return Model.find(id);
        }).delay(100).then(function(res) {
            assert.equal(res[0].name, 'joe');
        }).then(done, done);
    });
});

describe('#update()', function() {
    it('should update a row', function(done) {
        Model.update(1, {
            name: 'bob',
            age: 25
        }).then(function() {
            return Model.find(1);
        }).then(function(res) {
            assert.equal(res[0].name, 'bob');
        }).then(done, done);
    });
});

});
