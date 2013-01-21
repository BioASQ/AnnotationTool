var
  http = require('http'),
  url = require('url'),
  qstr = require('querystring');

var Verbalizer = exports.Verbalizer = function (URL) {
  this.serviceURL = URL;
};

/*
 * Basic request wrapper function
 */
Verbalizer.prototype._request = function (URL, options, /* Object */ data, cb) {
  /*
   * If cb is undefined we have been given only three parameters,
   * the last of which is the callback.
   */
  cb = cb || data;

  var urlObj = url.parse(URL);
  var httpOptions = {
    'hostname': urlObj.hostname,
    'port': urlObj.port ? urlObj.port : 80,
    'path': urlObj.path + '?' + qstr.stringify(data),
    'method': 'GET',
    'headers': {
      'accept': 'application/json',
    }
  }
  var responseData = '';
  var req = http.request(httpOptions, function (res) {
     res.on('data',  function (chunk) { responseData += chunk; });
     res.on('end',   function ()      { cb(null, responseData); });
     res.on('close', function ()      { res.emit('end'); });
  });
  req.on('error', function (e) { cb(e.message); });
  req.end();
};

/*
 * Clears the current timeout (if any) and creates a new one.
 */
Verbalizer.prototype.verbalize = function (subject, predicate, object, cb) {
    this._request(
        this.serviceURL,
        { method: 'GET' },
        { subject: subject, predicate: predicate, object:object },
        function (err, result) { cb (err, result); }
    );
};

