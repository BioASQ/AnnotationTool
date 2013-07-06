var fs   = require('fs'),
    util = require('util'),
    step = require('step');

var TIConcepts  = require('../lib/ticoncepts').TIConcepts,
    TIDocuments = require('../lib/tidocuments').TIDocuments,
    TITriples   = require('../lib/titriples2').TITriples,
    Verbalizer  = require('../lib/verbalizer').Verbalizer;

var services = {
    'doid':         new TIConcepts('http://www.gopubmed.org/web/bioasq/doid/json'),
    'geneontology': new TIConcepts('http://www.gopubmed.org/web/bioasq/go/json'),
    'jochem':       new TIConcepts('http://www.gopubmed.org/web/bioasq/jochem/json'),
    'mesh':         new TIConcepts('http://www.gopubmed.org/web/bioasq/mesh/json'),
    'uniprot':      new TIConcepts('http://www.gopubmed.org/web/bioasq/uniprot/json')
};

var matchingService = function (term) {
    for (var i = 0 ; i < Object.keys(services).length; i++) {
        var key = Object.keys(services)[i];
        if (term.search(new RegExp(key, 'i')) > -1) {
            return services[key];
        }
    }
    return null;
};

exports.descriptionForConcept = function (conceptURI, cb) {
    var service = matchingService(conceptURI);
    if (null === service) { return cb(Error('Could not match term ID to service.')); }
    service.retrieve([ conceptURI ], function (err, result) {
        if (err) { return cb(err); }
        cb(null, {
            uri: conceptURI,
            title: result.findings[0].concept.label
        });
    });
};

var documentsService = new TIDocuments('http://www.gopubmed.org/web/gopubmedbeta/bioasq/pubmed');

exports.descriptionForDocument = function (documentURI, cb) {
    var pmid = documentURI.replace(/^.*[/#]/, ''),
        filePath = '/Users/norman/Projects/BioASQ/JSON/'
                 + pmid
                 + '.json';

    fs.readFile(filePath, function (err, data) {
        if (err) {
            return documentsService.find(pmid + '[uid]', 0, 10, function (err, results) {
                if (err) { return cb(err); }
                if (!results.length) { return cb(ReferenceError('document ' + pmid + ' not found!')); }
                return cb(null, {
                    uri: documentURI,
                    title: results[0].title,
                    sections: results[0].sections
                });
            });
        }

        var parsed = JSON.parse(data);

        cb(null, {
            uri: documentURI,
            title: parsed.title,
            sections: parsed.sections
        });
    });
};

var tripleService = new TITriples('http://www.gopubmed.org/web/bioasq/linkedlifedata2/triples'),
    verbalizer    = new Verbalizer('http://139.18.2.164:9998/batchverbalizer');

exports.descriptionForTriple = function (triple, cb) {
    var searchTerms = triple.s + ' [subj] '
                    // + triple.p + ' [pred] '
                    + triple.o + ' [obj]';

    tripleService.find(searchTerms, 0, 10, function (err, triplesResult) {
        if (err) { return cb(err); }

        var labels = {};
        triplesResult.statements.forEach(function (statement) {
            if (statement.s === triple.s) { labels.s = statement.s_l; }
            if (statement.p === triple.p) { labels.p = statement.p_l; }
            if (statement.o === triple.o) { labels.o = statement.o_l; }
        });

        if (!triplesResult.statements.length) {
            labels.s = triple.s.replace(/^.*[/#]/, '');
            labels.p = triple.p.replace(/^.*[/#]/, '');
            labels.o = triple.o.replace(/^.*[/#]/, '');
        }

        cb(null, {
            s: triple.s,
            p: triple.p,
            o: triple.o,
            title: [labels.s, labels.p, labels.o ].join(' ')
        });

        /*
         * verbalizer.verbalize([ labels ], function (err, results) {
         *     if (err) { return cb(err); }
         *     var verbalizationResult;
         *     try {
         *         verbalizationResult = JSON.parse(results);
         *         cb(null, {
         *             s: triple.s,
         *             p: triple.p,
         *             o: triple.o,
         *             title: verbalizationResult[0]
         *         });
         *     } catch (e) {
         *         process.stderr.write(results);
         *     }
         * });
         */
    });
};

