var ObjectID = require('mongodb').ObjectID;

var Question = exports.Question = function (database) {
    this.db = database;
};

Question.prototype._collection = function (errCallback, callback) {
    this.db.collection('questions', function (err, coll) {
        if (err) { return errCallback(err); }
        callback(null, coll);
    });
};

Question.prototype.list = function (user, callback) {
    if (typeof user == 'undefined') { return callback(Error('No valid user.')); }

    this._collection(callback, function (err, coll) {
        var cursor = coll.find({ creator: user },
                               { fields: [ 'body', 'creator', 'finalized', 'type' ],
                                 sort: [ '_id' ] });
        cursor.toArray(function (err, res) {
            if (err) { return callback(err); }
            callback(null, res);
        });
    });
};

Question.prototype.history = function (id, user, cb) {
    this.db.collection('log', function (err, log) {
        if (err) { return cb(err); }
        log.aggregate(
            { $match: { 'params.question': id, user: user } },
            { $group: { _id: '$params.query', timestamp: { $max: '$timestamp' } } },
            { $sort: { 'timestamp': -1 } },
            { $project: { terms: '$_id', _id: false } },
            function (err, res) {
                if (err) { return cb(err); }
                cb(null, res);
            }
        );
        /*
         * log.distinct('params.query', { 'params.question': id, user: user }, function (err, res) {
         *     if (err) { return cb(err); }
         *     cb(null, res.sort());
         * });
         */
    });
};

Question.prototype.create = function (question, user, callback) {
    if (typeof user == 'undefined') { return callback(Error('No valid user.')); }

    this._collection(callback, function (err, coll) {
        question.creator = user;
        coll.insert(question, { 'save': true }, function (err, inserted) {
            if (err) { return callback(err); }
            callback(null, inserted[0]._id);
        });
    });
};

Question.prototype.load = function (id, user, callback) {
    if (typeof user == 'undefined') { return callback(Error('No valid user.')); }

    this._collection(callback, function (err, coll) {
        coll.findOne({ '_id': ObjectID(id), 'creator': user }, function (err, res) {
            if (err) { return callback(err); }
            if (!res) { return callback(new Error('Question not found')); }
            callback(null, res);
        });
    });
};

Question.prototype.load2 = function (id, user, fields, callback) {
    if (typeof user == 'undefined') { return callback(Error('No valid user.')); }

    this._collection(callback, function (err, coll) {
        coll.findOne({ '_id': ObjectID(id), 'creator': user }, { fields: fields }, function (err, res) {
            if (err) { return callback(err); }
            if (!res) { return callback(new Error('Question not found')); }
            callback(null, res);
        });
    });
};

Question.prototype.update = function (id, question, user, callback) {
    if (typeof user == 'undefined') { return callback(Error('No valid user.')); }

    delete question._id; // remove _id field
    this._collection(callback, function (err, coll) {
        coll.findOne({ _id: ObjectID(id), 'creator': user }, function (err, res) {
            if (err) { return callback(err); }
            if (!res) { return callback(new Error('Question not found')); }

            // custom update
            Object.keys(question).forEach(function (key) {
                if (key !== 'documents') {
                    res[key] = question[key];
                } else {
                    res.documents = mergeDocuments(res.documents, question.documents);
                }
            });

            coll.save(res, { 'save': true }, callback);
        });
    });
};

Question.prototype.del = function (id, user, callback) {
    if (typeof user == 'undefined') { return callback(Error('No valid user.')); }

    this._collection(callback, function (err, coll) {
        coll.remove({ '_id': ObjectID(id), 'creator': user }, { 'save': true }, function (err) {
            if (err) { return callback(err); }
            callback(null);
        });
    });
};

function mergeDocuments(existing, updated) {
    var existingIndexed = {};

    existing.forEach(function (doc) { existingIndexed[doc.uri] = doc; });

    // restore abstract and sections
    updated.forEach(function (doc) {
        if (existingIndexed[doc.uri]) {
            if (existingIndexed[doc.uri]['abstract']) { doc['abstract'] = existingIndexed[doc.uri]['abstract']; }
            if (existingIndexed[doc.uri]['sections']) { doc['sections'] = existingIndexed[doc.uri]['sections']; }
        }
    });

    return updated;
};
