var http = require('http'),
    url  = require('url');

var Sharing = exports.Sharing = function (config) {
    this._config  = config;
    this._enabled = !!config.enabled;
};

Sharing.prototype.updateQuestion = function (question, cb) {
    if (!this._enabled) { return; }
    if (question.finalized) {
        this.send(question, cb);
    }
};

Sharing.prototype.send = function (question, cb) {
    var data = JSON.stringify({
        secret: this._config.secret,
        id: question._id,
        data: question
    });

    var parsed = url.parse(this._config.address),
        httpOptions = {
        hostname: parsed.hostname,
        port:     parsed.port,
        path:     parsed.path,
        method:   'POST',
        headers: {
            'content-type':  'application/json'
        }
    };
    var request = http.request(httpOptions);
    request.addListener('response', function (r) {
        cb(null, r);
    });
    request.addListener('error', function (e) {
        cb(e);
    });

    request.write(data);
    request.end();
};
