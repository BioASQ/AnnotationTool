var http = require('http'),
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
    if (this.tokenURL) { return cb(this.tokenURL); }

    // token invalid
    var self = this;
    this._request(this.serviceURL, { 'method': 'GET' },
        function (err, data) {
            // FIXME: graceful error handling
            if (err) {
                throw new Error('Server not reachable.');
            }
            self.tokenURL = data;
            cb(self.tokenURL);
        }
    );
};

/*
 * Basic request wrapper function
 */
TIService.prototype._request = function (URL, options, /* Object */ data, cb) {
    /*
     * If cb is undefined we have been given only three parameters,
     * the last of which is the callback.
     */
    cb = cb || data;

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
             if (responseData.exception) {
                 cb(responseData.exception);
             } else {
                 cb(null, responseData);
             }
         }).on('close', function () {
             res.emit('end');
         });
    });
    req.on('error', function (e) {
        cb(e);
    });
    req.write(dataStr);
    req.end();
};

TIService.prototype._requestJSON = function (URL, options, /* Object */ data, cb) {
    this._request(URL, options, data, function (err, data) {
        if (err) { return cb(err); }

        var response;
        try {
            response = JSON.parse(data);
        } catch (e) {
            // remove invalid control characters and try again
            try {
                response = JSON.parse(String(data).replace(/[\u0000-\u001f]/g, ''));
            } catch (e2) {
                // still not working?
                return cb(e);
            }
        }
        
        if (response.exception) {
            return cb(Error(response.exception));
        }

        cb(null, response);
    });
}

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

