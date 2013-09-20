// run this file to use the test
try {
    var reporter = require('nodeunit').reporters.default;
}
catch(e) {
    console.log("Cannot find nodeunit module.");
    process.exit();
}
process.chdir(__dirname);
reporter.run(['authenticationTest.js']);

// test data
var userEmail = 'foo@bar.de';
var userPassword = '12345678-';

// test
var
  http = require('http'),
  util = require('util'),
  url = require('url'),
  mongodb = require('mongodb'),
  send = require('send'),
  schemajs = require('schemajs'),
  path = require('path'),
  config = require(path.join(__dirname, '..', '..', 'config')).defaults,
  dbConn = new mongodb.Db(config.database.name, new mongodb.Server(config.database.host, config.database.port, {}), { safe: false }),
  options = {
      host: '127.0.0.1',
      port: config.server.port,
      path: '',
      method: 'POST'
  },
  sid = '';

exports.group = {
    /*
     * DB running?
     */
    db_connection_test: function (test) {
        dbConn.open(function (err, database) {
            test.ifError(err);
            dbConn.close();
            test.done();
        });
    },
    /*
    * Adds an user email to db
    */
    addUser_http_test: function (test) {

        options.path =
            '/backend/addUser?email=' + encodeURIComponent(config.mail.address) +
            '&password=' + encodeURIComponent(config.mail.password) +
            '&userEmail=' + encodeURIComponent(userEmail);

        var req = http.request(options, function (response) {
            var body = '';
            response.on('data', function (chunk) {
                body += chunk;
            });

            response.on('end', function () {
                test.equal(200, response.statusCode, body);
                test.done();
            });
        });

        req.on('error', function (e) {
            test.ok(false, 'request error: ' + e);
            test.done();
        });
        req.end();
    },

    /*
    *  Do we have that user in our db?
    */
    find_user_in_db: function (test) {

        dbConn.open(function (err, database) {
            database.collection('login', function (err, coll) {
                coll.find({ email: userEmail }).toArray(function (err, res) {

                    test.ifError(err);

                    if (res.length >= 1) {
                        dbConn.close();
                        test.done();
                    } else {
                        test.ok(false, 'user mail not in db');
                        dbConn.close()
                        test.done();
                    }
                });
            });
        });
    },
    /*
    *   Register that user
    */
    register: function (test) {

        options.path = '/backend/register?name=testname&email=' + encodeURIComponent(userEmail) + '&password=' + encodeURIComponent(userPassword);

        var req = http.request(options, function (response) {
            var body = '';

            response.on('data', function (chunk) {
                body += chunk;
            });
            response.on('end', function () {
                test.equal(200, response.statusCode, body);
                test.done();
            });

        });
        req.on('error', function (e) {

            test.ok(false, 'request error: ' + e);
            test.done();
        });
        req.end();
    },
    /*
    *   Activate that user
    */
    activate_user: function (test) {

        dbConn.open(function (err, database) {
            database.collection('login', function (err, coll) {
                coll.find({ email: userEmail }).toArray(function (err, res) {
                    test.ifError(err);
                    if (res.length >= 1) {

                        options.path = '/backend/activate?email=' + encodeURIComponent(userEmail) + '&code=' + encodeURIComponent(res[0].active);
                        options.method = 'GET';

                        var req = http.request(options, function (response) {
                            var body = '';

                            response.on('data', function (chunk) {
                                body += chunk;
                            });
                            response.on('end', function () {
                                test.equal(302, response.statusCode, body);
                                dbConn.close(); test.done();
                            });

                        }).on('error', function (e) {

                            test.ok(false, 'request error: ' + e);
                            dbConn.close(); test.done();

                        }).end();


                    } else {
                        test.ok(false, 'user not found');
                        dbConn.close(); test.done();
                    }
                });
            });
        });
    },

    /*
    *   User login
    */
    login: function (test) {
        options.path = '/backend/login?email=' + encodeURIComponent(userEmail) + '&password=' + encodeURIComponent(userPassword);
        options.method = 'POST';

        var req = http.request(options, function (response) {
            var body = '';

            response.on('data', function (chunk) {
                body += chunk;
            });
            response.on('end', function () {
                // save sid
                var splits = response.headers['set-cookie'][0].split(";");
                for (var i = 0 ; i < splits.length; i++) {
                    if (splits[i].indexOf('SID') != -1) {
                        sid = splits[i];
                        break;
                    }
                }
                test.equal(200, response.statusCode, body);
                test.done();
            });

        }).on('error', function (e) {

            test.ok(false, 'request error: ' + e);
            test.done();

        }).end();
    },

    /*
    *   Change password
    */
    change_password: function (test) {

        options.path =
            '/backend/changePassword?oldPassword=' + encodeURIComponent(userPassword) +
            '&newPassword=' + encodeURIComponent(userPassword + userPassword);

        options.method = 'POST';
        options.headers = { 'Cookie': sid };

        var reqCh = http.request(options, function (res) {
            var b = '';
            res.on('data', function (c) {
                b += c;
            });
            res.on('end', function () {
                test.equal(200, res.statusCode, b);

                test.done();
            });
        }).on('error', function (e) {

            test.ok(false, 'request error: ' + e);
            test.done();

        }).end();
    },
    /*
    *   create a 5 questions
    */
    create_5_questions: function (test) {
        for (var i = 0; i < 5 ; i++) {
            options.path =
                '/backend/questions?body=' + encodeURIComponent("test") +
                '&type=' + encodeURIComponent("list");

            options.method = 'POST';
            options.headers = { 'Cookie': sid };

            var reqCh = http.request(options, function (res) {
                var b = '';
                res.on('data', function (c) {
                    b += c;
                });
                res.on('end', function () {
                    test.equal(200, res.statusCode, b);
                });
            }).on('error', function (e) {

                test.ok(false, 'request error: ' + e);
                test.done();

            }).end();
        }
        test.done();
    },
    /*
    *   User login
    **/
    login_with_newPassword: function (test) {
        options.path = '/backend/login?email=' + encodeURIComponent(userEmail) + '&password=' + encodeURIComponent(userPassword + userPassword);
        options.method = 'POST';

        var req = http.request(options, function (response) {
            var body = '';

            response.on('data', function (chunk) {
                body += chunk;
            });
            response.on('end', function () {
                test.equal(200, response.statusCode, body);
                test.done();
            });

        }).on('error', function (e) {

            test.ok(false, 'request error: ' + e);
             test.done();

        }).end();
    },
    /*
    *   Reset password
    **/
    reset_password: function (test) {
        options.path = '/backend/resetPassword?email=' + encodeURIComponent(userEmail);
        options.method = 'GET';

        var req = http.request(options, function (response) {
            var body = '';

            response.on('data', function (chunk) {
                body += chunk;
            });
            response.on('end', function () {
                test.equal(200, response.statusCode, body);

                // is activation code set in db
                dbConn.open(function (err, database) {
                    database.collection('login', function (err, coll) {

                        coll.find({ email: userEmail }).toArray(function (err, res) {
                            test.ifError(err);
                            if (res.length >= 1) {
                                if (res[0].code && res[0].code != '') {
                                    test.ok(true, 'tmp password was set to db');
                                    dbConn.close();
                                    test.done();
                                }
                            } else {
                                test.ok(false, 'request error: ' + e);
                                dbConn.close();
                                test.done();
                            }
                        });
                    });
                });
            });
        }).on('error', function (e) {

            test.ok(false, 'request error: ' + e);
            test.done();

        }).end();
    },
    /*
    *   Remove the user from db
    */
    clear_test_data: function (test) {

        dbConn.open(function (err, database) {
            database.collection('login', function (err, coll) {
                coll.remove({ email: userEmail });
                dbConn.close();
                test.done();
            });
        });
    }
}
