const kItemsPerPage = 10;

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
    path = require('path'),
    config = require(path.join(__dirname, '..', '..', 'config')).defaults,
    logger = require('./logging.js').logger,
    Sharing = require('./sharing').Sharing;

var conceptSearch = new Search(),
    documentSearch = new TIDocuments(config.search.documents),
    tripleSearch = new TITriples(config.search.triples2),
    verbalizer = new Verbalizer(config.search.verbalizer),
    sharing = new Sharing(config.sharing);

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
                    model.load2(id,
                                req.session.data.user,
                                { 'documents.sections': false, 'documents.abstract': false, is_shared: false },
                                function (err, question) {
                        var time = Date.now();
                        var logData = {
                            user: req.session.data.user,
                            path: 'questions/:id',
                            method: 'POST',
                            params: id,
                            dataTime: time
                        };
                        if (err) {
                            logData.error = err;
                            logger('error', 'retrieving question failed', logData);
                            res.send(404);
                        } else {
                            question.retrieved = time;
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
                            params: id,
                            host: req.headers.host,
                            dataTime: question.retrieved
                        };

                        if (err) {
                            logData.error = err;
                            logger('error', 'updating question failed', logData);
                            res.send(500);
                        } else {
                            logger('info', 'updating question', logData);
                            res.send(200);
                        }

                        if (sharing.enabled()) {
                            model.load2(id,
                                        req.session.data.user,
                                        { 'documents.sections': false, 'documents.abstract': false },
                            function (err, loadedQuestion) {
                                if (err) {
                                    return logger('info', 'error retrieving question for sharing', err);
                                }
                                var shared = (loadedQuestion.publication !== 'private');
                                if (shared) {
                                    sharing.updateQuestion(loadedQuestion, function (err) {
                                        if (err) { return logger('info', 'error sharing question: ' + id, err); }
                                        logger('info', 'question ' + id + ' shared to ' + config.sharing.address);
                                    });
                                } else if (loadedQuestion.is_shared && loadedQuestion.publication === 'private') {
                                    sharing.removeQuestion(id, function (err) {
                                        if (err) { return logger('info', 'error sharing question: ' + id, err); }
                                        logger('info', 'question ' + id + ' removed from sharing to ' + config.sharing.address);
                                    });
                                }
                                model.update(id, { is_shared: shared }, req.session.data.user, function (err) {
                                    if (err) {
                                        logger('error', 'could not update shared question: ' + id, err);
                                        return;
                                    }
                                });
                            });
                        }
                    });
                });

                /*
                 * DELETE to /questions/:id deletes question with id
                 */
                this.del(idRegEx).bind(function (req, res, id) {
                    model.del(id, req.session.data.user, function (err) {
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

                router.path(/\/history\//, function () {
                    this.get(idRegEx).bind(function (req, res, id) {
                        model.history(id, req.session.data.user, function (err, queries) {
                            var logData = {
                                user: req.session.data.user,
                                path: 'questions/history/:id',
                                method: 'GET',
                                params: id
                            };
                            if (err) {
                                logData.error = err;
                                logger('error', 'query history failed', logData);
                                res.send(500);
                            } else {
                                logger('info', 'query history', logData);
                                res.send(200, {}, queries);
                            }
                        });
                    });
                });
                
                router.path(idRegEx, function () {
                    router.path(/\/documents\//, function () {
                        this.get(/([0-9]+)/).bind(function (req, res, id, docID) {
                            docID = String(docID);
                            model.load(id, req.session.data.user, function (err, question) {
                                var logData = {
                                    user: req.session.data.user,
                                    path: 'questions/:id/documents/:docID',
                                    method: 'GET',
                                    params: [ id, docID ]
                                };

                                var doc;
                                if (question && question.documents) {
                                    for (var i = 0; i < question.documents.length; i++) {
                                        var documentID = question.documents[i].uri.substr(-docID.length);
                                        if (documentID === docID) {
                                            doc = question.documents[i];
                                            break;
                                        }
                                    }
                                }

                                if (doc) {
                                    logger('info', 'retrieving question document', logData);
                                    res.send(200, {}, doc);
                                } else {
                                    if (err) {
                                        logData.error = err;
                                    }
                                    logger('error', 'question or document not found', logData);
                                    res.send(404);
                                }
                            });
                        });
                    });
                })
            });
        });

        router.filter(function () {
            /*
             * POST to /concepts searches for concepts
             */
            router.path(/\/concepts\/?/, function () {
                this.post().bind(function (req, res, keywords) {
                    var logData = {
                        user: req.session.data.user,
                        path: 'concepts',
                        method: 'POST',
                        params: keywords
                    };
                    logger('info', 'received concept search request', logData);

                    if (config.search.debug === true) {
                        var fs = require('fs');
                        var cannedResponsePath = path.join(__dirname, '..', 'test', 'response.json');
                        var cannedResponse = fs.readFileSync(cannedResponsePath);
                        res.send(200, {}, { concepts: JSON.parse(cannedResponse).concepts });
                        return;
                    }

                    if (!keywords.query) {
                        return res.send(400, {}, 'empty search terms');
                    }

                    conceptSearch.find(keywords.query, function (err, conceptResult) {
                        if (err) {
                            logData.error = err;
                            logger('error', 'search for concepts failed', logData);
                            res.send(502);
                        } else {
                            logger('info', 'search for concepts', logData);
                            res.send(200, {}, { concepts: conceptResult });
                        }
                    });
                });
            });

            /*
             * POST to /documents searches for documents
             */
            router.path(/\/documents\/?/, function () {
                this.post().bind(function (req, res, keywords) {
                    var page = parseInt(keywords.page, 10) || 0,
                        itemsPerPage = parseInt(keywords.itemsPerPage, 10) || kItemsPerPage;

                    var logData = {
                        user: req.session.data.user,
                        path: 'documents',
                        method: 'POST',
                        params: keywords
                    };
                    logger('info', 'received document search request', logData);

                    if (config.search.debug === true) {
                        var fs = require('fs');
                        var cannedResponsePath = path.join(__dirname, '..', 'test', 'response.json');
                        var cannedResponse = fs.readFileSync(cannedResponsePath);
                        res.send(200, {}, {
                            documents: JSON.parse(cannedResponse).documents,
                            page: 0,
                            size: 10
                        });
                        return;
                    }

                    if (!keywords.query) {
                        return res.send(400, {}, 'empty search terms');
                    }

                    documentSearch.find(keywords.query, page, itemsPerPage, function (err, documentResult, size) {
                        if (err) {
                            logData.error = err;
                            logger('error', 'search for documents failed', logData);
                            res.send(502);
                        } else {
                            logger('info', 'search for documents', logData);
                            res.send(200, {}, { documents: documentResult, size: size, page: page });
                        }
                    });
                });
            });

            /*
             * POST to /statements searches for statements
             */
            router.path(/\/statements\/?/, function () {
                this.post().bind(function (req, res, keywords) {
                    var page = parseInt(keywords.page, 10) || 0,
                        itemsPerPage = parseInt(keywords.itemsPerPage, 10) || kItemsPerPage;

                    var logData = {
                        user: req.session.data.user,
                        path: 'statements',
                        method: 'POST',
                        params: keywords
                    };
                    logger('info', 'received statement search request', logData);

                    if (config.search.debug === true) {
                        var fs = require('fs');
                        var cannedResponsePath = path.join(__dirname, '..', 'test', 'response.json');
                        var cannedResponse = fs.readFileSync(cannedResponsePath);
                        res.send(200, {}, {
                            statements: JSON.parse(cannedResponse).statements,
                            page: 0,
                            size: 10
                        });
                        return;
                    }

                    if (!keywords.query) {
                        return res.send(400, {}, 'empty search terms');
                    }

                    tripleSearch.find(keywords.query, page, itemsPerPage, function (err, response, size) {
                        if (err) {
                            logData.error = err;
                            logger('error', 'search for statements failed', logData);
                            return res.send(502);
                        }

                        if (response.length) {
                            logger('info', 'search for statements', logData);
                            res.send(200, {}, {
                                statements: response,
                                page: page,
                                size: size
                            });
                        } else {
                            logger('info', 'search for statements', logData);
                            res.send(200, {}, { statements: [], size: 0, page: 0 });
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
                        method: 'GET'
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
                    var url = 'http://' + req.headers.host + '/backend/resetPassword';
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
                }
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
                            schemajs.create(authentication.userSchema).validate(body).valid;

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
                        schemajs.create(authentication.userSchema).validate(body).valid;

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

                    var r = http.request(options, function(response) {

                        var headers = response.headers;
                        headers['Access-Control-Allow-Origin'] = '*';
                        headers['Access-Control-Allow-Headers'] = 'X-Requested-With';

                        var content = '';
                        response.on('data', function(chunk) {
                            content += chunk;
                        });

                        response.on('end', function() {
                            logger('info', 'corsProxy ('+response.statusCode+')', logData);
                            res.send(response.statusCode, headers , content);
                        });
                    });

                    r.on('error', function(e) {
                        logData.error = e;
                        logger('error', 'corsProxy failed', logData);
                        res.send(503, {}, 'error');
                    });
                    r.end();

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
};
