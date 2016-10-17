'use strict';
const request = require('request');
const config = require('../config');
const logger = require('winston');

module.exports = function Tips(app, mongo) {
  let lastID = '';

  mongo.tips.find({}, (err, results) => {
    if (!err && results.length !== 0) {
      lastID = results[results.length - 1].donation_id;
      poll();
      setInterval(poll, 15 * 1000);
    } else {
      const uri = `https://streamlabs.com/api/v1.0/donations?limit=25&currency=USD&access_token=` +
        `${config.streamLabs.accessToken}`;
      request.get({
        url: encodeURI(uri),
        json: true,
      }, (e, res, body) => {
        if (!e && res.statusCode === 200) {
          lastID = body.data[body.data.length - 1].donation_id;
        } else {
          logger.error(e);
        }
        poll();
        setInterval(poll, 15 * 1000);
      });
    }
  });

  // Poll twitch alerts for new tips after the last recorded tip id
  function poll() {
    const uri = `https://streamlabs.com/api/v1.0/donations?after=${lastID}` +
      `&currency=USD&access_token=${config.streamLabs.accessToken}`;
    request.get({
      url: encodeURI(uri),
      json: true,
    }, (err, res, body) => {
      if (!err && res.statusCode === 200) {
        if (!config.status.streamlabs) {
          logger.info('connected to streamlabs');
          config.status.streamlabs = true;
          app.io.emit('status', { streamlabs: true });
        }
        if (body.data.length === 0) {
          return;
        }
        lastID = body.data[0].donation_id;
        const tips = body.data.reverse();
        app.io.emit('tip', tips);
        tips.forEach(tip => {
          const entry = mongo.tips(tip);
          entry.save();
        });
      } else {
        logger.info('bad response from streamlabs');
        if (config.status.streamlabs) {
          config.status.streamlabs = false;
          app.io.emit('status', { streamlabs: false });
        }
      }
    });
  }
};
