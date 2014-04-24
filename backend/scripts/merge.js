var fs       = require('fs'),
    util     = require('util'),
    assert   = require('assert'),
    step     = require('step'),
    program  = require('commander'),
    funcs    = require('./funcs'),
    resolver = require('./resolver');

program
    .option('-g, --golden-answers <file name>', 'JSON file with golden answers')
    .option('-s, --system-answers <file name>', 'JSON file or directory with JSON files containing system answers')
    .option('-c, --common-questions [file name]', 'JSON file with common questions')
    .option('-m, --common-map [file name]', 'JSON file mapping each question ID to its common counterpart')
    .option('-u, --filter-user [user ID]', 'Only write question for a certain user ID')
    .option('-q, --filter-question [question ID]', 'Only write question with ID')
    .option('-l, --label-cache [file name]', 'JSON file with labels')
    .option('-p, --print-uris', 'Only write URIs in requested statements to stdout')
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

var common = {}, commonMap = {};
if (program.commonQuestions) {
    try {
        common = JSON.parse(fs.readFileSync(program.commonQuestions));
        common.forEach(function (commonQuestion) {
            if (!golden.some(function (goldenQuestion) {
                return (goldenQuestion._id === commonQuestion._id);
            })) {
                golden.push(commonQuestion);
            }
        });
        commonMap = JSON.parse(fs.readFileSync(program.commonMap));
    } catch (error) {
        process.stderr.write('Could not parse file with common questions.\n');
    }
}

// create question index
var system = {};
var stats = fs.statSync(program.systemAnswers),
    files = [];
if (stats.isDirectory()) {
    files = funcs.recursiveFilesWithExtension(program.systemAnswers, '.json');
} else {
    files = [ program.systemAnswers ];
}
files.forEach(function (filePath) {
    try {
        var fileData = String(fs.readFileSync(filePath)).replace(/\\\//g, '/');
        funcs.addSystemAnswers(JSON.parse(fileData), filePath, system);
    } catch (e) {
        console.error('Could not read JSON file `' + filePath + '` (' + e + ')');
    }
});

if (program.printUris) {
    var uris = {};
    golden.forEach(function (question) {
        var questionID = question._id;
        if (system[questionID]) {
            system[questionID].forEach(function (response) {
                if (typeof response.triples !== 'undefined') {
                    response.triples.forEach(function (t) {
                        uris[t.s] = true;
                        if (t.o.search(/^(https?|mailto|tel|urn):/) === 0) {
                            uris[t.o] = true;
                        }
                    });
                }
            });
        }
    });

    process.stdout.write(Object.keys(uris).join('\n'));
    process.stdout.write('\n');
    process.exit(0);
}

if (typeof program.labelCache !== 'undefined') {
    resolver.labelCache = JSON.parse(fs.readFileSync(program.labelCache));
}

step(
    function () {
        var questionsGroup = this.group();

        golden.filter(function (question) {
            if (typeof program.filterUser !== 'undefined') {
                return (question.creator === program.filterUser);
            } else if (typeof program.filterQuestion !== 'undefined') {
                return (question._id === program.filterQuestion);
            } else {
                return true;
            }
        }).forEach(function (question, questionIndex) {
            // reserve callback slot
            var questionCallback = questionsGroup();

            // unfinalize for assessment
            question.finalized = false;

            question.concepts = question.concepts.map(function (c) {
                c.golden = true;
                return c;
            }).filter(funcs.nonNull);

            question.documents = question.documents.map(function (d) {
                d.golden = true;
                return d;
            }).filter(funcs.nonNull);

            question.statements = question.statements.map(function (s) {
                s.golden = true;
                return s;
            }).filter(funcs.nonNull);

            // annotations from golden answer
            question.snippets = question.snippets.map(function (snippet) {
                snippet = funcs.fixSnippetSyntax(snippet, true);

                var document = funcs.documentByURI(question, snippet.document);
                if (!document) {
                    console.error('Snippet annotation missing reference. Will be ignored.');
                    return null;
                }

                if (!funcs.checkSnippet(question, document, snippet)) {
                    funcs.fixSnippet(question, document, snippet);
                    if (!funcs.checkSnippet(question, document, snippet)) {
                        console.error('Snippet not matching');
                        console.error(snippet);
                        console.error('-');
                        console.error(document);
                        console.error('----------');
                    }
                }

                return snippet;
            }).filter(funcs.nonNull);

            // golden ideal answer
            if (typeof question.answer.ideal !== 'undefined') {
                question.answer.ideal = [{
                    body: question.answer.ideal,
                    source: 'expert',
                    golden: true
                }];
            }

            if (commonMap[question._id]) {
                common.filter(function (q) {
                    return (q._id == commonMap[question._id]);
                }).forEach(function (commonQuestion) {
                    var buf = new Buffer(commonQuestion.creator);
                    funcs.addIdealAnswer({
                        ideal_answer: commonQuestion.answer.ideal,
                        systemName: buf.toString('base64')
                    }, question);
                });
            }

            var systemConcepts   = {},
                systemDocuments  = {},
                systemSnippets   = [],
                systemStatements = [];

            if (system[question._id]) {
                system[question._id].forEach(function (mapped, systemIndex, systems) {
                    if (!mapped) { return; }
                    funcs.addIdealAnswer(mapped, question);
                    funcs.addExactSystemResponses(mapped, question);
                    funcs.addSystemConcepts(mapped, question, systemConcepts);
                    funcs.addSystemDocuments(mapped, question, systemDocuments);
                    funcs.addSystemSnippets(mapped, question, systemSnippets);
                    funcs.addSystemStatements(mapped, question, systemStatements);
                });
            }

            if (system[commonMap[question._id]]) {
                system[commonMap[question._id]].forEach(function (mapped) {
                    funcs.addIdealAnswer(mapped, question);
                    funcs.addExactSystemResponses(mapped, question);
                    funcs.addSystemConcepts(mapped, question, systemConcepts);
                    funcs.addSystemDocuments(mapped, question, systemDocuments);
                    funcs.addSystemSnippets(mapped, question, systemSnippets);
                    funcs.addSystemStatements(mapped, question, systemStatements);
                });
            }

            step(
                function () {
                    var conceptGroup   = this.group(),
                        documentGroup  = this.group(),
                        snippetGroup   = this.group();

                    Object.keys(systemConcepts).forEach(function (conceptURI) {
                        if (!question.concepts.some(function (c) {
                            return (c.uri === conceptURI);
                        })) {
                            var conceptCallback = conceptGroup();
                            resolver.descriptionForConcept(conceptURI, function (err, conceptDescription) {
                                if (err) {
                                    console.error('error retrieving concept: ' + conceptURI);
                                    return conceptCallback(null);
                                }
                                var merged = funcs.merge(conceptDescription, systemConcepts[conceptURI]);
                                conceptCallback(null, merged);
                            });
                        }
                    });

                    Object.keys(systemDocuments).forEach(function (documentURI) {
                        if (!question.documents.some(function (d) {
                            return (d.uri === documentURI);
                        })) {
                            var documentCallback = documentGroup();
                            resolver.descriptionForDocument(documentURI, function (err, documentDescription) {
                                if (err) {
                                    console.error('error retrieving document: ' + documentURI);
                                    return documentCallback(null);
                                } 
                                var merged = funcs.merge(documentDescription, systemDocuments[documentURI]);
                                documentCallback(null, merged);
                            });
                        }
                    });

                    systemSnippets.forEach(function (snippet) {
                        if (!question.snippets.some(function (s) {
                            return funcs.snippetsEqual(s, snippet);
                        })) {
                            var snippetCallback = snippetGroup();
                            snippetCallback(null, snippet);
                        }
                    });

                    var triples = systemStatements.filter(function (statement) {
                        return !question.statements.some(function (s) {
                            return funcs.statementsEqual(s, statement);
                        });
                    }).map(function (statement) {
                        return statement.triples[0];
                    });
                    resolver.descriptionForTriples(triples, function (err, result) {
                        if (err) {
                            console.error('error verbalizing statements: ' + util.inspect(err));
                        }
                        else {
                            result.forEach(function (title, tripleIdx) {
                                systemStatements[tripleIdx].title = title;
                            });
                        }
                    });
                },
                function (err, concepts, documents, snippets) {
                    if (err) { return questionCallback(err); }

                    Array.prototype.push.apply(question.concepts, concepts.filter(funcs.nonNull));
                    Array.prototype.push.apply(question.documents, documents.filter(funcs.nonNull));
                    Array.prototype.push.apply(question.snippets, snippets.filter(funcs.nonNull));
                    Array.prototype.push.apply(question.statements, systemStatements.filter(funcs.nonNull));

                    questionCallback(null, question);
                }
            );  // step()
        });
    },
    function (err, questions) {
        if (err) {
            console.error(err);
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
