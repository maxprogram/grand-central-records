var assert = require('assert');
var GCR = require('..');

describe('postgres', function() {

var Model, pg, q;

before(function() {
    // Must have database 'gcr_test' on localhost
    // with owner 'postgres'
    //
    // psql -h localhost
    // CREATE USER postgres SUPERUSER;
    // CREATE DATABASE gcr_test WITH OWNER postgres;

    pg = new GCR({
        adapter: "postgres",
        database: "gcr_test"
    });
    Model = pg.model('test');
});

after(function(done) {
    pg.query('DROP TABLE IF EXISTS test', function(err){
        if (err) throw err;
        done();
    });
});

describe('query', function() {
    it('should query PG engine', function(done) {
        q = 'CREATE TABLE IF NOT EXISTS test ' +
            '(gid serial NOT NULL, name text, age integer);' +
            "DELETE FROM test;" +
            "INSERT INTO test (name, age) VALUES('max', 27);";
        pg.query(q, function(err, res) {
            assert.ifError(err);
            assert(!res.length);
            done();
        });
    });

    it('should return correct results', function(done) {
        q = 'SELECT * FROM test';
        pg.query(q, function(err, res) {
            assert.ifError(err);
            assert.equal(res[0].name, 'max');
            done();
        });
    });
});

describe('connection', function() {
    it('should connect', function() {
        Model = new GCR({
            adapter: "postgres"
        }, ":test:", {idAttribute: 'gid'});
        assert(Model.engine);
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
});

// .returning()
// hstore
// Arrays

});
