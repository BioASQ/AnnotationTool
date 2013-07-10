var fs         = require('fs'),
    util       = require('util'),
    step       = require('step'),
    program    = require('commander'),
    resolver   = require('./resolver');

program
    .option('-g, --golden-answers <file name>', 'JSON file with golden answers')
    .option('-s, --system-answers <file name>', 'JSON file with system answers')
    .parse(process.argv);

if (typeof program.goldenAnswers === 'undefined' || 
    typeof program.systemAnswers === 'undefined') {
    program.help();
}

try {
    var golden = JSON.parse(fs.readFileSync(program.goldenAnswers));
} catch (error) {
    process.stderr.write('Could not parse file with golden answers.\n');
    process.exit(-1);
}

try {
    var systemIn = JSON.parse(fs.readFileSync(program.systemAnswers));
} catch (error) {
    process.stderr.write('Could not parse file with system answers.\n');
    process.exit(-1);
}

var documentByURI = function (question, URI) {
    var document = null;
    question.answer.annotations.some(function (annotation) {
        if (annotation.type === 'document' &&
            annotation.uri === URI) {
            document = annotation;
            return true;
        }
    });
    return document;
};

var checkSnippet = function (question, document, snippetAnnotation) {
    var snippet;
    if (snippetAnnotation.beginSection === 'title') {
        snippet = document.title.substring(snippetAnnotation.beginIndex,
                                           snippetAnnotation.endIndex);
    } else {
        var beginSectionIndex = parseInt(snippetAnnotation.beginSection.split('.', 2)[1], 10);

        snippet = document.sections[beginSectionIndex].substring(snippetAnnotation.beginIndex,
                                                                 snippetAnnotation.endIndex);
    }

    if (snippet !== snippetAnnotation.text) {
        console.error('question: ' + question.id);
        console.error('uri: ' + document.uri);
        console.error(snippetAnnotation);
        console.error(snippet);
        console.error('-');
        console.error(snippetAnnotation.text);
        console.error('----------');
    }


    return (snippet === snippetAnnotation.text);
};

// create question index
var system = {};
systemIn.questions.forEach(function (systemQuestion) {
    system[systemQuestion.id] = system[systemQuestion.id] || [];
    system[systemQuestion.id].push(systemQuestion);
});

var authors = [
    'a.bunevicius@yahoo.com',
    'christoforos.nikolaou@gmail.com',
    'cpantos@med.uoa.gr',
    'dsanoudou@bioacademy.gr',
    'iervasi@ifc.cnr.it',
    'roderic.guigo@crg.cat',
    'samiotaki@fleming.gr',
    'skossida@bioacademy.gr',
    'toni_staykova@yahoo.co.nz',
    'vasilis.promponas@gmail.com'
];

step(
    function () {
        var questionsGroup = this.group();

        golden.filter(function (question) {
            // return true;
            return (question.creator === authors[1]);
        }).forEach(function (question, questionIndex) {
            var systemConcepts   = [],
                systemDocuments  = [],
                systemSnippets   = [],
                systemStatements = [];

            // annotations from golden answer
            question.answer.annotations = question.answer.annotations.map(function (annotation) {
                annotation.golden = true;
                if (annotation.type === 'snippet') {
                    annotation.beginSection = typeof annotation.beginSection !== 'undefined'
                                            ? annotation.beginSection
                                            : annotation.beginFieldName;
                    annotation.endSection   = typeof annotation.endSection !== 'undefined'
                                            ? annotation.endSection
                                            : annotation.endFieldName;
                    annotation.beginIndex   = typeof annotation.beginIndex !== 'undefined'
                                            ? annotation.beginIndex
                                            : annotation.offsetInBeginSection;
                    annotation.endIndex     = annotation.beginIndex + annotation.text.length;
                    delete annotation.beginFieldName;
                    delete annotation.endFieldName;

                    var document = documentByURI(question, annotation.document);
                    if (!document) {
                        console.err('Snippet annotation missing reference. Will be orgnored.');
                        return null;
                    }

                    try {
                        if (!checkSnippet(question, document, annotation)) {
                            console.error('Snippet not matching:');
                        }
                    } catch (e) {
                        console.error(e);
                        console.error(annotation);
                        console.error('-');
                        console.error(document);
                        console.error('----------');
                    }


                }
                return annotation;
            }).filter(function (annotation) { return (annotation !== null); });

            // golden ideal answer
            if (typeof question.answer.ideal !== 'undefined') {
                question.answer.ideal = [{
                    body: question.answer.ideal,
                    golden: true
                }];
            }

            system[question.id].forEach(function (mapped, systemIndex, systems) {
                if (!mapped) { return; }

                // system ideal answers
                if (typeof mapped.ideal_answer !== 'undefined') {
                    question.answer.ideal.push({
                        body: mapped.ideal_answer,
                        golden: false
                    });
                }

                // store system's exact answers as system responses
                if (typeof mapped.exact_answer !== 'undefined') {
                    question.answer.systemResponses = question.answer.systemResponses || [];
                    question.answer.systemResponses.push(mapped.exact_answer);
                }

                // reserve callback slot
                var questionCallback = questionsGroup();

                step(
                    function () {
                        var conceptGroup   = this.group(),
                            documentGroup  = this.group(),
                            snippetGroup   = this.group(),
                            statementGroup = this.group();

                        // system concepts
                        if (typeof mapped.concepts !== 'undefined') {
                            mapped.concepts.forEach(function (conceptURI) {
                                var conceptCallback = conceptGroup();
                                resolver.descriptionForConcept(conceptURI, function (err, conceptDescription) {
                                    if (err) { return conceptCallback(err); }
                                    conceptDescription.type   = 'concept';
                                    conceptDescription.golden = false;

                                    conceptCallback(null, conceptDescription);
                                });
                            });
                        }

                        // system documents
                        if (typeof mapped.documents !== 'undefined') {
                            mapped.documents.forEach(function (documentURI) {
                                var documentCallback = documentGroup();
                                resolver.descriptionForDocument(documentURI, function (err, documentDescription) {
                                    if (err) {
                                        if (err.name === 'ReferenceError') {
                                            return documentCallback();
                                        }
                                        return documentCallback(err);
                                    }
                                    documentDescription.type   = 'document';
                                    documentDescription.golden = false;

                                    documentCallback(null, documentDescription);
                                });
                            });
                        }

                        // system snippets
                        if (typeof mapped.snippets !== 'undefined') {
                            mapped.snippets.forEach(function (snippetDescription) {
                                snippetDescription.type       = 'snippet';
                                snippetDescription.golden     = false;
                                snippetDescription.beginIndex = snippetDescription.offsetInBeginSection;
                                snippetDescription.endIndex   = snippetDescription.offsetInEndSection;

                                snippetGroup()(null, snippetDescription);
                            });
                        }

                        // system statements
                        if (typeof mapped.triples !== 'undefined') {
                            mapped.triples.forEach(function (triple) {
                                var statementCallback = statementGroup();
                                resolver.descriptionForTriple(triple, function (err, statementDescription) {
                                    if (err) {
                                        if (err.name === 'ReferenceError') {
                                            process.stderr.write(util.inspect(triple));
                                            return statementCallback();
                                        } else {
                                            return statementCallback(err);
                                        }
                                    }
                                    statementDescription.type   = 'statement';
                                    statementDescription.golden = false;

                                    statementCallback(null, statementDescription);
                                });
                            });
                        }
                    },
                    function (err, concepts, documents, snippets, statements) {
                        if (err) { return questionCallback(err); }

                        // add only new system concepts
                        Array.prototype.push.apply(systemConcepts, concepts.filter(function (c) {
                            return (typeof c !== 'undefined' && !systemConcepts.some(function (sc) {
                                return (sc.uri === c.uri);
                            }));
                        }));

                        // add only new system concepts
                        Array.prototype.push.apply(systemDocuments, documents.filter(function (d) {
                            return (typeof d !== 'undefined' && !systemDocuments.some(function (sd) {
                                return (sd.uri === d.uri);
                            }));
                        }));

                        Array.prototype.push.apply(systemSnippets, snippets.map(function (annotation) {
                            annotation.beginSection = typeof annotation.beginSection !== 'undefined'
                                                    ? annotation.beginSection
                                                    : annotation.beginFieldName;
                            annotation.endSection   = typeof annotation.endSection !== 'undefined'
                                                    ? annotation.endSection
                                                    : annotation.endFieldName;
                            annotation.beginIndex   = typeof annotation.beginIndex !== 'undefined'
                                                    ? annotation.beginIndex
                                                    : annotation.offsetInBeginSection;
                            annotation.endIndex     = annotation.beginIndex + annotation.text.length;
                            delete annotation.beginFieldName;
                            delete annotation.endFieldName;
                            delete annotation.offsetInBeginSection;
                            delete annotation.offsetInEndSection;

                            return annotation;
                        }).filter(function (s) {
                            return (typeof s !== 'undefined' && !systemStatements.some(function (ss) {
                                return (ss.document     === s.document &&
                                        ss.beginSection === s.beginSection &&
                                        ss.endSection   === s.endSection &&
                                        ss.beginIndex   === s.beginIndex &&
                                        ss.endIndex     === s.endIndex);
                            }));
                        }));

                        Array.prototype.push.apply(systemStatements, statements.filter(function (s) {
                            return (typeof s !== 'undefined' && !systemStatements.some(function (ss) {
                                return (ss.s === s.s &&
                                        ss.p === s.p &&
                                        ss.o === s.o);
                            }));
                        }));

                        // last system results returned, merge system results into question
                        if (systemIndex === (systems.length - 1)) {
                            Array.prototype.push.apply(question.answer.annotations,
                                                       systemConcepts.filter(function (sc) {
                                return (!question.answer.annotations.some(function (gc) {
                                    return (gc.type === 'concept' && gc.uri === sc.uri);
                                }));
                            }));

                            Array.prototype.push.apply(question.answer.annotations,
                                                       systemDocuments.filter(function (sd) {
                                return (!question.answer.annotations.some(function (gd) {
                                    return (gd.type === 'document' && gd.uri === sd.uri);
                                }));
                            }));

                            Array.prototype.push.apply(question.answer.annotations,
                                                       systemSnippets.filter(function (ss) {
                                return (!question.answer.annotations.some(function (gs) {
                                    return (gs.document     === ss.document &&
                                            gs.beginSection === ss.beginSection &&
                                            gs.endSection   === ss.endSection &&
                                            gs.beginIndex   === ss.beginIndex &&
                                            gs.endIndex     === ss.endIndex);
                                }));
                            }));

                            Array.prototype.push.apply(question.answer.annotations,
                                                       systemStatements.filter(function (ss) {
                                return (!question.answer.annotations.some(function (gs) {
                                    return (gs.type === 'statement' &&
                                            gs.s === ss.s &&
                                            gs.p === ss.p &&
                                            gs.o === ss.o);
                                }));
                            }));

                            questionCallback(null, question);
                        } else {
                            questionCallback();
                        }
                    }
                );
            });
        });
    },
    function (err, questions) {
        if (err) {
            if (err.stack) { process.stderr.write(err.stack); }
            else { process.stderr.write(util.inspect(err)); }
            process.exit(-1);
        }

        questions = questions.filter(function (q) { return (typeof q !== 'undefined'); });
        process.stdout.write(JSON.stringify(questions, null, 4));
        process.stdout.write('\n');
        process.exit(0);
    }
);

