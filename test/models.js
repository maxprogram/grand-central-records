var assert = require('assert');
var GCR = require('..');

describe('models', function() {

var db = new GCR({ adapter: 'test' });
var Model;
var schema = {
    first: String,
    last: {
        type: String,
        length: 15,
        allowNull: false
    },
    age: {
        type: Number,
        min: 10,
        not: [18,19]
    },
    type: {
        type: ['Person','Superhero'],
        default: 'Person',
        notInList: 'needs to be a Person or Superhero!'
    }
};

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
        Item.all().fin(done).fail(function(err) {
            assert(err);
        });
    });
});

var dummyData = [
    {first: "Clark", last: "Kent", age: 37, type: "Alien"},
    {first: "Bruce", last: "Wayne", age: 42}
];

describe('with map', function() {
    it('should map data to model', function(done) {
        Model = db.model(':test:', {
            data: dummyData,
            schema: schema
        });
        Model.all().then(function(models) {
            assert.equal(models[0].id, -1);
            assert.equal(models[0]._query, 'SELECT * FROM :test:');
            assert.equal(models[1].age, dummyData[1].age);
            assert.equal(models[0].type, dummyData[0].type);
            assert.equal(models[1].type, dummyData[1].type);
        }).then(done, done);
    });

    it('should map getters', function(done) {
        Model._model.getters = {
            fullName: function() {
                return this.first + ' ' + this.last;
            }
        };
        Model.all().then(function(models) {
            assert.equal(models[0].fullName, dummyData[0].first + ' ' + dummyData[0].last);
        }).then(done, done);
    });

    it('should map methods', function(done) {
        Model._model.methods = {
            ageDifference: function(n) {
                return this.age - n;
            }
        };
        Model.all().then(function(models) {
            assert.equal(models[1].ageDifference(2), dummyData[1].age - 2);
        }).then(done, done);
    });

    it('should reload data', function(done) {
        Model.all().then(function(models) {
            var superman = models[0];
            superman.age = 40;
            assert.equal(superman.age, 40);
            superman.reload();
            assert.equal(superman.age, 37);
        }).then(done, done);
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

    it('should validate data', function() {
        var spiderman = Model.new({
            first: "Peter",
            last: "Parker78910111213",
            //age: 20
        });

        var val = spiderman.validate();
        assert.equal(val.last, "should not be more than 15 characters");

        spiderman.last = null;
        val = spiderman.validate();
        assert.equal(val.last, "shouldn't be empty");

        spiderman.age = 8;
        val = spiderman.validate();
        assert.equal(val.age, "should be at least 10");

        spiderman.age = 18;
        val = spiderman.validate();
        assert.equal(val.age, "shouldn't be included in: 18, 19");

        spiderman.type = 'Place';
        val = spiderman.validate();
        assert.equal(val.type, 'needs to be a Person or Superhero!');
    });

});

});
