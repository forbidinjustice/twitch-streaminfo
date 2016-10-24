'use strict';
const logger = require('./logger')();
const config = require('../config');

let app = require('./server.js');
let twitch = require('./twitch.js');
let mongo = require('./mongo.js');
require('./perf');

// Create Status object
config.status = {
  bot: false,
  streamlabs: false,
  twitch: false,
};
logger.debug(config.status);

mongo = mongo();
app = app(mongo);
twitch = twitch(app, mongo);
require('./tips.js')(app, mongo);
require('./queue.js')(app, mongo, twitch);
require('./uptime')(app);
require('./games')(app);
