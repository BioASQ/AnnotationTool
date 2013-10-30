var TITriples = require('../lib/titriples').TITriples,
    assert = require('assert'),
    util = require('util');

var s = new TITriples('http://gopubmed.org/web/bioasq/linkedlifedata2/triples');

var queries = [
    'viral KP4',
    'hypertension',
    'hypertension AND juveniles AND treatment'
];

s.find(queries[0], 0, 10, function (err, res) {
    if (err) {
        console.log(err.stack);
    } else {
        // assert.equal(res.statements.length, 10);
        console.log(util.inspect(res, false, 5));
    }
    process.exit(0);
});
