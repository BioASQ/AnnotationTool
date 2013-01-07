var
  http = require('http'),
  util = require('util'),
  mongodb = require('mongodb'),
  login = require('./login'),
  question = require('./question');

var
  corsHeaderName = 'Access-Control-Allow-Origin';

exports.createServer = function (port, model, authentication) {
  var router = require('./router').createRouter(model, authentication);
  var server = http.createServer(function (request, response) {
    var body = '';
    request.on('data', function (chunk) {
      body += chunk;
    });
    request.on('end', function () {
      var emitter = router.handle(request, body, function (route) {
        var headers = route.headers;
        // aleays inject CORS header
        headers[corsHeaderName] = 'http://' + request.headers.host;
        response.writeHead(route.status, headers);
        response.end(route.body);
      });
    });
  });

  if (port) {
    server.listen(port);
  }

  return server;
}

exports.start = function (options, callback) {
  var
    dbServer = new mongodb.Server(options.database.host, options.database.port, {}),
    dbConn = new mongodb.Db('bioasq-at', dbServer, {safe: false});

  dbConn.open(function (err, database) {
    if (err) {
      return callback({'message': 'Could not connect to database server.'});
    }

    var server = exports.createServer(options.port, new question.Question(database), new login.Login(database));

    callback(null, server);
  });
}
