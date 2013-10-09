var assert = require('assert');
var GCR = require('..');

describe('models', function() {

var db = new GCR({ adapter: 'pg' });
var Model;

describe('', function() {
    it('should accept model in connection', function() {
        var Item = new GCR({ adapter: "test" }, "items");
        assert.equal(Item.table, "items");
    });

    it('should accept mutiple models', function() {
        var db = new GCR({ adapter: "test" }),
            Item = db.model("items"),
            Person = db.model("people");

        assert.equal(Item.table, "items");
        assert.equal(Person.table, "people");
        assert.equal(Person.adapter, "test");
        assert.ok(Person.engine);
    });

    it('should fail without table', function(done) {
        var Item = new GCR({ adapter: "test" });
        Item.all(function(err, res) {
            assert.throws(err);
            done();
        });
    });
});

var dummyData = [
    {first: "Clark", last: "Kent", age: 37, type: "Alien"},
    {first: "Bruce", last: "Wayne", age: 42}
];

describe('with map', function() {
    it('should map data to model', function() {
        Model = db.model(':test:', {
            map: true,
            data: dummyData,
            schema: {
                first: String,
                last: String,
                age: Number,
                type: {type: String, default: 'Person'}
            }
        });
        Model.all(function(err, models) {
            assert.ifError(err);
            assert.equal(models[0].id, -1);
            assert.equal(models[0]._query, 'SELECT * FROM :test:');
            assert.equal(models[1].age, 42);
            assert.equal(models[0].type, 'Alien');
            assert.equal(models[1].type, 'Person');
        });
    });

    it('should map getters', function() {
        Model._modelOps.getters = {
            fullName: function() {
                return this.first + ' ' + this.last;
            }
        };
        Model.all(function(err, models) {
            assert.ifError(err);
            assert.equal(models[0].fullName, 'Clark Kent');
        });
    });

    it('should map methods', function() {
        Model._modelOps.methods = {
            ageDifference: function(n) {
                return this.age - n;
            }
        };
        Model.all(function(err, models) {
            assert.ifError(err);
            assert.equal(models[1].ageDifference(2), 40);
        });
    });

    it('should reload data', function() {
        Model.all(function(err, models) {
            var superman = models[0];
            superman.age = 40;
            assert.equal(superman.age, 40);
            superman.reload();
            assert.equal(superman.age, 37);
        });
    });

    it('should create new model', function() {
        var spiderman = Model.new({
            first: "Peter",
            last: "Parker",
            age: 20
        });
        assert.equal(spiderman.fullName, 'Peter Parker');
        assert.equal(spiderman.ageDifference(3), 17);
    });

});

});
