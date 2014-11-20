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
        assert.equal(Test.engine.verbose, true);

        Test = new GCR({ adapter: "test" }, "", { verbose: true });
        assert.equal(Test.engine.verbose, true);

        Test = new GCR({ adapter: "test" });
        assert.equal(Test.engine.verbose, false);
        assert.equal(Test.table, null);
    });

    it('should accept different logger', function() {
        var called = false;
        var Test = new GCR({ adapter: "test" }, ':test:', {
            verbose: function(str) {
                console.log('It worked!');
                called = true;
            }
        });

        Test.sync();
        assert(called);
    });
});

});
