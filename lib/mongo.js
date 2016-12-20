'use strict';
const mongoose = require('mongoose');
const url = require('url');
const logger = require('winston');
const config = require('../config');

mongoose.Promise = global.Promise;

module.exports = function Mongo() {
  // Connect to the mongoDB
  mongoose.connect(config.mongo.uri, err => {
    if (err) {
      logger.error('Error connecting to the mongoDB', err);
    } else {
      logger.info(`connected to mongoDB: '${url.parse(config.mongo.uri).pathname.split('/').reverse()[0]}'`);
    }
  });

  // Last Tips
  const tipsSchema = new mongoose.Schema({
    amount: String,
    created_at: String,
    donation_id: String,
    email: String,
    message: String,
    name: String,
  }, {
    collection: 'tips',
    capped: { max: 25, size: 1000000 },
  });
  const tips = mongoose.model('tips', tipsSchema);

  // Last Subscribers
  const subscribersSchema = new mongoose.Schema({
    username: String,
    months: Number,
    message: String,
    date: Date,
    method: Object,
  }, {
    collection: 'subscribers',
    capped: { max: 25, size: 1000000 },
  });
  const subscribers = mongoose.model('subscribers', subscribersSchema);

  // Last Cheers
  const cheersSchema = new mongoose.Schema({
    username: String,
    bits: Number,
    message: String,
    date: Date,
  }, {
    collection: 'cheers',
    capped: { max: 25, size: 1000000 },
  });
  const cheers = mongoose.model('cheers', cheersSchema);

  // Last New Sub
  const lastNewSubSchema = new mongoose.Schema({
    username: String,
  }, {
    collection: 'last_new_sub',
    capped: { max: 1, size: 1000000 },
  });
  const lastNewSub = mongoose.model('last_new_sub', lastNewSubSchema);

  // Queue Lists
  const queuesSchema = new mongoose.Schema({
    queue: String,
    normalized: String,
    modified: Date,
    names: [String],
  }, {
    collection: 'queues',
  });
  const queues = mongoose.model('queues', queuesSchema);

  // Twitch Clip / Oddshot links
  const clipsSchema = new mongoose.Schema({
    uri: String,
  }, {
    collection: 'clips',
  });
  const clips = mongoose.model('clips', clipsSchema);

  return {
    subscribers,
    cheers,
    lastNewSub,
    queues,
    tips,
    clips,
  };
};
