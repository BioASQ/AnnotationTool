const
  itemsPerPage = 10;

var
  journey = require('journey'),
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
  logger = require('./logging.js').logger;

exports.createRouter = function (model, authentication) {
    var router = new (journey.Router)({
        strict: false,
        filter: function (req, body, callback) {
            if (req.session.data.user === 'Guest') {
                return callback(new journey.NotAuthorized('Invalid user'));
            } else {
                callback(); // respond with no error
            }
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
              model.list(function (err, list) {
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
              question.creator = req.session.data.user;
              model.create(question, function (err, id) {
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
              model.load(id, function (err, question) {
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
              model.update(id, question, function (err) {
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
              model.delete(id, function (err) {
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
                if (err) {
                    logger('error', 'searches for concepts', { parameters:keywords, error: err + '', user: req.session.data.user, file : 'router', method: 'POST concepts'});
                    res.send(502);
                } else {
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
            documentSearch.find(keywords.query, page, itemsPerPage, function (err, documentResult, pages) {
                if (err) {
                    logger('error', 'searches for documents', { parameters:keywords, error: err + '', user: req.session.data.user, file : 'router', method: 'POST documents'});
                    res.send(502);
                } else {
                    res.send(200, {}, { 'results': { 'documents': documentResult }, numPages: pages, page: page });
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
                if (err) {
                    logger('error', 'in statement search', { parameters:keywords, error: err + '', user: req.session.data.user, file : 'router', method: 'POST statements'});
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
                                    logger('error', 'in statement search for triplesResult processing', { parameters:keywords, error: err + '', user: req.session.data.user, file : 'router', method: 'POST statements'});
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
                                    res.send(200, {}, { 'results': { 'statements': result } });
                                }
                            }
                        );
                    } else {
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
          if (body.email && body.password && body.userEmail) {
              authentication.addUser(body.email, body.password, body.userEmail, function (err, result) {
                  if (err) {
                      logger('error', 'in add user to whitelist', { parameters:body, error: err + '', user: req.session.data.user, file : 'router', method: 'POST addUser'});
                      res.send(400, {}, err);
                  } else {
                      logger('info', 'User ' + body.userEmail  + ' added to the whitelist.', { user: body.userEmail, file : 'router', method: 'POST addUser'});
                      res.send(200, {}, { });
                  }
              });
          } else {
              logger('warn', 'missing parameters, in add user to whitelist', { parameters:body, user: req.session.data.user, file : 'router', method: 'POST addUser'});
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
          if (body.email && body.password) {
              authentication.standardLogin(body.email, body.password, function (err, result) {
                  if (err) {
                      logger('error', 'in login', { parameters:body, error: err + '', user: req.session.data.user, file : 'router', method: 'POST login'});
                      res.send(500, {}, err);
                  }
                  else if (result) {
                      var user = result[0]; // DB data
                      // login
                      req.session.data.user = user.email;
                      logger('info', 'User ' + user.email  + ' logged in. SID: ' + req.session.id , { sid : req.session.id, user: user.email, file : 'router', method: 'POST login'});
                      // response
                      res.send(200, {}, {SID: req.session.id, usermail: req.session.data.user, username : user.name });
                  }
                  else {
                      logger('warn', 'in login, account not found', { parameters:body, user: req.session.data.user, file : 'router', method: 'POST login'});
                      res.send(401, {}, 'account not found');
                  }
              });
          }
          else {
              logger('warn', 'in login, missing parameters', { parameters:body, user: req.session.data.user, file : 'router', method: 'POST login'});
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
              // logout
              logger('info', 'User ' + req.session.data.user  + ' logged out. SID: ' + req.session.id , { sid : req.session.id, user: req.session.data.user, file : 'router', method: 'logout'});
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
          if (body.email && body.code) {
              authentication.activatePassword(body.email,body.code, function (err, result) {
                  if (err) {
                      logger('error', 'in resetPassword', { parameters:body, error: err + '', user: req.session.data.user, file : 'router', method: 'GET resetPassword'});
                      res.send(500, {}, err);
                  } else if (result) {
                      logger('info', 'User ' + body.email  + ' reset password.', { user: body.email, file : 'router', method: 'GET resetPassword'});
                      var url = 'http://' + req.headers.host;
                      res.send(302, {'Location': url }, {});
                  } else {
                      logger('warn', 'in resetPassword,account not found', { parameters:body, user: req.session.data.user, file : 'router', method: 'GET resetPassword'});
                      res.send(401, {}, 'account not found');
                  }
              });
          }else if (body.email) {
              var url = 'http://' + req.headers.host + '/backend/resetPassword'
              authentication.resetPassword(url, body.email, function (err, result) {
                  if (err) {
                      logger('error', 'in resetPassword', { parameters:body, error: err + '', user: req.session.data.user, file : 'router', method: 'GET resetPassword'});
                      res.send(500, {}, err);
                  } else if (result) {
                      logger('info', 'User ' + body.email  + ' asks to reset password.', { user: body.email, file : 'router', method: 'GET resetPassword'});
                      res.send(200, {}, {});
                  } else {
                      logger('warn', 'in resetPassword, account not found', { parameters:body, user: req.session.data.user, file : 'router', method: 'GET resetPassword'});
                      res.send(401, {}, 'account not found');
                  }
              });
          } else {
              logger('warn', 'in resetPassword, missing parameters', { parameters:body, user: req.session.data.user, file : 'router', method: 'GET resetPassword'});
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
              if (body.oldPassword && body.newPassword) {
                  body.name = "xx";
                  body.email ="xx@xx.xx";
                  body.password = body.newPassword;
                  if (schemajs.create(authentication.userSchema).validate(body).valid) {
                      // todo: fix inconsistent schemajs response to the frontend
                      schemajs.create(authentication.userSchema).validate(body).valid

                      authentication.changePassword(body.oldPassword, body.newPassword, req.session.data.user, function (err, result) {
                          if (err) {
                              logger('error', 'in changePassword', { parameters:body, error: err + '', user: req.session.data.user, file : 'router', method: 'POST changePassword'});
                              res.send(500, {}, err);
                          } else if (result) {
                              logger('info', 'User ' + req.session.data.user + ' changed password.', { user: req.session.data.user,  file : 'router', method: 'POST changePassword'});
                              res.send(200, {}, {});
                          } else {
                              logger('warn', 'in resetPassword, missing parameters', { parameters:body, user: req.session.data.user, file : 'router', method: 'POST changePassword'});
                              res.send(401, {}, 'account not found');
                          }
                      });
                  }else{
                      var errors = schemajs.create(authentication.userSchema).validate(body).errors;
                      logger('warn', 'in changePassword', { parameters:body, error: errors + '', user: req.session.data.user, file : 'router', method: 'POST changePassword'});
                      res.send(400, {}, JSON.stringify(errors));
                  }
              } else {
                  logger('warn', 'in changePassword, missing parameters', { parameters:body, user: req.session.data.user, file : 'router', method: 'POST changePassword'});
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
            if (body.email && body.code) {
                authentication.activateUser(body.email, body.code, function (err, result) {
                    if (err) {
                        logger('error', 'in activate account', { parameters:body, error: err + '', user: req.session.data.user, file : 'router', method: 'GET activate'});
                        res.send(500, {}, err);
                    } else if (result) {
                        var url = 'http://' + req.headers.host;
                        logger('info', 'User ' + body.email  + ' activated.', { user: body.email, file : 'router', method: 'GET activate'});
                        res.send(302, {'Location': url }, {});
                    } else {
                        logger('warn', 'in activate account, account not found', { parameters:body, user: req.session.data.user, file : 'router', method: 'GET activate'});
                        res.send(401, {}, 'account not found');
                    }
                });
            } else if (body.email) {
                //TODO send activation mail again?
                logger('warn', 'in  activate account, missing parameters', { parameters:body, user: req.session.data.user, file : 'router', method: 'GET activate'});
                res.send(400, {}, 'missing parameters');
            } else {
                logger('warn', 'in  activate account, missing parameters', { parameters:body, user: req.session.data.user, file : 'router', method: 'GET activate'});
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
          if (body.email && body.password && body.name) {
              if (schemajs.create(authentication.userSchema).validate(body).valid) {
                  // todo: fix inconsistent schemajs response to the frontend
                  schemajs.create(authentication.userSchema).validate(body).valid

                  var url = 'http://' + req.headers.host + '/backend/activate';
                  authentication.createUser(body, url, function (err, results) {
                      if (err) {
                          logger('error', 'in register account', { parameters:body, error: err + '', user: req.session.data.user, file : 'router', method: 'POST register'});
                          res.send(403, {}, err);
                      } else {
                          logger('info', 'User ' + body.email  + ' registered.', { user: body.email, file : 'router', method: 'register'});
                          res.send(200, {}, {});
                      }
                  });
              } else {
                  var errors = schemajs.create(authentication.userSchema).validate(body).errors;
                  logger('warn', 'in register account', { parameters:body, error: errors + '', user: req.session.data.user, file : 'router', method: 'POST register'});
                  res.send(400, {}, JSON.stringify(errors));
              }
          } else {
              logger('warn', 'in register account', { parameters:body, user: req.session.data.user, file : 'router', method: 'POST register'});
              res.send(400, {}, 'missing parameters');
          }
      });
  });

  router.path(/\/corsProxy\/?/, function () {
      /*
       * GET to /corsProxy with parameter: url
       */
      this.get().bind(function (req, res, body) {
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
                      res.send(200, headers , content)
                  });
              });

              req.on('error', function(e) {
                  logger('error', 'in corsProxy, http.request error', { parameters:body, error: e, user: req.session.data.user, file : 'router', method: 'GET corsProxy'});
                  res.send(503, {}, 'error');
              });
              req.end();

          } else {
              logger('warn', 'in corsProxy, missing parameters', { parameters:body, user: req.session.data.user, file : 'router', method: 'GET corsProxy'});
              res.send(400, {}, 'missing parameters');
          }
      });
  });

  }); /* backend */

  return router;
}
