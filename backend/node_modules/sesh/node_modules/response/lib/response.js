var http = require('http');

var _writeHead = http.ServerResponse.prototype.writeHead;

http.ServerResponse.prototype.setHeader = function (key, value) {
    this._additionalHeaders = this._additionalHeaders || {}; 
    this._additionalHeaders[key] = value;
};

http.ServerResponse.prototype.writeHead = function (status, headers) {
    var that = this;
    if (this._additionalHeaders) {
        Object.keys(this._additionalHeaders).forEach(function (k) {
            headers[k] = headers[k] || that._additionalHeaders[k];
        }); 
    }   
    _writeHead.call(this, status, headers);
};