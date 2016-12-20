'use strict';
const logger = require('./logger')();
const config = require('../config');

let app = require('./server.js');
let twitch = require('./twitch.js');
let mongo = require('./mongo.js');
const utils = require('./utilities');
require('./perf');

// Create Status object
config.status = {
  bot: false,
  streamlabs: false,
  twitch: false,
  revlo: false,
};
logger.debug(config.status);

config.twitch.channel = config.twitch.channel.replace('#', '').toLowerCase();
const uri = `https://api.twitch.tv/kraken/users?login=${config.twitch.channel}` +
  `&client_id=${config.twitch.client_id}&api_version=5`;
logger.debug(uri);
utils.fetchJSON(uri)
  .then(result => {
    if (result._total > 0) {
      config.twitch.id = result.users[0]._id;
      logger.debug(config.twitch.id);
      mongo = mongo();
      app = app(mongo);
      twitch = twitch(app, mongo);
      require('./tips.js')(app, mongo);
      require('./queue.js')(app, mongo, twitch);
      const uptime = require('./uptime')();
      uptime.start(app);
      require('./games')(app);
      require('./highlight')(app);
    } else {
      logger.error(`Unable to get Twitch ID for ${config.twitch.channel}`);
    }
  }).catch(logger.err);
