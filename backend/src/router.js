var
  journey = require('journey');

exports.createRouter = function () {
  var router = new journey.Router;
  router.path(/\/questions/, function () {
    /*
     * GET to /questions returns list of questions
     */
    this.get().bind(function (req, res) {
      res.send(501, {}, { action: 'list' });
    });

    /*
     * POST to /questions creates new question
     */
    this.post().bind(function (req, res, question) {
      res.send(501, {}, { action: 'create' });
    });

    /*
     * GET to /questions/:id returns question with id
     */
    this.get(/\/([\w|\d|\-|\_]+)/).bind(function (req, res, id) {
      res.send(501, {}, { action: 'retrieve' });
    });

    /*
     * PUT to /questions/:id updates existing question
     */
    this.put(/\/([\w|\d|\-|\_]+)/).bind(function (req, res, question) {
      res.send(501, {}, { action: 'update' });
    });

    /*
     * DELETE to /questions/:id deletes question with id
     */
    this.del().bind(function (req, res, id) {
      res.send(501, {}, { action: 'delete' });
    });
  });

  return router;
}
