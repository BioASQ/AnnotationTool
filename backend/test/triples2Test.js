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
    'http://linkedlifedata.com/resource/umls/label/A17681489[subj] AND (http://data.linkedct.org/resource/linkedct/acronym[pred] OR http://purl.uniprot.org/core/alias[pred] OR http://purl.uniprot.org/core/alternativeName[pred] OR http://purl.uniprot.org/core/commonName[pred] OR http://purl.uniprot.org/core/fullName[pred] OR http://purl.uniprot.org/core/name[pred] OR http://purl.uniprot.org/core/orfName[pred] OR http://purl.uniprot.org/core/otherName[pred] OR http://purl.uniprot.org/core/recommendedName[pred] OR http://purl.uniprot.org/core/scientificName[pred] OR http://purl.uniprot.org/core/shortName[pred] OR http://purl.uniprot.org/core/submittedName[pred] OR http://purl.uniprot.org/core/synonym[pred] OR http://www.w3.org/2000/01/rdf-schema#label[pred] OR http://www.w3.org/2004/02/skos/core#altLabel[pred] OR http://www.w3.org/2004/02/skos/core#broadSynonym[pred] OR http://www.w3.org/2004/02/skos/core#narrowSynonym[pred] OR http://www.w3.org/2004/02/skos/core#prefLabel[pred] OR http://www.w3.org/2004/02/skos/core#relatedSynonym[pred] OR http://www.w3.org/2008/05/skos-xl#altLabel[pred] OR http://www.w3.org/2008/05/skos-xl#literalForm[pred] OR http://www.w3.org/2008/05/skos-xl#prefLabel[pred] OR http://www4.wiwiss.fu-berlin.de/diseasome/resource/diseasome/name[pred] OR http://www4.wiwiss.fu-berlin.de/drugbank/resource/drugbank/brandName[pred] OR http://www4.wiwiss.fu-berlin.de/drugbank/resource/drugbank/chemicalIupacName[pred] OR http://www4.wiwiss.fu-berlin.de/drugbank/resource/drugbank/geneName[pred] OR http://www4.wiwiss.fu-berlin.de/drugbank/resource/drugbank/genericName[pred] OR http://www4.wiwiss.fu-berlin.de/drugbank/resource/drugbank/interactionInsert[pred] OR http://www4.wiwiss.fu-berlin.de/drugbank/resource/drugbank/name[pred] OR http://www4.wiwiss.fu-berlin.de/drugbank/resource/drugbank/pdbId[pred] OR http://www4.wiwiss.fu-berlin.de/drugbank/resource/drugbank/primaryAccessionNo[pred] OR http://www4.wiwiss.fu-berlin.de/drugbank/resource/drugbank/secondaryAccessionNumber[pred] OR http://www4.wiwiss.fu-berlin.de/drugbank/resource/drugbank/swissprotName[pred] OR http://www4.wiwiss.fu-berlin.de/drugbank/resource/drugbank/synonym[pred])'
];

s.find(queries[6], 0, 10, function (err, res) {
    if (err) {
        console.log(err.stack);
    } else {
        // assert.equal(res.statements.length, 10);
        console.log(util.inspect(res, false, 4));
    }
    process.exit(0);
});

