var fs         = require('fs'),
    path       = require('path'),
    util       = require('util'),
    step       = require('step'),
    program    = require('commander'),
    resolver   = require('./resolver');

program
    .option('-g, --golden-answers <file name>', 'JSON file with golden answers')
    .option('-s, --system-answers <file name>', 'JSON file or directory with JSON files containing system answers')
    .option('-u, --filter-user [user ID]', 'Only write question for a certain user ID')
    .option('-q, --filter-question [question ID]', 'Only write question with ID')
    .option('-l, --label-cache [file name] JSON file with labels')
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

// create question index
var system = {};
var addSystemAnswers = function (systemResponse) {
    systemResponse.questions.forEach(function (systemQuestion) {
        system[systemQuestion.id] = system[systemQuestion.id] || [];
        system[systemQuestion.id].push(systemQuestion);
    });
};

var filesToRead = [],
    stats = fs.statSync(program.systemAnswers);
if (stats.isDirectory()) {
    filesToRead = fs.readdirSync(program.systemAnswers).filter(function (fileName) {
        return (fileName.substr(-5) === '.json');
    });
} else {
    filesToRead = [ program.systemAnswers ];
}

filesToRead.forEach(function (fileName) {
    try {
        var filePath = path.join(program.systemAnswers, fileName),
            fileData = String(fs.readFileSync(filePath)).replace(/\\\//g, '/');
        addSystemAnswers(JSON.parse(fileData));
    } catch (e) {
        console.error('Could not read JSON file `' + filePath + '` (' + e + ')');
    }
});

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

if (program.printUris) {
    var uris = {};
    golden.forEach(function (question) {
        var questionID = question.id;
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
                return (question.id === program.filterQuestion);
            } else {
                return true;
            }
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

            var pendingSystemResults = 0;
            system[question.id].forEach(function (mapped, systemIndex, systems) {
                if (!mapped) { return; }

                pendingSystemResults++;

                // system ideal answers
                if (typeof mapped.ideal_answer !== 'undefined') {
                    if (!question.answer.ideal.some(function (idealAnswer) {
                        return (idealAnswer.body === mapped.ideal_answer);
                    })) {
                        question.answer.ideal.push({
                            body: mapped.ideal_answer,
                            golden: false
                        });
                    }
                }

                // store system's exact answers as system responses
                if (typeof mapped.exact_answer !== 'undefined') {
                    question.answer.systemResponses = question.answer.systemResponses || [];
                    var alreadyStored = question.answer.systemResponses.some(function (systemResponse) {
                        if (typeof systemResponse === 'string' && typeof mapped.exact_answer === 'string') {
                            return (systemResponse === mapped.exact_answer);
                        } else if (util.isArray(systemResponse) && util.isArray(mapped.exact_answer)) {
                            return systemResponse.every(function (item, index) {
                                return (item === mapped.exact_answer[index]);
                            });
                        }

                        return false;
                    });

                    if (!alreadyStored) {
                        question.answer.systemResponses.push(mapped.exact_answer);
                    }
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

                            annotation.beginSection = annotation.beginSection.replace(/section\./, 'sections.');
                            annotation.endSection   = annotation.endSection.replace(/section\./, 'sections.');

                            return annotation;
                        }).filter(function (s) {
                            return (typeof s !== 'undefined' && !systemSnippets.some(function (ss) {
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
                        if (--pendingSystemResults === 0) {
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

