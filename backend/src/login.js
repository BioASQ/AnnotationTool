var
    util = require('util'),
    crypto = require('crypto'),
    schemajs = require('schemajs'),
    mymail = require('./mail');

var Login = exports.Login = function (database) {
    this.md5Blob = '§$%&/()(/&%$';
    this.mail = new mymail.Mail();    
    this.db = database;
    this.userSchema = {
        email: { type: 'email',  error: 'wrong email', required: true },
        password: { type: 'string+', properties: { max: 255, min: 8 }, error: { max: 'too many chars', min: 'too few chars' }, required: true },
        name: { type: 'string+', error: 'wrong name', required: true }
    };
};
Login.prototype.addUser = function (email, password, userEmail, callback) {
    // check admin account
    if (email == this.mail.mail && password == this.mail.pass) {
        // find user
        this._collection(callback, function (err, coll) {
            coll.find({ email: userEmail }).toArray(function (err, docs) {
                if (docs.length != 0) {
                    callback('user already exists, nothing changed');
                } else {
                    var user = { email: userEmail, activ : false };
                    coll.insert(user, function (err, res) {
                        if (err) {
                            callback(err);
                        } else {
                            callback(null, res);
                        }
                    });
                }
            });
        });
    } else {
        callback('account not found');
    }
};
Login.prototype.createUser = function (user, url, callback) {       
    var md5Password = this._createPasswordHash(user.password);
    var activationCode = this._createRandomPassword();
    var mail = this.mail;
    // find user
    this._collection(callback, function (err, coll) {
        coll.find({ email: user.email }).toArray(function (err, docs) {

            if (docs.length == 0) {           
                callback('User not exists, ask for an account!');

            } else if (docs[0].activ != false) {
                callback('User in use!');
            } else { 
                // update to DB
                coll.update({ email: user.email }, { $set: { activ: activationCode, password: md5Password } }, function (err, res) {
                    if (err) {
                        callback(err);
                    } else {
                        // send mail                       
                        user.activ = activationCode;
                        mail.createUser(user, url, function (error, responseStatus) {
                            // TODO: handle errors
                            if (error) {
                                util.puts(error);
                            } else util.puts(responseStatus.message);
                        });
                        
                        callback(null, res);
                    }
                });
            } 
        });
    });
};

Login.prototype.activateUser = function (email, activ, callback) {
    this._collection(callback, function (err, coll) {
        var cursor = coll.find({ email: email, activ: activ });
        cursor.toArray(function (err, res) {
            if (err) {
                callback(err);
            }
            else if (res.length >= 1) {                    
                coll.update({ email: email, activ: activ }, { $set: { activ: true } });
               callback(null, res);
            } else {
                callback(null, null);
            }
        });
    });
};

Login.prototype.standardLogin = function (email, password, callback) {
    var md5Password = this._createPasswordHash(password);
    this._collection(callback, function (err, coll) {
        var cursor = coll.find({ email: email, password: md5Password, activ: true });
        cursor.toArray(function (err, res) {
            if (err)
                callback(err);
            else if (res.length >= 1) {
                coll.update({ email: email, password: md5Password, activ: true }, { $set: { code: '' } });
                callback(null, res);
            }
            else
                callback(null, null);
        });
    });
};

Login.prototype.generateTmpPassword = function (url, email, callback) {

    var mail = this.mail;
    var tmpPassword = this._createRandomPassword();
    var md5tmpPassword = this._createPasswordHash(tmpPassword);
    // find activ user by mail
    this._collection(callback, function (err, coll) {
        coll.find({ email: email, activ: true }).toArray(function (err, res) {
            if (err) {
                callback(err);
            } else if (res.length >= 1) {    
                //TODO: 
                //set timestemp?
                coll.update({ email: email, activ: true }, { $set: { code: md5tmpPassword } });

                mail.generateTmpPassword(email,tmpPassword,url, function (error, responseStatus) {
                    // TODO: handle errors
                    if (error) {
                        util.puts(error);
                    } else util.puts(responseStatus.message);
                });
                callback(null, res);
            } else {
                callback(null, null);
            }
        });
    });
};

Login.prototype.oneTimeLogin = function (email, tmpPassword, callback) {
    var md5tmpPassword = this._createPasswordHash(tmpPassword);
    this._collection(callback, function (err, coll) {
        coll.find({ email: email, code: md5tmpPassword, activ: true }).toArray(function (err, result) {
            if (err) 
                callback(err);            
            else if (result.length >= 1) {
                coll.update({ email: email, code: md5tmpPassword, activ: true }, { $set: { code: '' } });

                callback(null, result);
            }
            else
                callback(null, null);
        });
    });
};

Login.prototype.changePassword = function (oldPassword, newPassword, email, callback) {

    oldPassword = this._createPasswordHash(oldPassword);
    newPassword = this._createPasswordHash(newPassword);

    // find activ user by email and password
    this._collection(callback, function (err, coll) {
        coll.find({ email: email, password: oldPassword, activ: true }).toArray(function (err, res) {
            if (err) {
                callback(err);
            } else if (res.length >= 1) {
                // changePassword
                coll.update({ email: email, password: oldPassword, activ: true }, { $set: { password: newPassword, code: '' } });
                          
                callback(null, res);
            } else {
                callback(null, null);
            }
        });
    });
};

Login.prototype._collection = function (errCallback, callback) {
    this.db.collection('login', function (err, coll) {       
        coll.ensureIndex({ email: 1 }, { unique: true, dropDups: true });
        if (err) {
            errCallback(err);
        }
        callback(null, coll);
    });
};

Login.prototype._createPasswordHash = function (string) {
    return crypto.createHash('md5').update(string + this.md5Blob).digest('hex');
};

Login.prototype._createRandomPassword = function () {
    var code = "";
    var alpha = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    for (var i = 0; i < 20; i++)
        code += alpha.charAt(Math.floor(Math.random() * alpha.length));
    
    return code;
};
