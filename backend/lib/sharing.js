var http = require('http'),
    url  = require('url');

var Sharing = exports.Sharing = function (config) {
    this._config  = config;
    this._enabled = !!config.enabled;
};

Sharing.prototype.enabled = function () {
    return this._enabled;
};

Sharing.prototype.updateQuestion = function (question, cb) {
    if (!this._enabled) { return; }
    this.send(question, cb);
};

Sharing.prototype.removeQuestion = function (questionID, cb) {
    if (!this._enabled) { return; }
    this.send({ _id: questionID, publication: 'private' }, cb);
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
        r.addListener('close', function () {
            cb(null, data);
        });
        r.resume();
    });
    request.addListener('error', function (e) {
        cb(e);
    });

    request.write(data);
    request.end();
};
