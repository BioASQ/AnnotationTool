var
  journey = require('journey'),
  url = require('url');

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
      * GET to /loginWebid
      */
      this.get().bind(function (req, res) {
          //TODO
          var callback = "http://123.123.123.123:8000";
          var query_data = url.parse(req.url, true).query;
          var webid = '', ts = '', sig = '';

          if (query_data) {
              var splited = query_data.split("&");

              for (var i = 0; i < splited.length; i++) {
                  if (splited[i].indexOf("webid=") == 0) 
                      webid = decodeURIComponent(splited[i].split("=")[1]);                  
                  else if (splited[i].indexOf("ts=") == 0) 
                      ts = decodeURIComponent(splited[i].split("=")[1]);                  
                  else if (splited[i].indexOf("sig=") == 0) {
                      sig = splited[i].split("=")[1];
                      //  base64-URL-safe to base64
                      sig = sig.replace(/-/g, "+").replace(/\_/g, "/") + "==";
                  }
              }
          }
          if (webid != '' && ts != '' && sig != '') {

              cert = ["-----BEGIN PUBLIC KEY-----",
              "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAkJOsAoUbVJfNfK59t125",
              "efvukOqKlOjS6OIfOlhtH/8VxVXaMQO/n90cOiILwFDjlixbOFYywRHmoPcTNpfE",
              "nzePpaLqbztyO0XarSaxBEKZ6aRgdDBcgvnhMqmIjOUB5TiYtN1DdpaRnIZlklUq",
              "dvcIzM7df+rSMgzwTNFHM53Y15zUhLosWh3KC5C/v7lLNIg0m2YR2Py36oqsO0+A",
              "aH4aGOKdsbKjZEN2Ld0Rn3HxEEMPSTpGpUOlULf65prN1oNK8EnijPjlgLz9q2w4",
              "CFwjOzzyd40fO7zPRejwOxPdWaf/DdF2+KArSurqovF+XtGZK2sGneEOXU5QY8qM",
              "3wIDAQAB",
               "-----END PUBLIC KEY-----"].join("\n");

              // check
              verifier = require('crypto').createVerify("RSA-SHA1");
              var data = callback + '/login' + "?" + splited[0] + "&" + splited[1];
              verifier.update(data);
              bool = verifier.verify(cert, sig, 'base64');

              // TODO: check ts

             
              res.send(200, {}, { 'login': bool });
          } else {            
              res.send(200, {}, { 'login_url': 'https://foafssl.org/srv/idp?rs=' + callback + '/login' });
          }
      });
  });

  return router;
}
