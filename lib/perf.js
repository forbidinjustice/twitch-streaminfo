'use strict';
const logger = require('winston');

setTimeout(check, 1000 * 15);
setInterval(check, 1000 * 60 * 60);

function check() {
  logger.info(`RAM: ${(process.memoryUsage().rss / 1024 / 1024).toFixed(2)}MB`);
}
