var ObjectID = require('mongodb').ObjectID,
    util = require('util');

var Question = exports.Question = function (database) {
  this.db = database;
};

Question.prototype.list = function (callback) {
  this.db.collection('questions', function (err, collection) {
    var cursor = collection.find({}, { 'fields': [ 'body' ]});
    cursor.toArray(function (err, res) {
      if (err) {
        callback(err);
      }
      callback(null, res);
    });
  });
};

Question.prototype.create = function (question, callback) {
  this.db.collection('questions', function (err, coll) {
    coll.insert(question, { 'save': true }, function (err, inserted) {
      if (err) {
        callback(err);
      }
      callback(null, inserted[0]._id);
    });
  });
};

Question.prototype.load = function (id, callback) {
  this.db.collection('questions', function (err, coll) {
    coll.findOne({ '_id': ObjectID(id) }, function (err, res) {
      if (err) {
        callback(err);
      }
      callback(null, res);
    });
  });
};

Question.prototype.update = function (id, question, callback) {
  this.db.collection('questions', function (err, coll) {
    coll.update({ '_id': ObjectID(id) }, { $set: question }, { 'save': true }, function (err, count) {
      if (err) {
        callback(err);
      }
      callback(null, count);
    });
  });
};

Question.prototype.delete = function (id, callback) {
  this.db.collection('questions', function (err, coll) {
    if (err) {
      callback(err);
    }
    coll.remove({ '_id': ObjectID(id) }, { 'save': true }, function (err, count) {
      if (err) {
        callback(err);
      }
      assert.equal(null, err);
      assert.equal(1, count);
      util.puts('deleted ' + count + ' records.')
      callback(null);
    });
  });
};

