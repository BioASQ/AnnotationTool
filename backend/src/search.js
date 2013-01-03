var
  http = require('http'),
  url = require('url'),
  qstr = require('querystring');

var Search = exports.Search = function (URL) {
  this.serviceURL = URL;
  this.timeout = 600000; // 10 min in ms
  this.currentTimeout = null;
  this.tokenURL = null;
};

/*
 * Retrieves the token URL from the server
 */
Search.prototype._tokenURL = function (cb) {
  var self = this;
  if (this.tokenURL) {
    cb(this.tokenURL);
    return;
  }
  // token invalid
  this._request(null, function (data) {
    self.tokenURL = data;
    cb(self.tokenURL);
  }, this.serviceURL, { 'method': 'GET' });
};

/*
 * Basic request wrapper function
 */
Search.prototype._request = function (ecb, cb, URL, options, /* Object */ data) {
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
       cb(responseData);
     }).on('close', function () {
       res.emit('end');
     });
  });
  req.on('error', function (e) {
    ecb(e.message);
  });
  req.write(dataStr);
  req.end();
};

/*
 * Clears the current timeout (if any) and creates a new one.
 */
Search.prototype._resetTimeout = function () {
  var self = this;
  if (this.currentTimeout) {
    clearTimeout(this.currentTimeout);
  }
  this.currentTimeout = setTimeout(function () {
    self.tokenURL = null;
  }, this.timeout);
};

Search.prototype.find = function (ecb, cb, /* String */ keywords) {
  var self = this;
  this._tokenURL(function (URL) {
    self._request(function (err) {
      if (ecb) {
        ecb(err);
      }
    }, function (response) {
      cb(JSON.parse(response).result);
    }, URL, { 'method': 'POST' }, { 'findEntities': [ keywords ]});
  });
};

Search.prototype.annotate = function (ecb, cb, /* String */ keywords) {
  var self = this;
  this._tokenURL(function (URL) {
    self._request(function (err) {
      if (ecb) {
        ecb(err);
      }
    }, function (response) {
      cb(JSON.parse(response).result);
    }, URL, { 'method': 'POST' }, { 'annotateText': [ keywords ]});
  });
};
