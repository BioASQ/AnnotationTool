var
    util = require('util'),
    crypto = require('crypto'),
    schemajs = require('schemajs'),
    mymail = require('./mail');
 
var md5Blob = '§$%&/()(/&%$';

var Login = exports.Login = function (database) {

    this.mail = new mymail.Mail();    
    this.db = database;
    this.db.ensureIndex({ email: 1 }, { unique: true, dropDups: true });
    this.userSchema = {
        email: { type: 'email',  error: 'wrong email', required: true },
        password: { type: 'string+', properties: { max: 255, min: 8 }, error: { max: 'too many chars', min: 'too few chars' }, required: true },
        name: { type: 'string+', error: 'wrong name', required: true }
    };
};

Login.prototype.createUser = function (user, callback) {
    this._collection(callback, function (err, coll) {
        coll.find({ email: user.email }).toArray(function (err, docs) {

            if (docs.length == 0) {

                user.password = crypto.createHash('md5').update(user.password + md5Blob).digest('hex');

                coll.insert(user, function (err, res) {
                    if (err) {
                        callback(err);
                    } else {

                        var txt = 'Welcome to BioASQ Annotation Tool. <br /><br />User: ' + user.email + '<br />Password: ' + user.password;
                        var mail = new mymail.Mail();
                        mail.sendEMail(user.email, txt, function (error, responseStatus) {
                            // TODO: handle errors
                            if (error) {
                                util.puts(error);
                            } else util.puts(responseStatus.message);
                        });
                        callback(null, res);
                    }
                });
            } else {
                callback('User already exists, nothing changed');
            }
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

    password = crypto.createHash('md5').update(password + md5Blob).digest('hex');

    this.list(email, password, function (err, result) {
        if (err)
            callback(err);

        if (result.length >= 1) // TODO
            callback(null, true, result);
        else
            callback(null, false, null);
    });
};