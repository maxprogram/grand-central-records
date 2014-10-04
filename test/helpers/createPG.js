var GCR = require('../..');

exports.before = function(done) {
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

    pg.query('CREATE TABLE IF NOT EXISTS test ' +
        '(id serial NOT NULL, name text, age integer);' +
        "DELETE FROM test;")
    .fin(done);
};

exports.after = function(done) {
    pg.query('DROP TABLE IF EXISTS test')
    .fin(done);
};
