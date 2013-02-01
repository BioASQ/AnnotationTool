var ObjectID = require('mongodb').ObjectID;

var Question = exports.Question = function (database) {
  this.db = database;
};

Question.prototype._collection = function (errCallback, callback) {
  this.db.collection('questions', function (err, coll) {
    if (err) {
      errCallback(err);
    } else {
      callback(null, coll);
    }
  });
};

Question.prototype.list = function (user, callback) {
  if (typeof user == 'undefined') { return callback(Error('No valid user.')); }

  this._collection(callback, function (err, coll) {
    var cursor = coll.find({ 'creator': user }, { 'fields': [ 'body', 'creator' ], 'sort': [ '_id' ]});
    cursor.toArray(function (err, res) {
      if (err) { callback(err); }
      callback(null, res);
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

Question.prototype.delete = function (id, user, callback) {
  if (typeof user == 'undefined') { return callback(Error('No valid user.')); }

  this._collection(callback, function (err, coll) {
    coll.remove({ '_id': ObjectID(id), 'creator': user }, { 'save': true }, function (err) {
      if (err) { callback(err); }
      callback(null);
    });
  });
};

