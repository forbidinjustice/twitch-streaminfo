'use strict';
const logger = require('./logger')();
const config = require('../config');

let app = require('./server.js');
let twitch = require('./twitch.js');
let mongo = require('./mongo.js');
let tips = require('./tips.js');
let queue = require('./queue.js');

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
// tips = tips(app, mongo);
queue = queue(app, mongo, twitch);
