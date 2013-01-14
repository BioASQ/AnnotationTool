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

Question.prototype.list = function (callback) {
  this._collection(callback, function (err, coll) {
    var cursor = coll.find({}, { 'fields': [ 'body', 'creator' ], 'sort': [ '_id' ]});
    cursor.toArray(function (err, res) {
      if (err) {
        callback(err);
      } else {
        callback(null, res);
      }
    });
  });
};

Question.prototype.create = function (question, callback) {
  this._collection(callback, function (err, coll) {
    coll.insert(question, { 'save': true }, function (err, inserted) {
      if (err) {
        callback(err);
      } else {
        callback(null, inserted[0]._id);
      }
    });
  });
};

Question.prototype.load = function (id, callback) {
  this._collection(callback, function (err, coll) {
    coll.findOne({ '_id': ObjectID(id) }, function (err, res) {
      if (err) {
        callback(err);
      } else {
        callback(null, res);
      }
    });
  });
};

Question.prototype.update = function (id, question, callback) {
  delete question._id; // remove _id field
  this._collection(callback, function (err, coll) {
    coll.update({ '_id': ObjectID(id) }, { $set: question }, { 'save': true }, function (err) {
      if (err) {
        callback(err);
      } else {
        callback(null);
      }
    });
  });
};

Question.prototype.delete = function (id, callback) {
  this._collection(callback, function (err, coll) {
    coll.remove({ '_id': ObjectID(id) }, { 'save': true }, function (err) {
      if (err) {
        callback(err);
      } else {
        callback(null);
      }
    });
  });
};

