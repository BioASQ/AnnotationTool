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
    'hypertension',
    'http://linkedlifedata.com/resource/umls/id/C0178648 [subj] AND http://linkedlifedata.com/resource/umls/altMetaMap [pred] AND http://linkedlifedata.com/resource/umls/label/A7570743 [obj]',
    'http://www4.wiwiss.fu-berlin.de/diseasome/resource/diseases/3817 [subj] AND http://www4.wiwiss.fu-berlin.de/diseasome/resource/chromosomalLocation/22q13 [obj]'
];

s.find(queries[7], 0, 10, function (err, res) {
    if (err) {
        console.log(err.stack);
    } else {
        // assert.equal(res.statements.length, 10);
        console.log(util.inspect(res, false, 4));
    }
    process.exit(0);
});

