'use strict';
const config = require('../config');
const fs = require('fs');
const logger = require('winston');
const moment = require('moment');

module.exports = function Logger() {
  const logDir = 'log';
  const logLevel = config.debug ? 'debug' : 'info';

  // Create log directory if it does not exist
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir);
  }

  // Log to console
  logger.remove(logger.transports.Console);
  logger.add(logger.transports.Console, {
    colorize: true,
    level: logLevel,
    timestamp: getCurrentTime(),
  });

  // Log to file
  logger.add(require('winston-daily-rotate-file'), {
    datePattern: 'yyyy-MM-dd',
    filename: `${logDir}/-results.log`,
    json: false,
    level: logLevel,
    prepend: true,
    timestamp: getCurrentTime(),
  });

  return logger;
};

function getCurrentTime() {
  return moment().utc().format();
}
