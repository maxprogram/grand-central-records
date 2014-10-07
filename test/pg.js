var _ = require('lodash');
var assert = require('assert');
var GCR = require('..');

var create = require('./helpers/createPG');

describe('postgres', function() {

var pg = new GCR({
    adapter: "postgres",
    database: "gcr_test"
});
var Model = pg.model('test', { verbose: true });
var q;

before(create.before);
after(create.after);

describe('query', function() {
    it('should query PG engine', function(done) {
        pg.query("INSERT INTO test (name, age) VALUES('max', 27);")
        .then(function(res) {
            assert(!res.length);
        }).then(done, done);
    });

    it('should return correct results', function(done) {
        pg.query('SELECT * FROM test')
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
        }).then(function(res) {
            assert.equal(typeof res[0].id, 'number');
            return Model.find(res[0].id);
        }).delay(100).then(function(res) {
            assert.equal(res[0].name, 'joe');
        }).then(done, done);
    });
});

describe('#returning()', function() {
    it('should return specific column(s)', function(done) {
        Model.insert({
            name: 'bob', age: 33
        }).returning('age')
        .then(function(res) {
            assert.equal(res[0].age, 33);
        }).then(done, done);
    });

    it('shouldn\'t work with other methods', function(done) {
        Model.find(1).returning('name').then(function() {
            assert.fail(null,null,'should not run "then"');
        }).fail(function(err) {
            assert.equal(/RETURNING/.test(err), true);
            done();
        });
    });
});

describe('#save()', function() {
    it('should save an updated model', function(done) {
        Model = pg.model('test', {
            schema: {
                name: String,
                age: Number
            },
            verbose: true
        });
        Model.find(1).then(function(res) {
            max = res[0];
            max.age = 28;
            max.update({ name: 'MAX' });
            return max.save();
        }).then(function() {
            return Model.find([1]).select(['age','name']);
        }).then(function(res) {
            assert.equal(res[0].age, 28);
            assert.equal(res[0].name, 'MAX');
        }).then(done, done);
    });
});

// hstore
// Arrays

});


