var assert = require('assert');
var GCR = require('..');

describe('postgres', function() {

var Model;

describe('connection', function() {
    it('should connect', function() {
        Model = new GCR({
            adapter: "postgres"
        }, ":test:");
        assert(Model.engine);
    });
});

describe('#all()', function() {
    it('should query all', function(done) {
        Model.all(function(err, res) {
            assert.ifError(err);
            assert.equal("SELECT * FROM :test:", res);
            done();
        });
    });
});

describe('#find()', function() {
    it('should query single id', function(done) {
        Model.find(1, function(err, res) {
            assert.ifError(err);
            assert.equal("SELECT * FROM :test: WHERE gid IN (1)", res);
            done();
        });
    });

    it('should query array of ids', function(done) {
        Model.find([3,7,11], function(err, res) {
            assert.ifError(err);
            assert.equal("SELECT * FROM :test: WHERE gid IN (3,7,11)", res);
            done();
        });
    });
});

describe('#select()', function() {
    it('should query select string', function(done) {
        Model.select('name', function(err, res) {
            assert.ifError(err);
            assert.equal("SELECT :test:.name FROM :test:", res);
            done();
        });
    });

    it('should query select array', function(done) {
        Model.select(['name','date'], function(err, res) {
            assert.ifError(err);
            assert.equal("SELECT :test:.name, :test:.date FROM :test:", res);
            done();
        });
    });
});

describe('#where()', function() {
    it('should query where string', function(done) {
        Model.where('orders > 8', function(err, res) {
            assert.ifError(err);
            assert.equal("SELECT * FROM :test: WHERE orders > 8", res);
            done();
        });
    });

    it('should query where string with values', function(done) {
        Model.where('level = %1 AND orders > %2', ['admin',2], function(err, res) {
            assert.ifError(err);
            assert.equal("SELECT * FROM :test: WHERE level = 'admin' AND orders > 2", res);
            done();
        });
    });

    it('should query where object', function(done) {
        Model.where({ name: 'Max' }, function(err, res) {
            assert.ifError(err);
            assert.equal("SELECT * FROM :test: WHERE name = 'Max'", res);
            done();
        });
    });
});

// .order()
// .limit()
// .offset()
// .update()
// .remove()

});
