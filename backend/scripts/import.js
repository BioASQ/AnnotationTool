var program = require('commander');

program
    .option('-f, --question-file <file name>', 'JSON file with questions to import')
    .option('-d, --database-name <name>', 'Database to import to')
    .option('-c, --collection-name <name>', 'Collection to import to')
    .option('-a, --override-author <email>', 'Override question author')
    .parse(process.argv);

var mongodb     = require('mongodb'),
    server      = new mongodb.Server('127.0.0.1', '27017', {}),
    connection  = new mongodb.Db(program.databaseName, server, { safe: false }),
    ObjectID    = require('mongodb').ObjectID,
    querystring = require('querystring'),
    util        = require('util'),
    fs          = require('fs'),
    step        = require('step');

var replacements = {
    'sections.0': 'abstract',
    'sections.1': 'sections.0',
    'sections.2': 'sections.1',
    'sections.3': 'sections.2',
    'sections.4': 'sections.3',
    'sections.5': 'sections.4',
    'sections.6': 'sections.5',
    'sections.7': 'sections.6',
    'sections.8': 'sections.7',
    'sections.9': 'sections.8',
    'sections.10': 'sections.9'
};

var fixSection = function(oldSectionName) {
    if (typeof replacements[oldSectionName] != 'undefined') {
        return replacements[oldSectionName];
    }
    
    return oldSectionName;
};

connection.open(function (err, conn) {
    if (err) {
        process.stdout.write('Could not open connection.');
        process.exit(-1);
    }

    conn.collection(program.collectionName, function (err, questions) {
        if (err) {
            process.stdout.write('Could not open `questions` collection.');
            process.exit(-1);
        }

        fs.readFile(program.questionFile, function (err, data) {
            if (err) {
                process.stdout.write('Could not open file.');
                process.exit(-1);
            }

            var docs = JSON.parse(data);
            step(
                function () {
                var callbackFactory = this;
                    docs.forEach(function (doc) {
                        doc._id = ObjectID(doc.id);
                        delete doc.id;
                        if (program.overrideAuthor) {
                            doc.creator = program.overrideAuthor;
                        }
                        [ 'concepts', 'documents', 'statements', 'snippets' ].forEach(function (section) {
                            doc.answer[section] = doc.answer.annotations.filter(function (a) {
                                return (a.type === section.substr(0, section.length - 1));
                            });
                        });
                        delete doc.answer.annotations;

                        doc.answer.documents = doc.answer.documents.map(function (d) {
                            d.abstract = d.sections[0];
                            d.sections.splice(0, 1);
                            if (!d.sections.length) {
                                delete d.sections;
                            }
                            return d;
                        });

                        doc.answer.snippets = doc.answer.snippets.map(function (s) {
                            s.beginSection = fixSection(s.beginFieldName);
                            s.endSection   = fixSection(s.endFieldName);
                            delete s.beginFieldName;
                            delete s.endFieldName;
                            return s;
                        });

                        if (doc.type === 'decisive') {
                            doc.type = 'yesno';
                        }

                        if (doc.type === 'yesno') {
                            doc.answer.exact = doc.answer.exact.substr(0, 3).toLowerCase();
                        }
                        doc.finalized = true;
                        questions.insert(doc, { safe: true }, callbackFactory.parallel());
                    });

                },
                function (err) {
                    if (err) {
                        console.error(err);
                        process.exit(-1);
                    }
                    process.exit(0);
                }
            );
        });
    });
});

