var assert = require('assert');
var GCR = require('..');

var Model, q;

before(function() {
    Model = new GCR({
        adapter: "postgres"
    }, ":test:");
});

describe('query chain', function() {

describe('#all()', function() {
    it('should query all', function() {
        q = Model.all();
        assert.equal("SELECT * FROM :test:", q+'');
    });
});

describe('#find()', function() {
    it('should query single id', function() {
        q = Model.find(1);
        assert.equal("SELECT * FROM :test: WHERE id IN (1)", q+'');
    });

    it('should query array of ids', function() {
        q = Model.find([3,7,11]);
        assert.equal("SELECT * FROM :test: WHERE id IN (3,7,11)", q+'');
    });
});

describe('#select()', function() {
    it('should query select string', function() {
        q = Model.select('name');
        assert.equal("SELECT :test:.name FROM :test:", q+'');
    });

    it('should query select array', function() {
        q = Model.select(['name','date']);
        assert.equal("SELECT :test:.name, :test:.date FROM :test:", q+'');
    });
});

describe('#where()', function() {
    it('should query where string', function() {
        q = Model.where('orders > 8');
        assert.equal("SELECT * FROM :test: WHERE orders > 8", q+'');
    });

    it('should query where string with values', function() {
        q = Model.where('level = %1 AND orders > %2', ['admin',2]);
        assert.equal("SELECT * FROM :test: WHERE level = 'admin' AND orders > 2", q+'');
    });

    it('should query where object', function() {
        q = Model.where({
            name: 'Max',
            id: [5, 16],
            order: Model.select('id').limit(1)
        });
        assert.equal("SELECT * FROM :test: WHERE name = 'Max' AND " +
            "id IN (5,16) AND order = (SELECT :test:.id FROM :test: LIMIT 1)", q+'');
    });
});

describe('#order(), #limit(), #offset()', function() {
    it('should output order', function() {
        q = Model.order('size ASC');
        assert.equal("SELECT * FROM :test: ORDER BY :test:.size ASC", q+'');
        q = Model.order('size ASC, color DESC');
        assert.equal("SELECT * FROM :test: ORDER BY :test:.size ASC, :test:.color DESC", q+'');
        q = Model.order(['size', 'color'])
        assert.equal("SELECT * FROM :test: ORDER BY :test:.size, :test:.color", q+'');
        q = Model.orderDesc(['color'])
        assert.equal("SELECT * FROM :test: ORDER BY :test:.color DESC", q+'');
    });

    it('should output limit', function() {
        q = Model.limit(5);
        assert.equal("SELECT * FROM :test: LIMIT 5", q+'');
    });

    it('should output offset', function() {
        q = Model.offset(3);
        assert.equal("SELECT * FROM :test: OFFSET 3", q+'');
    });
});

describe('#insert()', function() {
    it('should output insert', function() {
        q = Model.insert({ type: 'product', category: 42 });
        assert.equal(q+'', "INSERT INTO :test: (type,category) VALUES ('product',42) RETURNING id");
    });

    it('should output multiple inserts', function() {
        q = Model.insert([
            { category: 42 },
            { type: 'babelfish' }
        ]);
        assert.equal(q+'', "INSERT INTO :test: (category,type) VALUES (42,NULL), (NULL,'babelfish') RETURNING id");
    });

    it('should output subquery insert', function() {
        q = Model.insert(Model.limit(1));
        assert.equal(q+'', "INSERT INTO :test: (SELECT * FROM :test: LIMIT 1) RETURNING id");
    });
});

describe('#update()', function() {
    it('should output update', function() {
        q = Model.update(5, { category: 88 });
        assert.equal(q+'', "UPDATE :test: SET (category) = (88) WHERE id IN (5)");
    });

    it('should output update with where()', function() {
        q = Model.update({ category: 88 }).where({ name: 'max' });
        assert.equal(q+'', "UPDATE :test: SET (category) = (88) WHERE name = 'max'");
    });
});

describe('#remove()', function() {
    it('should output remove', function() {
        q = Model.remove(1);
        assert.equal(q+'', "DELETE FROM :test: WHERE id IN (1)");
    });

    it('should output remove with where()', function() {
        q = Model.where({ type: 'loneliest' }).remove();
        assert.equal(q+'', "DELETE FROM :test: WHERE type = 'loneliest'");
    });

    it('should fail without where()', function() {
        q = Model.remove();
        assert(/##/.test(q+''));
    });
});

});
