var http = require('http'),
    url = require('url'),
    qstr = require('querystring');

var TIService = exports.TIService = function (URL) {
    this.serviceURL = URL;
    this.timeout = 589999; // 9 min 50 sec in ms
    this.currentTimeout = null;
    this.tokenURL = null;
};

/*
 * Retrieves the token URL from the server
 */
TIService.prototype._tokenURL = function (cb) {
    if (this.tokenURL) { return cb(null, this.tokenURL); }

    // token invalid
    var self = this;
    this._request(this.serviceURL, { 'method': 'GET' },
        function (err, data) {
            if (err) { return cb(err); }

            self.tokenURL = data;
            cb(null, self.tokenURL);
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
		//urlObj.hostname used because urlObj.host includes port number (urlObj.port) which is added separately too.
        'hostname': urlObj.hostname,
        'port': urlObj.port ? urlObj.port : 80,
        'path': urlObj.path,
        'method': options.method ? options.method : 'POST',
        'headers': {
            'accept': 'application/json'
        }
    };
    if (data !== cb) {
        dataStr = 'json=' + encodeURIComponent(JSON.stringify(data) + '\n');
        httpOptions.headers['content-length'] = dataStr.length;
        httpOptions.headers['content-type']   = 'application/x-www-form-urlencoded';
    }
    var responseData = '';
    var req = http.request(httpOptions, function (res) {
        res.on('data', function (chunk) {
            responseData += chunk;
        }).on('end', function () {
            if (responseData.exception) {
                cb(responseData.exception, null, req.headers);
            } else {
                cb(null, responseData, req.headers);
            }
        }).on('close', function () {
            res.emit('end');
        });
    });
    req.on('error', function (e) {
        cb(e, null, req.headers);
    });
    req.write(dataStr);
    req.end();
};

TIService.prototype._requestJSON = function (URL, options, /* Object */ query, cb) {
    this._request(URL, options, query, function (err, data, headers) {
        if (err) { return cb(err); }

        var response;
        try {
            response = JSON.parse(data);
        } catch (e) {
            // remove invalid control characters and try again
            try {
                response = JSON.parse(String(data).replace(/[\u0000-\u001f]/g, ''));
            } catch (e2) {
                // still not working? give up
                process.stderr.write('Could not parse response: ' + data);
                process.stderr.write('    headers: ' + headers);
                return cb(e2);
            }
        }

        // catch TI-specific exception
        if (response.exception) {
            return cb(Error(response.exception + ', query: ' + JSON.stringify(query)));
        }

        cb(null, response);
    });
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

