var fs      = require('fs'),
    path    = require('path'),
    util    = require('util'),
    lazy    = require('lazy'),
    step    = require('step'),
    program = require('commander');

var TITriples = require('../lib/titriples2').TITriples;

var labelPredicates = [
    'http://data.linkedct.org/resource/linkedct/acronym',
    'http://purl.uniprot.org/core/alias',
    'http://purl.uniprot.org/core/alternativeName',
    'http://purl.uniprot.org/core/commonName',
    'http://purl.uniprot.org/core/fullName',
    'http://purl.uniprot.org/core/name',
    'http://purl.uniprot.org/core/orfName',
    'http://purl.uniprot.org/core/otherName',
    'http://purl.uniprot.org/core/recommendedName',
    'http://purl.uniprot.org/core/scientificName',
    'http://purl.uniprot.org/core/shortName',
    'http://purl.uniprot.org/core/submittedName',
    'http://purl.uniprot.org/core/synonym',
    'http://www.w3.org/2000/01/rdf-schema#label',
    'http://www.w3.org/2004/02/skos/core#altLabel',
    'http://www.w3.org/2004/02/skos/core#broadSynonym',
    'http://www.w3.org/2004/02/skos/core#narrowSynonym',
    'http://www.w3.org/2004/02/skos/core#prefLabel',
    'http://www.w3.org/2004/02/skos/core#relatedSynonym',
    'http://www.w3.org/2008/05/skos-xl#altLabel',
    'http://www.w3.org/2008/05/skos-xl#literalForm',
    'http://www.w3.org/2008/05/skos-xl#prefLabel',
    'http://www4.wiwiss.fu-berlin.de/diseasome/resource/diseasome/name',
    'http://www4.wiwiss.fu-berlin.de/drugbank/resource/drugbank/brandName',
    'http://www4.wiwiss.fu-berlin.de/drugbank/resource/drugbank/chemicalIupacName',
    'http://www4.wiwiss.fu-berlin.de/drugbank/resource/drugbank/geneName',
    'http://www4.wiwiss.fu-berlin.de/drugbank/resource/drugbank/genericName',
    'http://www4.wiwiss.fu-berlin.de/drugbank/resource/drugbank/interactionInsert',
    'http://www4.wiwiss.fu-berlin.de/drugbank/resource/drugbank/name',
    'http://www4.wiwiss.fu-berlin.de/drugbank/resource/drugbank/pdbId',
    'http://www4.wiwiss.fu-berlin.de/drugbank/resource/drugbank/primaryAccessionNo',
    'http://www4.wiwiss.fu-berlin.de/drugbank/resource/drugbank/secondaryAccessionNumber',
    'http://www4.wiwiss.fu-berlin.de/drugbank/resource/drugbank/swissprotName',
    'http://www4.wiwiss.fu-berlin.de/drugbank/resource/drugbank/synonym'
];

program
    .option('-u, --uris <file name>', 'text file with URIs to dereference')
    .parse(process.argv);

if (typeof program.uris === 'undefined') {
    program.help();
}

var stream = fs.createReadStream(program.uris),
    tiservice = new TITriples('http://www.gopubmed.org/web/bioasq/linkedlifedata2/triples');


lazy(stream).lines.join(function (buffers) {
    step(
        function () {
            var uriGroup    = this.group(),
                resultGroup = this.group();
            buffers.forEach(function (uriBuffer) {
                var uri = String(uriBuffer);
                uriGroup()(null, uri);
                tiservice._dereferenceTitle(uri, resultGroup());
            });
        },
        function (err, uris, results) {
            var cache = {};
            for (var i = 0; i < results.length; i++) {
                for (var j = 0; j < results[i].length; j++) {
                    var uri    = uris[i],
                        triple = results[i][j];

                    if (triple.subj === uri) {
                        cache[uri] = cache[uri] || [];
                        cache[uri].push({ p: triple.pred, o: triple.obj });
                    }
                }
            }
            process.stdout.write(JSON.stringify(cache, false, 4));
            process.stdout.write('\n');
            process.exit(0);
        }
    );
});
