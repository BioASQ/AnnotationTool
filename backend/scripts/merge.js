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


// create question index
var system = {};
systemIn.questions.forEach(function (systemQuestion) {
    system[systemQuestion.id] = systemQuestion;
});

step(
    function () {
        var questionsGroup = this.group();

        golden.forEach(function (question) {
            var mapped = system[question.id];

            if (!mapped) { return; }

            // annotations from golden answer
            question.answer.annotations = question.answer.annotations.map(function (annotation) {
                annotation.golden = true;
                if (annotation.type === 'snippet') {
                    annotation.beginSection = annotation.beginFieldName;
                    annotation.endSection   = annotation.endFieldName;
                    delete annotation.beginFieldName;
                    delete annotation.endFieldName;
                }
                return annotation;
            });

            // golden ideal answer
            if (typeof question.answer.ideal !== 'undefined') {
                question.answer.ideal = [{
                    body: question.answer.ideal,
                    golden: true
                }];
            }

            // system ideal answers
            if (typeof mapped.ideal_answer !== 'undefined') {
                question.answer.ideal.push({
                    body: mapped.ideal_answer,
                    golden: false
                });
            }

            // store system's exact answers as system responses
            if (typeof mapped.exact_answer !== 'undefined') {
                question.answer.systemResponses = [ mapped.exact_answer ];
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
                                    } else {
                                        return documentCallback(err);
                                    }
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
                            process.stderr.write('-');
                            resolver.descriptionForTriple(triple, function (err, statementDescription) {
                                process.stderr.write('+');
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

                    concepts = concepts.filter(function (c) { return (c !== null); });
                    Array.prototype.push.apply(question.answer.annotations, concepts);

                    documents = documents.filter(function (c) { return (c !== null); });
                    Array.prototype.push.apply(question.answer.annotations, documents);

                    snippets = snippets.filter(function (c) { return (c !== null); });
                    Array.prototype.push.apply(question.answer.annotations, snippets);

                    statements = statements.filter(function (c) { return (c !== null); });
                    Array.prototype.push.apply(question.answer.annotations, statements);

                    questionCallback(null, question);
                }
            );
        });
    },
    function (err, questions) {
        if (err) {
            if (err.stack) { process.stderr.write(err.stack); }
            else { process.stderr.write(util.inspect(err)); }
            // process.exit(-1);
        }

        questions = questions.filter(function (q) { return (q !== null); });
        process.stdout.write(JSON.stringify(questions, null, 4));
        process.stdout.write('\n');
        process.exit(0);
    }
);


