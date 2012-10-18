var
  journey = require('journey'),
  util = require('util');

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
      model.update(id, question, function (err, count) {
        if (err) {
          res.send(500);
        }
        res.send(200, {}, { 'updated': count });
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

  return router;
}
