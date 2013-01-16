/* Using:

var logger = require('./logging.js').logger;
logger('info', 'test message', { anything: 'This is metadata logged as a native JSON object' });

Parameters:
1st : log level (string)
2nd : message (string)
3rd : [optional] (object with at least attribute "time", that is reserved and will be overridden)
*/
var winston = require('winston');
var mongoDB = require('winston-mongodb').MongoDB;
var path = require('path');
var config = require(path.join(__dirname, '..', 'config')).defaults;

var logging = function logging() {
    var self = this;

    // wrapper function
    this.logger = function (level, message, meta) {

        // gives the caller function name
        // console.log(arguments.callee.caller);

        var time = new Date().toTimeString();

        if (level && message) {
            if (meta && typeof meta === 'object') {

                if (meta.time)
                    console.error('loggings 3rd parameter has an attribute "time", that is reserved and will be overridden');

                meta.time = time;
                self._logger.log(level, message, meta);

            } else if (meta) {
                console.error('loggings 3rd parameter needs to be an object or will be ignored');
                self._logger.log(level, message, { time: time });
            }
            else {
                self._logger.log(level, message, { time: time });
            }
        }
    };

    // the winston logger
    this._logger = new (winston.Logger)({

        transports: [
          new (winston.transports.Console)({
              level: config.logging.level,
          }),
          new winston.transports.MongoDB({
              host: config.database.host,
              port: config.database.port,
              db: config.database.name,
              level: config.logging.level,
              //silent: false // Where is it?
          })
        ],

        exceptionHandlers: [
            new winston.transports.File({
                filename: path.join(__dirname, '..', '..', config.logging.exceptionsFile)
            })
        ]
    });
}

module.exports = new logging();
