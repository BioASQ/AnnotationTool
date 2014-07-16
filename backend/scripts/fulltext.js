#!/usr/bin/env node

var byline   = require('byline'),
    path     = require('path'),
    step     = require('step'),
    resolver = require('./resolver'),
    program  = require('commander');

var scriptName = path.basename(__filename);

program
    .usage('usage: ' + scriptName + ' -d <database name> -c <collection name>')
    .option('-d, --database-name <name>', 'Database to import to')
    .option('-c, --collection-name <name>', 'Collection to import to')
    .option('-v, --csv', 'log results as comma sperated values')
    .parse(process.argv);

if (typeof program.databaseName == 'undefined' || typeof program.collectionName == 'undefined') {
    process.stderr.write(program.usage());
    process.stderr.write('\n');
    process.exit(-1);
}

var experts = [ 'a.bunevicius@yahoo.com', 'christoforos.nikolaou@gmail.com', 'cpantos@med.uoa.gr', 'dsanoudou@bioacademy.gr', 'iervasi@ifc.cnr.it', 'mvoutsin@bio.demokritos.gr', 'rob@ktl.mii.lt', 'roderic.guigo@crg.cat', 'samiotaki@fleming.gr', 'skossida@bioacademy.gr', 'toni_staykova@yahoo.co.nz', 'vasilis.promponas@gmail.com' ];

var mongodb  = require('mongodb'),
    server   = new mongodb.Server('127.0.0.1', '27017', {}),
    database = new mongodb.Db(program.databaseName, server, { safe: false }),
    ObjectID = require('mongodb').ObjectID;

var documentCache = {};
var URIStream = byline(process.stdin);

URIStream.on('data', function (URI) {
    var parts = String(URI).split('"', 3);
    URI = parts.length === 3 ? parts[1] : URI;
    documentCache[URI] = false;
});

URIStream.on('end', function () {
    collection(function (coll) {
        var cursor = coll.find({
            'creator': { '$in': experts },
            'snippets.document': { '$in': Object.keys(documentCache) }
        });
        step(
            function () {
                var self = this;
                Object.keys(documentCache).forEach(function (URI) {
                    fetchDocumentIfNeeded(documentCache, URI, self.parallel());
                });
            },
            function (err) {
                if (err) { throw err; }
                cursor.count(this.parallel());
            },
            function (err, count) {
                if (err) { throw err; }
                var group = this.group();
                var callbacks = [];
                for (var i = 0; i < count; ++i) {
                    callbacks.push(group());
                }
                var i = 0;
                cursor.each(function (err, item) {
                    if (item) {
                        callbacks[i++](err, item);
                    }
                });
            },
            function (err, questions) {
                if (err) { throw err; }
                var group = this.group();
                questions.forEach(function (question) {
                    if (!question) { return; }
                    var cb = group();
                    question.snippets.forEach(function (snippet) {
                        var documentURI = snippet['document'];
                        if (typeof documentCache[documentURI] != 'undefined') {
                            setSections(question, documentURI, documentCache[documentURI]);
                            var logTitle = documentCache[documentURI].title.replace(/[ \n]+/g, ' ');
                            log(process.stdout,
                                program.csv,
                                question.creator,
                                question._id,
                                documentURI,
                                logTitle);
                        }
                    });
                    question.finalized = false;
                    question.revisit = true;
                    coll.save(question, { w: 1 }, cb);
                });
            },
            function (err, res) {
                if (err) { throw err; }
                process.exit(0);
            }
        );
    });
});

function fetchDocumentIfNeeded(documentCache, URI, cb) {
    if (!documentCache[URI]) {
        resolver.descriptionForDocument(URI, function (err, description) {
            if (!err) {
                documentCache[URI] = description;
            }
            cb(err);
        });
    }
}

function setSections(question, documentURI, doc) {
    var existingDoc = null;
    for (var i = 0; i < question.documents.length; ++i) {
        if (question.documents[i].uri === documentURI) {
            existingDoc = question.documents[i];
            break;
        }
    }

    if (!existingDoc) {
        question.documents.push({});
        existingDoc = question.documents[question.documents.length - 1];
        return false;
    }

    var modified = false;
    if (existingDoc.title !== doc.title) {
        log(process.stderr, false, existingDoc.uri, 'title mismatch');
        modified = true;
    }

    if (existingDoc.abstract !== doc.abstract) {
        log(process.stderr, false, existingDoc.uri, 'abstract mismatch');
        modified = true;
    }

    if (doc.sections && doc.sections.length) {
        existingDoc.sections = doc.sections;
    } else {
        console.error(doc);
        log(process.stderr, false, existingDoc.uri, 'no sections found');
    }

    return modified;
}

var collection_ = null;
function collection(cb) {
    if (collection_) {
        return cb(collection_);
    }

    database.open(function (err, connection) {
        if (err) {
            process.stdout.write('Could not open database connection.');
            process.exit(-1);
        }
        connection.collection(program.collectionName, function (err, collection) {
            if (err) {
                process.stdout.write('Could not open `questions` collection.');
                process.exit(-1);
            }
            collection_ = collection;
            cb(collection_);
        });
    });
}

function log(writer, csv /*, ... */) {
    var data = Array.prototype.slice.call(arguments, 2).map(function (str) {
        return String(str).replace(/"/g, '\x5c"');
    });
    if (csv) {
        writer.write('"' + data.join('";"') + '"\n');
    } else {
        writer.write(data.join(' ') + '\n');
    }
}
