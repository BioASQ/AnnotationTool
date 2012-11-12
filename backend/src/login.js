var util = require('util');
var crypto = require('crypto');

var Login = exports.Login = function (database) {
    this.db = database;
    this.blob = '"§$%&/()(/&%$'; // md5 blob
};

Login.prototype._collection = function (errCallback, callback) {
    this.db.collection('login', function (err, coll) {
        if (err) {
            errCallback(err);
        }
        callback(null, coll);
    });
};

Login.prototype.list = function (login, callback) {
    this._collection(callback, function (err, coll) {
        var cursor = coll.find({ email: login.email, password: login.password });
        cursor.toArray(function (err, res) {
            if (err) {
                callback(err);
            }
            callback(null, res);
        });
    });
};

Login.prototype.standard = function (email, password, callback) {

    var login = {
        email: email,
        password: crypto.createHash('md5').update(password + this.blob).digest('hex')
    };

    this.list(login, function (err, result) {
        if (err)
            callback(err);

        if (result.length >=1) // TODO
            callback(null, true);
        else
            callback(null, false);
    });
};