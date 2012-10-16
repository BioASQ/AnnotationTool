var
  http = require('http'),
  util = require('util');

exports.createServer = function (port) {
  var router = require('./router').createRouter();
  var server = http.createServer(function (request, response) {
    var body = '';
    request.on('data', function (chunk) {
      body += chunk;
    });
    request.on('end', function () {
      var emitter = router.handle(request, body, function (route) {
        response.writeHead(route.status, route.headers);
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
  var server = exports.createServer(options.port);
  callback(null, server);
}
