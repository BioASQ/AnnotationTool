var
    Search = require('../lib/search').Search,
    assert = require('assert'),
    util = require('util');

var s = new Search();

var searchTerms = [
    'diabetes AND hypertension',
    '"polymerase chain reaction"'
];

s.find(searchTerms[1], function (err, res) {
    console.log(res);
    assert.ifError(err);
    process.exit(0);
});
