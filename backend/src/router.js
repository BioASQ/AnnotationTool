var
  journey = require('journey'),
  url = require('url'),
  util = require('util'),
  schemajs = require('schemajs'),
  Search = require('./search').Search;

var
  accountBody = {
      'SID': '',
      'error': '',
      'usermail': ''
  },
  clearAccountBody = function () {
      accountBody = {
          'SID': '',
          'error': '',
          'usermail': ''
      };
  };

  /*
  var schema = {
      question: {
          type: 'object', required: true, // 'properties': { ... }, 'error': { ... },
          schema: {
              id: { type: 'string+', required: true },
              body: { type: 'string+', required: true },
              creator: { type: 'string+', required: true },
              type: { type: 'string+', required: true, properties: { regex: /(list|textual)/ } },
              answer: {
                  type: 'object', required: true,
                  schema: {
                      id: { type: 'string+', required: true },
                      body: { type: 'string+', required: true },
                      annotations: { type: 'array' }
                  }
              }
          }
      }
  };
  //util.puts(schemajs.create(schema).validate( { question: { id: 'test', body: 'test', creator: 'test', type: 'textual', answer: { id: 'test', body: 'test', annotations: new Array() }}}).valid); // true
  */
exports.createRouter = function (model, authentication) {
    var router = new (journey.Router)({
        strict: false,
        filter: function (req, body, callback) {
            if (req.session.data.user === 'Guest') {
                return callback(new journey.NotAuthorized('Invalid user'));
            }
            else {
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
                  if (err) {
                      res.send(404);
                  }
                  res.send(200, {}, { 'questions': list });
              });
          });

          /*
           * POST to /questions creates new question
           */
          this.post().bind(function (req, res, question) {
              model.create(question, function (err, id) {
                  if (err) {
                      res.send(500);
                  }
                  res.send(200, {}, { 'id': id });
              });
          });

          /*
           * GET to /questions/:id returns question with id
           */
          this.get(idRegEx).bind(function (req, res, id) {
              model.load(id, function (err, question) {
                  if (err) {
                      res.send(404);
                  }
                  res.send(200, {}, question);
              });
          });

          /*
           * POST or PUT to /questions/:id updates existing question
           */
          this.route(['POST', 'PUT'], idRegEx).bind(function (req, res, id, question) {
              model.update(id, question, function (err) {
                  if (err) {
                      res.send(500);
                  }
                  res.send(200);
              });
          });

          /*
           * DELETE to /questions/:id deletes question with id
           */
          this.del(idRegEx).bind(function (req, res, id) {
              model.delete(id, function (err) {
                  if (err) {
                      res.send(500);
                  }
                  res.send(200);
              });
          });
      });
  });

  /*
   * POST to /search
   */
  router.path(/\/search\/?/, function () {
    var searchBackend = new Search();
    this.post().bind(function (req, res, keywords) {
      searchBackend.find(keywords.query, function (err, response) {
        if (err) {
          res.send(502);
        } else {
          res.send(200, {}, { 'results': { 'concepts': response, 'documents': [], 'statements': [] } });
        }
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
                      res.send(400, {}, { 'error': err });
                  }
                  res.send(200, {}, { 'error': '' });
              });
          } else {
              res.send(400, {}, { 'error': 'missing parameters' });
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
                      accountBody.error = err;
                      res.send(500, {}, accountBody);
                  }
                  else if (result) {
                      var user = result[0]; // DB data
                      // login
                      req.session.data.user = user.email;

                      // response
                      accountBody.SID = req.session.id;
                      accountBody.usermail = req.session.data.user
                      res.send(200, {}, accountBody);
                  }
                  else {
                      accountBody.error = 'account not found'
                      res.send(401, {}, accountBody);
                  }
              });
          }
          else {
              accountBody.error = 'missing parameters';
              res.send(400, {}, accountBody);
          }
          clearAccountBody();
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

              var user = req.session.data.user;
              req.session.data.user = 'Guest';

              accountBody.usermail = user;
              res.send(200, {}, accountBody);
              clearAccountBody();
          });
      });
  });

  router.path(/\/resetPassword\/?/, function () {
      /*
       * GET to /resetPassword with parameters: email and/or code
       */
      this.get().bind(function (req, res, body) {
          if (body.email && body.code) {
              authentication.activatePassword(body.email,body.code, function (err, result) {
                  if (err) {
                      accountBody.error = err;
                      res.send(500, {}, accountBody);
                  } else if (result) {
                      accountBody.usermail = body.email;
                      res.send(200, {}, accountBody);
                  } else {
                      accountBody.error = 'account not found';
                      res.send(401, {}, accountBody);
                  }
              });
          }else if (body.email) {
              var url = 'http://' + req.headers.host + '/resetPassword'
              authentication.resetPassword(url, body.email, function (err, result) {
                  if (err) {
                      accountBody.error = err;
                      res.send(500, {}, accountBody);
                  } else if (result) {
                      accountBody.usermail = body.email;
                      res.send(200, {}, accountBody);
                  } else {
                      accountBody.error = 'account not found';
                      res.send(401, {}, accountBody);
                  }
              });
          } else {
              accountBody.error = 'missing parameters';
              res.send(400, {}, accountBody);
          }
          clearAccountBody();
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
                  authentication.changePassword(body.oldPassword, body.newPassword, req.session.data.user, function (err, result) {
                      if (err) {
                          accountBody.error = err;
                          res.send(500, {}, accountBody);
                      } else if (result) {
                          res.send(200, {}, accountBody);
                      } else {
                          accountBody.error = 'account not found';
                          res.send(401, {}, accountBody);
                      }
                  });
              } else {
                  accountBody.error = 'missing parameters';
                  res.send(400, {}, accountBody);
              }
              clearAccountBody();
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
                        accountBody.error = err;
                        res.send(500, {}, accountBody);
                    } else if (result) {
                        res.send(200, {}, accountBody);
                    } else {
                        accountBody.error = 'account not found';
                        res.send(401, {}, accountBody);
                    }
                });
            } else if (body.email) {
                //TODO send activation mail again?
                accountBody.error = 'missing parameters';
                res.send(400, {}, accountBody);
            } else {
                accountBody.error = 'missing parameters';
                res.send(400, {}, accountBody);
            }
            clearAccountBody();
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
                  var url = 'http://' + req.headers.host + '/activate'
                  authentication.createUser(body, url, function (err, results) {
                      if (err) {
                          accountBody.error = err;
                          res.send(403, {}, accountBody);
                      } else {
                          res.send(200, {}, accountBody);
                      }
                  });
              } else {
                  accountBody.error = schemajs.create(authentication.userSchema).validate(body).errors;
                  res.send(400, {}, accountBody);
              }
          } else {
              accountBody.error = 'missing parameters';
              res.send(400, {}, accountBody);
          }
          clearAccountBody();
      });
  });

  });

  return router;
}
