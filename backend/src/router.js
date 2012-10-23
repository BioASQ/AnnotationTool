var
  journey = require('journey'),
  url = require('url'),
  session = require('sesh').magicSession();

exports.createRouter = function (model) {
  var router = new journey.Router;
  var idRegEx = /([0-9a-fA-F]{24})/;

  router.path(/\/questions\/?/, function () {
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
    this.route([ 'POST', 'PUT' ], idRegEx).bind(function (req, res, id, question) {
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


  router.path(/\/login\/?/, function () {
      /*
      * GET to /login
      */
      this.get().bind(function (req, res) {

          var login = require('./login');
          login = new login.Login("http://" + req.headers.host + "/login");
          var login_res = login.login(url.parse(req.url, true).query);
          if (login_res.loggedin === true) {
              // TODO: user in DB?
              req.session.data.user = login_res.webid;
          }
          res.send(200, {}, { 'loginURL': login_res.loginURL, 'session': req.session.id, 'user': req.session.data.user });
      });
  });

  return router;
}
