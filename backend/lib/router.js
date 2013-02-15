const
    itemsPerPage = 10;

var journey = require('journey'),
    url = require('url'),
    util = require('util'),
    http = require('http'),
    schemajs = require('schemajs'),
    step = require('step'),
    Search = require('./search').Search,
    TIDocuments = require('./tidocuments').TIDocuments,
    TITriples = require('./titriples').TITriples,
    Verbalizer = require('./verbalizer').Verbalizer,
    config = require(require('path').join(__dirname, '..', 'config')).defaults,
    logger = require('./logging.js').logger,
    path = require('path');

exports.createRouter = function (model, authentication) {
    var router = new (journey.Router)({
        strict: false,
        filter: function (req, body, callback) {
            if (req.session.data.user === 'Guest') {
                return callback(new journey.NotAuthorized('Invalid user'));
            }
            callback(); // respond with no error
        }
    });

    var idRegEx = /([0-9a-fA-F]{24})/;

    router.path(/\/backend\/?/, function () {

        router.path(/\/questions\/?/, function () {
            /*
             * user only
             */
            router.filter(function () {
                /*
                 * GET to /questions returns list of questions
                 */
                this.get().bind(function (req, res) {
                    model.list(req.session.data.user, function (err, list) {
                        var logData = {
                            user: req.session.data.user,
                            path: 'questions',
                            method: 'GET'
                        };
                        if (err) {
                            logData.error = err;
                            logger('error', 'listing questions failed', logData);
                            res.send(404);
                        } else {
                            logger('info', 'listing questions', logData);
                            res.send(200, {}, { 'questions': list });
                        }
                    });
                });

                /*
                 * POST to /questions creates new question
                 */
                this.post().bind(function (req, res, question) {
                    model.create(question, req.session.data.user, function (err, id) {
                        var logData = {
                            user: req.session.data.user,
                            path: 'questions',
                            method: 'POST',
                            params: question
                        };
                        if (err) {
                            logData.error = err;
                            logger('error', 'creating new question failed', logData);
                            res.send(500);
                        } else {
                            logger('info', 'creating new question', logData);
                            res.send(200, {}, { 'id': id });
                        }
                    });
                });

                /*
                 * GET to /questions/:id returns question with id
                 */
                this.get(idRegEx).bind(function (req, res, id) {
                    model.load(id, req.session.data.user, function (err, question) {
                        var logData = {
                            user: req.session.data.user,
                            path: 'questions/:id',
                            method: 'POST',
                            params: id
                        };
                        if (err) {
                            logData.error = err;
                            logger('error', 'retrieving question failed', logData);
                            res.send(404);
                        } else {
                            logger('info', 'retrieving question', logData);
                            res.send(200, {}, question);
                        }
                    });
                });

                /*
                 * POST or PUT to /questions/:id updates existing question
                 */
                this.route(['POST', 'PUT'], idRegEx).bind(function (req, res, id, question) {
                    model.update(id, question, req.session.data.user, function (err) {
                        var logData = {
                            user: req.session.data.user,
                            path: 'questions/:id',
                            method: 'POST|PUT',
                            params: id
                        };
                        if (err) {
                            logData.error = err;
                            logger('error', 'updating question failed', logData);
                            res.send(500);
                        } else {
                            logger('info', 'updating question', logData);
                            res.send(200);
                        }
                    });
                });

                /*
                 * DELETE to /questions/:id deletes question with id
                 */
                this.del(idRegEx).bind(function (req, res, id) {
                    model.delete(id, req.session.data.user, function (err) {
                        var logData = {
                            user: req.session.data.user,
                            path: 'questions/:id',
                            method: 'DEL',
                            params: id
                        };
                        if (err) {
                            logData.error = err;
                            logger('error', 'deleting question failed', logData);
                            res.send(500);
                        } else {
                            logger('info', 'deleting question question', logData);
                            res.send(200);
                        }
                    });
                });
            });
        });

        router.filter(function () {
            /*
             * POST to /concepts searches for concepts
             */
            router.path(/\/concepts\/?/, function () {
                var conceptSearch = new Search();
                this.post().bind(function (req, res, keywords) {
                    conceptSearch.find(keywords.query, function (err, conceptResult) {
                        var logData = {
                            user: req.session.data.user,
                            path: 'concepts',
                            method: 'POST',
                            params: keywords
                        };
                        if (err) {
                            logData.error = err;
                            logger('error', 'search for concepts failed', logData);
                            res.send(502);
                        } else {
                            logger('info', 'search for concepts', logData);
                            res.send(200, {}, { 'results': { 'concepts': conceptResult } });
                        }
                    });
                });
            });

            /*
             * POST to /documents searches for documents
             */
            router.path(/\/documents\/?/, function () {
                var documentSearch = new TIDocuments(config.search.documents);
                this.post().bind(function (req, res, keywords) {
                    var page = parseInt(keywords.page) || 0;
                    documentSearch.find(keywords.query, page, itemsPerPage, function (err, documentResult, size) {
                        var logData = {
                            user: req.session.data.user,
                            path: 'documents',
                            method: 'POST',
                            params: keywords
                        };
                        if (err) {
                            logData.error = err;
                            logger('error', 'search for documents failed', logData);
                            res.send(502);
                        } else {
                            logger('info', 'search for documents', logData);
                            res.send(200, {}, { 'results': { 'documents': documentResult }, size: size, page: page });
                        }
                    });
                });
            });

            /*
             * POST to /statements searches for statements
             */
            router.path(/\/statements\/?/, function () {
                var tripleSearch = new TITriples(config.search.triples);
                var verbalizer = new Verbalizer(config.search.verbalizer);
                this.post().bind(function (req, res, keywords) {
                    tripleSearch.find(keywords.query, function (err, triplesResult) {
                        var logData = {
                            user: req.session.data.user,
                            path: 'statements',
                            method: 'POST',
                            params: keywords
                        };
                        if (err) {
                            logData.error = err;
                            logger('error', 'search for statements failed', logData);
                            res.send(502);
                        } else {
                            var result = [];
                            if (triplesResult.length) {
                                step(
                                    function () {
                                    for (var i = 0, max = Math.min(10, triplesResult.length); i < max; i++) {
                                        var curr = triplesResult[i];
                                        verbalizer.verbalize(curr.s_l, curr.p_l, curr.o, this.parallel());
                                    }
                                },
                                function (err /* variadic arguments */) {
                                    if (err) {
                                        logData.error = err;
                                        logger('error', 'search for statements failed', logData);
                                        res.send(502);
                                    } else {
                                        for (var i = 1; i < arguments.length; i++) {
                                            var verbalization = String(arguments[i]).replace(/\{|\}|\"/g, '');
                                            result.push({
                                                s: triplesResult[i - 1].s,
                                                p: triplesResult[i - 1].p,
                                                o: triplesResult[i - 1].o,
                                                title: verbalization
                                            });
                                        }
                                        logger('info', 'search for statements', logData);
                                        res.send(200, {}, { 'results': { 'statements': result } });
                                    }
                                }
                                );
                            } else {
                                logger('info', 'search for statements', logData);
                                res.send(200, {}, { 'results': { 'statements': result } });
                            }
                        }
                    });
                });
            });
        });

        router.path(/\/addUser\/?/, function () {
            /*
             * POST to /addUser with parameters: email, password and userEmail
             *
             */
            this.post().bind(function (req, res, body) {
                var logBody = JSON.parse(JSON.stringify(body));
                if(logBody.password)logBody.password = '***'; // don't log password
                var logData = {
                    user: req.session.data.user,
                    path: 'addUser',
                    method: 'POST',
                    params: logBody
                };
                if (body.email && body.password && body.userEmail) {
                    authentication.addUser(body.email, body.password, body.userEmail, function (err, result) {
                        if (err) {
                            logData.error = err;
                            logger('error', 'add user failed', logData);
                            res.send(400, {}, err);
                        } else {
                            logger('info', 'add user', logData);
                            res.send(200, {}, { });
                        }
                    });
                } else {
                    logData.error = 'missing parameters';
                    logger('error', 'add user failed', logData);
                    res.send(400, {}, 'missing parameters');
                }
            });
        });

        router.path(/\/login\/?/, function () {
            /*
             * POST to /login with parameters: email and password
             *
             * This is the standard login function.
             */
            this.post().bind(function (req, res, body) {
                var logBody = JSON.parse(JSON.stringify(body));
                if(logBody.password)logBody.password = '***'; // don't log password
                var logData = {
                    user: req.session.data.user,
                    path: 'login',
                    method: 'POST',
                    params: logBody
                };
                if (body.email && body.password) {
                    authentication.standardLogin(body.email, body.password, function (err, result) {
                        if (err) {
                            logData.error = err;
                            logger('error', 'login failed', logData);
                            res.send(500, {}, err);
                        }
                        else if (result) {
                            var user = result[0]; // DB data
                            // login
                            req.session.data.user = user.email;
                            logger('info', 'login', logData);
                            // response
                            res.send(200, {}, {SID: req.session.id, usermail: req.session.data.user, username : user.name });
                        }
                        else {
                            logData.error = 'account not found';
                            logger('error', 'login failed', logData);
                            res.send(401, {}, 'account not found');
                        }
                    });
                }
                else {
                    logData.error = 'missing parameters';
                    logger('error', 'login failed', logData);
                    res.send(400, {}, 'missing parameters');
                }
            });
        });

        router.path(/\/logout\/?/, function () {
            /*
             * user only
             */
            router.filter(function () {
                /*
                 * GET to /logout
                 */
                this.get().bind(function (req, res) {
                    var logData = {
                        user: req.session.data.user,
                        path: 'logout',
                        method: 'GET',
                    };
                    // logout
                    logger('info', 'logout', logData);
                    req.session.data.user = 'Guest';
                    var url = 'http://' + req.headers.host;
                    res.send(302, {'Location': url }, {});
                });
            });
        });

        router.path(/\/resetPassword\/?/, function () {
            /*
             * GET to /resetPassword with parameters: email and/or code
             *
             * resets and activates a password
             */
            this.get().bind(function (req, res, body) {
                var logBody = JSON.parse(JSON.stringify(body));
                if(logBody.code)logBody.code = '***'; // don't log password
                var logData = {
                    user: req.session.data.user,
                    path: 'resetPassword',
                    method: 'GET',
                    params: logBody
                };
                if (body.email && body.code) {
                    authentication.activatePassword(body.email,body.code, function (err, result) {
                        if (err) {
                            logData.error = err;
                            logger('error', 'reset password failed', logData);
                            res.send(500, {}, err);
                        } else if (result) {
                            logger('info', 'reset password', logData);
                            var url = 'http://' + req.headers.host;
                            res.send(302, {'Location': url }, {});
                        } else {
                            logData.error = 'account not found';
                            logger('error', 'reset password failed', logData);
                            res.send(401, {}, 'account not found');
                        }
                    });
                }else if (body.email) {
                    var url = 'http://' + req.headers.host + '/backend/resetPassword'
                    authentication.resetPassword(url, body.email, function (err, result) {
                        if (err) {
                            logData.error = err;
                            logger('error', 'reset password failed', logData);
                            res.send(500, {}, err);
                        } else if (result) {
                            logger('info', 'reset password', logData);
                            res.send(200, {}, {});
                        } else {
                            logData.error = 'account not found';
                            logger('error', 'reset password failed', logData);
                            res.send(401, {}, 'account not found');
                        }
                    });
                } else {
                    logData.error = 'missing parameters';
                    logger('error', 'reset password failed', logData);
                    res.send(400, {}, 'missing parameters');
                };
            });
        });

        router.path(/\/changePassword\/?/, function () {
            /*
             * user only
             */
            router.filter(function () {
                /*
                 * POST to /changePassword with parameters: oldPassword and newPassword
                 *
                 * Allows an user to change the password.
                 */
                this.post().bind(function (req, res, body) {
                    var logBody = JSON.parse(JSON.stringify(body));
                    if(logBody.newPassword)logBody.newPassword = '***'; // don't log password
                    if(logBody.oldPassword)logBody.oldPassword = '***'; // don't log password
                    var logData = {
                        user: req.session.data.user,
                        path: 'changePassword',
                        method: 'POST',
                        params: logBody
                    };
                    if (body.oldPassword && body.newPassword) {
                        body.name = "xx";
                        body.email ="xx@xx.xx";
                        body.password = body.newPassword;
                        if (schemajs.create(authentication.userSchema).validate(body).valid) {
                            // todo: fix inconsistent schemajs response to the frontend
                            schemajs.create(authentication.userSchema).validate(body).valid

                            authentication.changePassword(body.oldPassword, body.newPassword, req.session.data.user, function (err, result) {
                                if (err) {
                                    logData.error = err;
                                    logger('error', 'change password failed', logData);
                                    res.send(500, {}, err);
                                } else if (result) {
                                    logger('info', 'change password', logData);
                                    res.send(200, {}, {});
                                } else {
                                    logData.error = 'account not found';
                                    logger('error', 'change password failed', logData);
                                    res.send(401, {}, 'account not found');
                                }
                            });
                        }else{
                            var errors = schemajs.create(authentication.userSchema).validate(body).errors;
                            logData.error = errors;
                            logger('error', 'change password failed', logData);
                            res.send(400, {}, JSON.stringify(errors));
                        }
                    } else {
                        logData.error = 'missing parameters';
                        logger('error', 'change password failed', logData);
                        res.send(400, {}, 'missing parameters');
                    }
                });
            });
        });

        router.path(/\/activate\/?/, function () {
            /*
             * GET to /activate with parameters: email and code
             */
            this.get().bind(function (req, res,body) {
                var logBody = JSON.parse(JSON.stringify(body));
                if(logBody.code)logBody.code = '***'; // don't log password
                var logData = {
                    user: req.session.data.user,
                    path: 'activate',
                    method: 'GET',
                    params: logBody
                };
                if (body.email && body.code) {
                    authentication.activateUser(body.email, body.code, function (err, result) {
                        if (err) {
                            logData.error = err;
                            logger('error', 'activate account failed', logData);
                            res.send(500, {}, err);
                        } else if (result) {
                            var url = 'http://' + req.headers.host;
                            logger('info', 'activate account', logData);
                            res.send(302, {'Location': url }, {});
                        } else {
                            logData.error = 'account not found';
                            logger('error', 'activate account failed', logData);
                            res.send(401, {}, 'account not found');
                        }
                    });
                } else if (body.email) {
                    //TODO send activation mail again?
                    logData.error = 'missing parameters';
                    logger('error', 'activate account failed', logData);
                    res.send(400, {}, 'missing parameters');
                } else {
                    logData.error = 'missing parameters';
                    logger('error', 'activate account failed', logData);
                    res.send(400, {}, 'missing parameters');
                }
            });
        });

        router.path(/\/register\/?/, function () {
            /*
             * POST to /register with parameters: email, password and name
             *
             * Registers an inactiv user.
             * Sends an email with user data and an activation link.
             */
            this.post().bind(function (req, res, body) {
                var logBody = JSON.parse(JSON.stringify(body));
                if(logBody.password)logBody.password = '***'; // don't log password
                var logData = {
                    user: req.session.data.user,
                    path: 'register',
                    method: 'POST',
                    params: logBody
                };
                if (body.email && body.password && body.name) {
                    if (schemajs.create(authentication.userSchema).validate(body).valid) {
                        // todo: fix inconsistent schemajs response to the frontend
                        schemajs.create(authentication.userSchema).validate(body).valid

                        var url = 'http://' + req.headers.host + '/backend/activate';
                        authentication.createUser(body, url, function (err, results) {
                            if (err) {
                                logData.error = err;
                                logger('error', 'register account failed', logData);
                                res.send(403, {}, err);
                            } else {
                                logger('info', 'register account', logData);
                                res.send(200, {}, {});
                            }
                        });
                    } else {
                        var errors = schemajs.create(authentication.userSchema).validate(body).errors;
                        logData.error = errors;
                        logger('error', 'register account failed', logData);
                        res.send(400, {}, JSON.stringify(errors));
                    }
                } else {
                    logData.error = 'missing parameters';
                    logger('error', 'register account failed', logData);
                    res.send(400, {}, 'missing parameters');
                }
            });
        });

        router.path(/\/corsProxy\/?/, function () {
            /*
             * user only
             */
            router.filter(function () {
            /*
             * GET to /corsProxy with parameter: url
             */
            this.get().bind(function (req, res, body) {
                var logData = {
                    user: req.session.data.user,
                    path: 'corsProxy',
                    method: 'GET',
                    params: body
                };
                if (body.url) {

                    var para = url.parse(body.url);
                    var options = {
                        host : para.host,
                        port : 80,
                        path : para.path,
                        method : 'GET',
                        headers: {
                            'user-agent': req.headers['user-agent']
                        }
                    };

                    var req = http.request(options, function(response) {

                        var headers = response.headers;
                        headers['Access-Control-Allow-Origin'] = '*';
                        headers['Access-Control-Allow-Headers'] = 'X-Requested-With';

                        var content = '';
                        response.on('data', function(chunk) {
                            content += chunk;
                        });

                        response.on('end', function() {
                            logger('info', 'corsProxy', logData);
                            res.send(200, headers , content)
                        });
                    });

                    req.on('error', function(e) {
                        logData.error = e;
                        logger('error', 'corsProxy failed', logData);
                        res.send(503, {}, 'error');
                    });
                    req.end();

                } else {
                    logData.error = 'missing parameters';
                    logger('error', 'corsProxy failed', logData);
                    res.send(400, {}, 'missing parameters');
                }
            });
            });
        });

    }); /* backend */

    return router;
}
