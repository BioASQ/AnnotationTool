var util = require('util');
var crypto = require('crypto');

var Login = exports.Login = function (database) {
    this.db = database;
    this.blob = '"§$%&/()(/&%$'; // md5 blob
    /*insert test data*/
    var user = {
        email: 'foo@bar.de',
        password: crypto.createHash('md5').update('foobar' + this.blob).digest('hex'),
        name: "foobar",
        code: ""
    };
    this.createUser(user, function (err, res) { });
    /**/
};

Login.prototype.createUser = function (user, callback) {
    this._collection(callback, function (err, coll) {
        coll.insert(user, function (err, res) {
            if (err) {
                callback(err);
            }
            callback(null, res);
        });
    });
};

Login.prototype._collection = function (errCallback, callback) {
    this.db.collection('login', function (err, coll) {
        if (err) {
            errCallback(err);
        }
        callback(null, coll);
    });
};

Login.prototype.list = function (email, password, callback) {
    this._collection(callback, function (err, coll) {
        var cursor = coll.find({ email: email, password: password });
        cursor.toArray(function (err, res) {
            if (err) {
                callback(err);
            }
            callback(null, res);
        });
    });
};

Login.prototype.standard = function (email, password, callback) {
    password = crypto.createHash('md5').update(password + this.blob).digest('hex')
    this.list(email, password, function (err, result) {
        if (err)
            callback(err);

        if (result.length >= 1) // TODO
            callback(null, true, result);
        else
            callback(null, false, null);
    });
};