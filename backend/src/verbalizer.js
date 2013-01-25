var http = require('http'),
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
 * Clears the current timeout (if any) and creates a new one.
 */
Verbalizer.prototype.verbalize = function (subject, predicate, object, cb) {
    if (subject.length && object == 'undefined' && cb == 'undefined') {
        // we are given an array of statements and a callback
        this._request(
            this.serviceURL,
            { method: 'POST' },
            subject,
            function (err, result) { predicate (err, result); }
        );
    } else {
        // parameters as named
        this._request(
            this.serviceURL,
            { method: 'GET' },
            { subject: subject, predicate: predicate, object: object },
            function (err, result) { cb (err, result); }
        );
    }
};

