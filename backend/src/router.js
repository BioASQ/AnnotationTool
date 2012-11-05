var
  journey = require('journey'),
  url = require('url'),
  session = require('sesh').magicSession(),
  login = require('./login'),
  util = require('util');

exports.createRouter = function (model) {
    var router = new (journey.Router)({
        strict: false,
        filter: function (req, body, callback) {
            if (req.session.data.user === 'Guest')
                return callback(new journey.NotAuthorized("Invalid user"));
            else
                callback(null);// respond with no error
        }
    });
    var idRegEx = /([0-9a-fA-F]{24})/;

  router.path(/\/questions\/?/, function () {
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
    this.post().bind(function (req, res, keywords) {
      var response = {
        documents: [ { title: 'Test document', uri: 'http://ns.bioasq.org/documents/1' } ],
        concepts: [ { title: 'Test concept', uri: 'http://ns.bioasq.org/concepts/1' } ],
        statements: [ {
          s: 'http://ns.bioasq.org/resource/1',
          p: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type',
          o: 'http://ns.bioasq.org/Disease' } ]
      };
      // simulate ongoing search
      setTimeout(function () {
        res.send(200, {}, { results: response });
      }, 2000);
    });
  });

  router.path(/\/login\/?/, function () {
      /*
       * GET to /login
       */
      this.get().bind(function (req, res) {
          var query = url.parse(req.url, true).query;
          var webidLogin = new login.Login('http://' + req.headers.host + '/login');
          var loginResult = webidLogin.login(query);

          if (query) {
              if (loginResult.loggedin === true) {
                  // TODO: user in DB?
                  req.session.data.user = loginResult.webid;
              }
              res.send(200, {}, {
                  'loginURL': loginResult.loginURL,
                  'sessionID': req.session.id,
                  'user': req.session.data.user
              });
          } else {
              res.send(302, { 'Location': loginResult.loginURL }, {});
          }
      });
  });

  return router;
}
