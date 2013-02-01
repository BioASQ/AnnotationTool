var http = require('http'),
    url = require('url'),
    util = require('util'),
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
    // cb = cb || data;

    var urlObj = url.parse(URL);
    var httpOptions = {
        'hostname': urlObj.hostname,
        'port': urlObj.port ? urlObj.port : 80,
        'path': urlObj.path,
        'method': options.method ? options.method : 'GET',
        'headers': {
            'accept': 'application/json',
        }
    }
    if (httpOptions.method == 'GET') { httpOptions.path += '?' + qstr.stringify(data) }
    var responseData = '';
    var req = http.request(httpOptions, function (res) {
         res.on('data',  function (chunk) { responseData += chunk; });
         res.on('end',   function ()      { cb(null, responseData); });
         res.on('close', function ()      { res.emit('end'); });
    });
    req.on('error', function (e) { cb(e.message); });
    if (httpOptions.method == 'POST') { req.write(JSON.stringify(data)); }
    req.end();
};

/*
 * Verbalizes hte given statement(s), returning an array of sentences.
 */
Verbalizer.prototype.verbalize = function (param1, param2, param3, param4) {
    var method, data, callback;
    if (util.isArray(param1) && !param3 && !param4) {
        // we are given an array of statements and a callback
        method   = 'POST';
        data     = param1;
        callback = param2;
    } else {
        // we are given s, p, o, and a callback
        method   = 'GET';
        data     = { subject: param1, predicate: param2, object: param3 };
        callback = param4;
    }
    this._request(this.serviceURL, { method: method }, data, callback);
};

