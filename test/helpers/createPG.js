var GCR = require('../..');

var pg = new GCR({
    adapter: "postgres",
    database: "gcr_test"
});

exports.before = function(done) {
    // Must have database 'gcr_test' on localhost
    // with owner 'postgres'
    //
    // psql -h localhost
    // CREATE USER postgres SUPERUSER;
    // CREATE DATABASE gcr_test WITH OWNER postgres;

    return pg.query('CREATE TABLE IF NOT EXISTS test ' +
        '(id serial NOT NULL, name text, age integer);' +
        "DELETE FROM test;")
    .fin(done);
};

exports.after = function(done) {
    return pg.query('DROP TABLE IF EXISTS test')
    .fin(done);
};

var data = [
    { name: 'a', age: 1 },
    { name: 'b', age: 2 },
    { name: 'c', age: 3 },
    { name: 'd', age: 4 },
];

exports.createAndFill = function(done) {
    var Test = pg.model("test");
    return exports.before(done).then(function() {
        return Test.insert(data);
    });
};
