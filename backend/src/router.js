var
  journey = require('journey'),
  url = require('url'),
  session = require('sesh').magicSession(),
  util = require('util'),
  schemajs = require('schemajs');

var
  headers = {'Access-Control-Allow-Origin': 'http://127.0.0.1:8000/'}

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

exports.createRouter = function (model, authentication) {
    var router = new (journey.Router)({
        strict: false,
        filter: function (req, body, callback) {
            if (req.session.data.user === 'Guest') {
                return callback(new journey.NotAuthorized('Invalid user'));
            }
            else {
                callback();// respond with no error
            }
        }
    });
    var idRegEx = /([0-9a-fA-F]{24})/;

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
                  res.send(200, headers, { 'questions': list });
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
                  res.send(200, headers, { 'id': id });
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
                  res.send(200, headers, question);
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
        res.send(200, headers, { results: response });
      }, 2000);
    });
  });

  router.path(/\/login\/?/, function () {
      /*
       * POST to /login with parameters: body.email and body.password
       */
      this.post().bind(function (req, res, body) { 

          if (body.email && body.password) {

              authentication.standard(body.email, body.password, function (err, ok, result) {

                  if (err)
                      res.send(400, headers, { 'loggedin': false, 'errors': err });
                  else if (ok) {

                      var user = result[0]; // DB data

                      req.session.data.user = user.email;
                      res.send(200, headers, {
                          'loggedin': true,
                          'sessionID': req.session.id,
                          'user': req.session.data.user
                      });
                  }
                  else res.send(401, headers, { 'loggedin': false});
              });
          }
          else res.send(400, headers, { 'loggedin': false, 'errors': 'missing parameters' });
      });
  });

  router.path(/\/logout\/?/, function () {
      router.filter(function () {
          /*
           * GET to /logout
           */
          this.get().bind(function (req, res) {
              var user = req.session.data.user;
              req.session.data.user = 'Guest';

              res.send(200, headers, {
                  'loggedOut': user
              });
          });
      });
  });

  router.path(/\/register\/?/, function () {
      /*
       * POST to /register with email, password and name
       */
      this.post().bind(function (req, res, body) {   
        
          if (body.email && body.password && body.name) {
              if (schemajs.create(authentication.userSchema).validate(body).valid) {
                  authentication.createUser(body, function (err, results) {
                      if (err) {
                          res.send(400, headers, { 'createUser': false, 'errors': err });
                      } else {
                          res.send(200, headers, {});
                      }
                  });
              } else {
                  res.send(400, headers, { 'register': false, 'error': schemajs.create(authentication.userSchema).validate(body).errors });
              }
          } else {
              res.send(400, headers, { 'register': false, 'error': 'missing parameters' });              
          }
      });
  });

  return router;
}
