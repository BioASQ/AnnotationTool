var winston = require('winston');
var mongoDB = require('winston-mongodb').MongoDB;
var path = require('path');
var config = require(path.join(__dirname, '..', 'config')).defaults;

var singleton = function singleton() {

    this.logger = new (winston.Logger)({
        transports: [
          new (winston.transports.Console)({
              level: config.logging.level,
          }),

          new winston.transports.MongoDB({
              host: config.database.host,
              port: config.database.port,
              db: config.database.name,
              level: config.logging.level,
              silent: false // Where is it?
          })
        ],

        exceptionHandlers: [
            new winston.transports.File({
                filename: path.join(__dirname, '..', '..', config.logging.exceptionsFile)
            })
        ]
    });

    if (singleton.caller != singleton.getInstance) {
        throw new Error("This object cannot be instanciated");
    }
}

singleton.instance = null;

singleton.getInstance = function () {
    if (this.instance === null)
        this.instance = new singleton();
    return this.instance;
}

module.exports = singleton.getInstance();

//
// var logger = new require('./logging.js').logger;
// logger.info(logger === logger2);