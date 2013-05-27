var assert = require('assert');
var GCR = require('..');

describe('grand-central-records', function() {

var Model;

describe('init', function() {
    it('should fail without connection', function() {
        var Test = new GCR({}, "test");
        assert.equal(Test, "Error: No connection adapter provided");
    });

    it("should fail if adapter isn't recognized", function() {
        var Test = new GCR({
            adapter: "random"
        }, "test");
        assert.throws(Test);
    });

    it('should accept options in 2nd or 3rd param', function() {
        var Test = new GCR({ adapter: "test" }, { verbose: true });
        assert.equal(Test.verbose, true);

        Test = new GCR({ adapter: "test" }, "", { verbose: true });
        assert.equal(Test.verbose, true);

        Test = new GCR({ adapter: "test" });
        assert.equal(Test.verbose, false);
        assert.equal(Test.table, null);
    });
});

describe('models', function() {
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
    });

    it('should fail without table', function(done) {
        var Item = new GCR({ adapter: "test" });
        Item.all(function(err, res) {
            assert.throws(err);
            done();
        });
    });
});


});
