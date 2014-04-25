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

var labelCache = exports.labelCache = {};

exports.descriptionForConcept = function (conceptURI, cb) {
    if (conceptURI.uri && conceptURI.title) {
        return cb(null, conceptURI);
    }
    /*
     * // FIXME: comment out early return
     * return cb(null, { uri: conceptURI });
     */
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
    if (documentURI.uri && documentURI.title) {
        return cb(documentURI);
    }
    var pmid = documentURI.replace(/^.*[/#]/, ''),
        filePath = '/Volumes/JSON/'
                 + pmid
                 + '.json';

    fs.readFile(filePath, function (err, data) {
        if (err) {
            /*
             * // FIXME: comment out early return
             * return cb(null, { uri: documentURI });
             */
            return setTimeout(function () {
                documentsService.find(pmid + '[uid]', 0, 10, function (err, results) {
                    if (err) { return cb(err); }
                    if (!results.length) { return cb(ReferenceError('document ' + pmid + ' not found!')); }
                    return cb(null, {
                        uri: documentURI,
                        title: results[0].title,
                        abstract: results[0].abstract,
                        sections: results[0].sections
                    });
                });
            }, 1000);
        }

        var parsed = JSON.parse(data);

        cb(null, {
            uri: documentURI,
            title: parsed.title,
            abstract: parsed.documentAbstract,
            sections: parsed.sections
        });
    });
};

var tripleService = new TITriples('http://www.gopubmed.org/web/bioasq/linkedlifedata2/triples'),
    verbalizer    = new Verbalizer('http://139.18.2.164:9998/batchverbalizer');

var labelForURI = function (URI, cb) {
    if (typeof URI == 'undefined' || URI == null)
        return cb(null, '');
    var label = URI;
    if (typeof labelCache[URI] !== 'undefined' && typeof labelCache[URI][0].o !== 'undefined') {
        label = labelCache[URI][0].o;
    }

    cb(null, label.replace(/^.*[/#]/, ''));
};

exports.descriptionForTriples = function (triples, cb) {
    if (typeof triples == 'undefined' || triples === null)
        return cb(null, []);

    step(
        function () {
            var subjectGroup   = this.group(),
                predicateGroup = this.group(),
                objectGroup    = this.group();

            triples.forEach(function (t) {
                labelForURI(t.s, subjectGroup());
                labelForURI(t.p, predicateGroup());
                labelForURI(t.o, objectGroup());
            });
        },
        function (err, subjects, predicates, objects) {
            if (err) { return cb(err); }

            var params = [];
            for (var i = 0; i < subjects.length; ++i) {
                params.push({
                    s: subjects[i],
                    p: predicates[i],
                    o: objects[i]
                });
            }
            verbalizer.verbalize(params, function (err, results) {
                if (err) { return cb(err); }
                var verbalizationResult;
                try {
                    verbalizationResult = JSON.parse(results);
                    cb(null, verbalizationResult);
                } catch (e) {
                    cb(e);
                }
            });
        }
    );  // step()
};

exports.descriptionForTriple = function (triple, cb) {
    var labels = { p: triple.p.replace(/^.*[/#]/, '') };

    labelForURI(triple.s, function (err, subjectLabel) {
        labels.s = subjectLabel;
        labelForURI(triple.o, function (err, objectLabel) {
            labels.o = objectLabel;

            verbalizer.verbalize([ labels ], function (err, results) {
                if (err) { return cb(err); }
                var verbalizationResult;
                try {
                    verbalizationResult = JSON.parse(results);
                    cb(null, {
                        s: triple.s,
                        p: triple.p,
                        o: triple.o,
                        title: verbalizationResult[0]
                    });
                } catch (e) {
                    cb(e);
                }
            });
        });
    });
};
