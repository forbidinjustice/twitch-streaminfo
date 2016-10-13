'use strict';
const utils = require('./utils')();

setTimeout(check, 1000 * 60);
setInterval(check, 1000 * 60 * 60);

function check() {
  utils.log(`RAM: ${(process.memoryUsage().rss / 1024 / 1024).toFixed(2)}MB`);
}
