var _ = require('lodash');
var assert = require('assert');
var GCR = require('..');

var create = require('./helpers/createPG');

describe('promise', function() {

var pg = new GCR({
    adapter: "postgres",
    database: "gcr_test"
});
var Model = pg.model('test', { verbose: true });

before(create.createAndFill);
after(create.after);

describe('#parallel()', function() {
    it('should run queries in parallel', function(done) {
        pg.parallel([
            Model.find(1),
            Model.find(2)
        ]).spread(function(one, two) {
            assert(one[0].hasOwnProperty('name'));
            assert(two[0].hasOwnProperty('age'));
        }).then(done, done);
    });
});

describe('#thenOne()', function() {
    it('should return only one result', function(done) {
        Model.find(1).thenOne(function(p) {
            assert.equal(p.name, 'a');
            assert.equal(p.age, 1);
        }).then(done, done);
    });
});

describe('#thenEach()', function() {
    it('should run function on each result', function(done) {
        var count = 0;
        Model.all().thenEach(function(n) {
            count++;
        }).then(function() {
            assert(count > 2);
        }).then(done, done);
    });
});

describe('#thenMap()', function() {
    it('should map results', function(done) {
        Model.all().thenMap(function(person) {
            return person.name;
        }).then(function(res) {
            assert(_.contains(res, 'a'));
        }).then(done, done);
    });
});

});
