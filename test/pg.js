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

    it('should execute queue queries', function(done) {
        pg.verbose = true;
        pg.queue("DELETE FROM test")
          .queue("INSERT INTO test (name) VALUES(%1)", ['jack'])
          .queue("INSERT INTO test (name,age) VALUES(:name,6)", {name: 'sam'})
          .queue("SELECT * FROM test")
          .run(function(err, res) {
            assert.ifError(err);
            assert.equal(res.length, 2);
            assert.equal(res[0].name, 'jack');
            assert.equal(res[1].name, 'sam');
            done();
          });
    });

    it('should return multiple results', function(done) {
        pg.queue("SELECT name FROM test")
          .queue("SELECT age FROM test WHERE name = 'sam'")
          .run(function(err, res) {
            assert.equal(res[0].name, 'jack');
            assert.equal(res[2].age, 6);
            done();
          });
    });
});

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
