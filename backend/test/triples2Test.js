var TITriples = require('../lib/titriples2').TITriples,
    assert = require('assert'),
    util = require('util');

var s = new TITriples('http://gopubmed.org/web/bioasq/linkedlifedata2/triples');

var queries = [
    'diabetes',
    'foxp2',
    'Sitagliptin',
    'Do erythrocytes have a nucleus?',
    'nebivolol',
    'hypertension'
];

s.find(queries[0], 0, 10, function (err, res) {
    if (err) {
        console.log(err.stack);
    } else {
        // assert.equal(res.statements.length, 10);
        console.log(util.inspect(res, false, 4));
    }
    process.exit(0);
});

