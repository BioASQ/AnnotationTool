var TITriples = require('../lib/titriples').TITriples,
    assert = require('assert'),
    util = require('util');

var s = new TITriples('http://gopubmed.org/web/bioasq/linkedlifedata/triples');

var queries = [
    'diabetes',
    'foxp2',
    'Sitagliptin',
    'Do erythrocytes have a nucleus?'
];

s.find(queries[3], function (err, res) {
    if (err) {
        console.log(err);
    } else {
        console.log(res);
    }
    process.exit(0);
});

