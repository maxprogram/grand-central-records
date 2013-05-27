
var ORM = require('./');

var PGModel = new ORM({
    adapter: "pg",
    host: "54.245.88.44",
    database: "postgis",
    username: "postgres",
    password: "historybluelionjump"
}, "thisisatest", {verbose: true});

var SQLModel = new ORM({
    adapter: "mysql",
    host: "dev.clkmgruzptvv.us-east-1.rds.amazonaws.com",
    database: "atlastory",
    username: "maxprogram",
    password: "historyredtigerjump"
}, "maps", {verbose: true});
/*
var SQLiteModel = new ORM({
    adapter: "sqlite3",
    host: "",
    database: "test.sqlite3",
    username: "",
    password: ""
}, "test", {verbose: true});

var model = SQLiteModel.new();

SQLiteModel.sync({name: "text"}, function(err, res) {
    if (err) throw err;
    console.log(JSON.stringify(res, null, 2));
});*/


PGModel.where({name: 'update'}, function(err, res) {
    if (err) throw err;
    console.log(JSON.stringify(res, null, 2));
});


/*
    * .all()    x
    * .find()   x
    * .find([]) x
    * .select() x
    * .where()  x
    * .order()  x
    * .limit()  x
    * .offset() x
    * .insert() x
    * .update() x
    * .remove() x
*/
