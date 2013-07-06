var
    TIConcepts = require('../lib/ticoncepts').TIConcepts,
    assert = require('assert'),
    util = require('util');

var services = {
    'doid': new TIConcepts('http://www.gopubmed.org/web/bioasq/doid/json'),
    'geneontology': new TIConcepts('http://www.gopubmed.org/web/bioasq/go/json'),
    'jochem': new TIConcepts('http://www.gopubmed.org/web/bioasq/jochem/json'),
    'mesh': new TIConcepts('http://www.gopubmed.org/web/bioasq/mesh/json'),
    'uniprot': new TIConcepts('http://www.gopubmed.org/web/bioasq/uniprot/json')
};

var searchTerms = [
    'http://www.disease-ontology.org/api/metadata/DOID:0080016',
    'http://www.nlm.nih.gov/cgi/mesh/2012/MB_cgi?field=uid&exact=Find+Exact+Term&term=D000927',
    'http://www.biosemantics.org/jochem#4242811',
    'http://www.uniprot.org/uniprot/CP135_HUMAN',
    'http://amigo.geneontology.org/cgi-bin/amigo/term_details?term=0043631'
];

var matchingService = function (term) {
    for (var i = 0 ; i < Object.keys(services).length; i++) {
        var key = Object.keys(services)[i];
        if (term.search(new RegExp(key, 'i')) > -1) {
            return services[key];
        }
    }
     return null;
};

var numResults = searchTerms.length;

searchTerms.forEach(function (term) {
    var service = matchingService(term);
    if (null === service) {
        console.log('No matching service found: ' + term);
        numResults--;
    } else {
        service.retrieve([term], function (err, res) {
            console.log(util.inspect(res, false, 4));
            assert.ifError(err);

            if (--numResults === 0) {
                process.exit(0);
            }
        });
    }
});

