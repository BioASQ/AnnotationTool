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

Question.prototype.history = function (id, cb) {
    this.db.collection('log', function (err, log) {
        if (err) { return cb(err); }
        log.distinct('params.query', { 'params.question': id }, function (err, res) {
            if (err) { return cb(err); }
            cb(null, res);
        });
    });
};

Question.prototype.create = function (question, user, callback) {
    if (typeof user == 'undefined') { return callback(Error('No valid user.')); }

    this._collection(callback, function (err, coll) {
        question.creator = user;
        coll.insert(question, { 'save': true }, function (err, inserted) {
            if (err) { callback(err); }
            callback(null, inserted[0]._id);
        });
    });
};

Question.prototype.load = function (id, user, callback) {
    if (typeof user == 'undefined') { return callback(Error('No valid user.')); }

    this._collection(callback, function (err, coll) {
        coll.findOne({ '_id': ObjectID(id), 'creator': user }, function (err, res) {
            if (err) { callback(err); }
            callback(null, res);
        });
    });
};

Question.prototype.update = function (id, question, user, callback) {
    if (typeof user == 'undefined') { return callback(Error('No valid user.')); }

    delete question._id; // remove _id field
    this._collection(callback, function (err, coll) {
        coll.update({ '_id': ObjectID(id), 'creator': user }, { $set: question }, { 'save': true }, function (err) {
            if (err) { callback(err); }
            callback(null);
        });
    });
};

Question.prototype.del = function (id, user, callback) {
    if (typeof user == 'undefined') { return callback(Error('No valid user.')); }

    this._collection(callback, function (err, coll) {
        coll.remove({ '_id': ObjectID(id), 'creator': user }, { 'save': true }, function (err) {
            if (err) { callback(err); }
            callback(null);
        });
    });
};

