var program     = require('commander'),
    step        = require('step'),
    TIConcepts  = require('../lib/search').Search,
    TIDocuments = require('../lib/tidocuments').TIDocuments,
    TITriples   = require('../lib/titriples').TITriples;

var conceptSearch  = new TIConcepts(),
    documentSearch = new TIDocuments('http://www.gopubmed.org/web/gopubmedbeta/bioasq/pubmed'),
    tripleSearch   = new TITriples('http://gopubmed.org/web/bioasq/linkedlifedata2/triples');
    

program
    .option('-q, --query <query>', 'query whose results should be dumped')
    .parse(process.argv);

if (!program.query) {
    program.help();
    process.exit(-1);
}

step(
    function () {
        conceptSearch.find(program.query, this.parallel());
        documentSearch.find(program.query, 0, 10, this.parallel());
        tripleSearch.find(program.query, 0, 10, this.parallel());
    },
    function (err, concepts, documents, statements) {
        if (err) {
            process.stderr.write('Error querying: ' + err);
            process.exit(-1);
        }
        process.stdout.write(JSON.stringify({
            concepts: concepts,
            documents: documents,
            statements: statements
        }, false, 4));
        process.exit(0);
    }
);
