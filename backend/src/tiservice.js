var
  http = require('http'),
  url = require('url'),
  qstr = require('querystring');

var TIService = exports.TIService = function (URL) {
  this.serviceURL = URL;
  this.timeout = 600000; // 10 min in ms
  this.currentTimeout = null;
  this.tokenURL = null;
};

/*
 * Retrieves the token URL from the server
 */
TIService.prototype._tokenURL = function (cb) {
  var self = this;
  if (this.tokenURL) {
    cb(this.tokenURL);
    return;
  }
  // token invalid
  this._request(function (err, data) {
    self.tokenURL = data;
    cb(self.tokenURL);
  }, this.serviceURL, { 'method': 'GET' });
};

/*
 * Basic request wrapper function
 */
TIService.prototype._request = function (cb, URL, options, /* Object */ data) {
  this._resetTimeout();
  var urlObj = url.parse(URL);
  var dataStr = '';
  var httpOptions = {
    'hostname': urlObj.host,
    'port': urlObj.port ? urlObj.port : 80,
    'path': urlObj.path,
    'method': options.method ? options.method : 'POST',
    'headers': {
      'content-type': 'application/x-www-form-urlencoded',
      'accept': 'application/json',
    }
  }
  if (data) {
    dataStr = 'json=' + encodeURIComponent(JSON.stringify(data) + '\n');
    httpOptions.headers['content-length'] = dataStr.length;
  }
  var responseData = '';
  var req = http.request(httpOptions, function (res) {
     res.on('data', function (chunk) {
       responseData += chunk;
     }).on('end', function () {
       cb(null, responseData);
     }).on('close', function () {
       res.emit('end');
     });
  });
  req.on('error', function (e) {
    cb(e.message);
  });
  req.write(dataStr);
  req.end();
};

/*
 * Clears the current timeout (if any) and creates a new one.
 */
TIService.prototype._resetTimeout = function () {
  var self = this;
  if (this.currentTimeout) {
    clearTimeout(this.currentTimeout);
  }
  this.currentTimeout = setTimeout(function () {
    self.tokenURL = null;
  }, this.timeout);
};

TIService.prototype.find = function (/* String */ keywords, cb) {
  var self = this;
  this._tokenURL(function (URL) {
    self._request(function (err, response) {
      if (err) {
        cb(err);
      } else {
        cb(null, JSON.parse(response).result);
      }
    }, URL, { 'method': 'POST' }, { 'findEntities': [ keywords ]});
  });
};

TIService.prototype.annotate = function (/* String */ keywords, cb) {
  var self = this;
  this._tokenURL(function (URL) {
    self._request(function (err, response) {
      if (err) {
        cb(err);
      } else {
        cb(null, JSON.parse(response).result);
      }
    }, URL, { 'method': 'POST' }, { 'annotateText': [ keywords ]});
  });
};
