var
  http = require('http'),
  util = require('util'),
  url = require('url'),
  mongodb = require('mongodb'),
  send = require('send');

var _setHeader = http.ServerResponse.prototype.setHeader;
var session = require('sesh').session;
// undo response's monkey patching madness
http.ServerResponse.prototype.setHeader = _setHeader;

var
  login = require('./login'),
  question = require('./question');

var
  corsHeaderName = 'Access-Control-Allow-Origin';

exports.createServer = function (port, model, authentication) {
  var server = http.createServer(function (request, response) {
    var body = '';
    request.on('data', function (chunk) {
      body += chunk;
    });
    request.on('end', function () {
      var parsedURL = url.parse(request.url);

      if (parsedURL.pathname.search(/backend/) > -1) {
        session(request, response, function (request, response) {
          var router = require('./router').createRouter(model, authentication);
          var emitter = router.handle(request, body, function (route) {
            var headers = route.headers;
            // aleays inject CORS header
            headers[corsHeaderName] = 'http://' + request.headers.host;

            // send response
            response.writeHead(route.status, headers);
            response.end(route.body);
          });
        });
      } else {
        send(request, parsedURL.pathname)
          .root(__dirname + '/../../frontend')
          .pipe(response);
      }
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
