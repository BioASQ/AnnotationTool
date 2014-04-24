var fs   = require('fs'),
    path = require('path'),
    util = require('util');

var documentByURI = exports.documentByURI = function (question, URI) {
    var document = null;
    question.documents.some(function (annotation) {
        if (annotation.uri === URI) {
            document = annotation;
            return true;
        }
    });
    return document;
};

var nonNull = exports.nonNull = function (anything) {
    return (anything !== null && typeof anything != 'undefined');
};

var snippetsEqual = exports.snippetsEqual = function (s1, s2) {
    return (s1.document     === s2.document &&
            s1.beginSection === s2.beginSection &&
            s1.endSection   === s2.endSection &&
            s1.beginIndex   === s2.beginIndex &&
            s1.endIndex     === s2.endIndex);
};

var fixSnippetSyntax = exports.fixSnippetSyntax = function (annotation, isGolden) {
    annotation.type = 'snippet';
    annotation.golden = isGolden;

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
};

var checkSnippet = exports.checkSnippet = function (question, document, snippetAnnotation) {
    var snippet;
    if (snippetAnnotation.beginSection === 'title') {
        snippet = document.title.substring(snippetAnnotation.beginIndex,
                                           snippetAnnotation.endIndex);
    } else if (snippetAnnotation.beginSection === 'abstract') {
        snippet = document.abstract.substring(snippetAnnotation.beginIndex,
                                              snippetAnnotation.endIndex);
    } else {
        var beginSectionIndex = parseInt(snippetAnnotation.beginSection.split('.', 2)[1], 10);

        snippet = document.sections[beginSectionIndex].substring(snippetAnnotation.beginIndex,
                                                                 snippetAnnotation.endIndex);
    }

    return (snippet === snippetAnnotation.text);
};

var fixSnippet = exports.fixSnippet = function (question, document, snippetAnnotation) {
    var section;
    if (snippetAnnotation.beginSection === 'title') {
        section = document.title;
    } else if (snippetAnnotation.beginSection === 'abstract') {
        section = document.abstract;
    } else {
        var beginSectionIndex = parseInt(snippetAnnotation.beginSection.split('.', 2)[1], 10);
        section = document.sections[beginSectionIndex];
    }

    var beginIndex = section.indexOf(snippetAnnotation.text);
    if (beginIndex > -1) {
        snippetAnnotation.beginIndex = beginIndex;
        snippetAnnotation.endIndex   = beginIndex + snippetAnnotation.text.length;
        return true;
    }
    return false;
};

var statementsEqual = exports.statementsEqual = function (s1, s2) {
    if (s1.triples.length != s2.triples.length)
        return false;
    for (var i = 0; i < s1.triples.length; ++i) {
        if (s1.triples[i].s !== s2.triples[i].s &&
            s1.triples[i].p !== s2.triples[i].p &&
            s1.triples[i].o !== s2.triples[i].o) {

            return false;
        }
    }
    return true;
};

var addIdealAnswer = exports.addIdealAnswer = function (mapped, question) {
    if (typeof mapped.ideal_answer !== 'undefined') {
        if (!question.answer.ideal.some(function (idealAnswer) {
            return (idealAnswer.body === mapped.ideal_answer);
        })) {
            question.answer.ideal.push({
                body: util.isArray(mapped.ideal_answer) ? mapped.ideal_answer[0] : mapped.ideal_answer,
                source: mapped.systemName,
                golden: false,
                scores: {}
            });
        }
    }
};

var addExactSystemResponses = exports.addExactSystemResponses = function (mapped, question) {
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

        if (!alreadyStored && mapped.exact_answer && mapped.exact_answer.length) {
            question.answer.systemResponses.push(mapped.exact_answer);
        }
    }
};

var addSystemConcepts = exports.addSystemConcepts = function (mapped, question, systemConcepts) {
    if (typeof mapped.concepts !== 'undefined') {
        mapped.concepts.forEach(function (conceptURI) {
            if (!systemConcepts[conceptURI])
                systemConcepts[conceptURI] = {
                    type: 'concept',
                    uri: conceptURI,
                    golden: false
                };
        });
    }
};

var addSystemDocuments = exports.addSystemDocuments = function (mapped, question, systemDocuments) {
    if (typeof mapped.documents !== 'undefined') {
        mapped.documents.forEach(function (documentURI) {
            if (!systemDocuments[documentURI])
                systemDocuments[documentURI] = {
                    type: 'document',
                    uri: documentURI,
                    golden: false
                };
        });
    }
};

var addSystemSnippets = exports.addSystemSnippets = function (mapped, question, systemSnippets) {
    if (typeof mapped.snippets !== 'undefined') {
        Array.prototype.push.apply(
            systemSnippets,
            mapped.snippets.filter(function (snippet) {
                return (null !== snippet.text);
            }).map(function (snippet) {
                return fixSnippetSyntax(snippet, false);
            }).filter(function (s) {
                return (nonNull(s) && !systemSnippets.some(function (ss) {
                    return snippetsEqual(ss, s);
                }));
            })
        );
    }
};

var addSystemStatements = exports.addSystemStatements = function (mapped, question, systemStatements) {
    if (typeof mapped.triples !== 'undefined') {
        Array.prototype.push.apply(
            systemStatements,
            mapped.triples.map(function (sn) {
                sn.type = 'statement';
                sn.golden = false;
                sn.triples = [ { s: sn.s, p: sn.p, o: sn.o }];
                delete sn.s;
                delete sn.p;
                delete sn.o;
                return sn;
            }).filter(function (sn) {
                return (nonNull(sn) && !systemStatements.some(function (ss) {
                    return statementsEqual(sn, ss);
                }));
            })
        );
    }
};

var recursiveFilesWithExtension = exports.recursiveFilesWithExtension = function (rootPath, extension) {
    var result = [],
        dirsToScan = [ rootPath ];

    while (dirsToScan.length) {
        var nextDir = dirsToScan.shift();
        fs.readdirSync(nextDir).forEach(function (fileName) {
            var fullPath = path.join(nextDir, fileName);
            if (fileName.substr(-extension.length) === extension) {
                result.push(fullPath);
            } else {
                var stats = fs.statSync(fullPath);
                if (stats.isDirectory())
                    dirsToScan.push(fullPath);
            }
        });
    }

    return result;
}

var addSystemAnswers = exports.addSystemAnswers = function (systemResponse, fileName, system) {
    var questions = util.isArray(systemResponse.questions) ? systemResponse.questions : systemResponse;
    questions.forEach(function (systemQuestion) {
        systemQuestion.systemName = fileName.substring(0, fileName.lastIndexOf('.')).replace(/\//g, '_');
        system[systemQuestion.id] = system[systemQuestion.id] || [];
        system[systemQuestion.id].push(systemQuestion);
    });
};

var merge = exports.merge = function (o1, o2) {
    Object.keys(o2).forEach(function (k) {
        o1[k] = o2[k];
    });
    return o1;
};
