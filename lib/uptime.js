'use strict';
const logger = require('winston');
const request = require('request');
const config = require('../config');
const moment = require('moment');
const myEvents = require('./events');

const status = {
  isOnline: false,
  showsOnline: false,
  timeStarted: null,
  timeStopped: null,
};

module.exports = function Uptime(app) {
  uptimeCheck();
  setInterval(uptimeCheck, 1000 * 60);

  app.app.get('/uptime', (req, res) => {
    logger.info(`Request: ${req.url}`);
    res.send(createUptimeResponse());
  });

  app.app.get('/timestamp', (req, res) => {
    logger.info(`Request: ${req.url}`);
    res.send(status.isOnline && status.timeStarted ? status.timeStarted : false);
  });
};

function uptimeCheck() {
  const uri = `https://api.twitch.tv/kraken/streams/${config.twitch.channel.replace('#', '')}` +
    `?client_id=${config.twitch.clientId}`;
  logger.debug(uri);
  request.get({
    url: encodeURI(uri),
    json: true,
  }, (err, res, body) => {
    if (err) {
      logger.error(err);
    }
    if (!err && res.statusCode === 200) {
      logger.debug(JSON.stringify(body, null, 2));
      if (body.stream) {
        // Twitch sees channel as actively streaming
        status.showsOnline = true;
        myEvents.emit('add_game', body.stream.game);
        if (status.isOnline) {
          status.timeStopped = null;
        } else {
          // Save that streamer is live
          status.isOnline = true;
          // Save stream start time
          status.timeStarted = moment(body.stream.created_at).utc().format();
        }
      } else {
        // Twitch does not sees channel as actively streaming
        status.showsOnline = false;
        // Don't need to do anything if we are already set to offline
        if (!status.isOnline) {
          return;
        }
        if (status.timeStopped) {
          if (moment() > moment(status.timeStopped).add(config.uptime.minutesBeforeReset, 'm')) {
            // Enough time has past. Streamer likely has stopped streaming for the day.
            status.isOnline = false;
            status.timeStarted = null;
            status.timeStopped = null;
          }
        } else {
          // First stored stream drop
          status.timeStopped = moment();
        }
      }
    }
  });
}

function createUptimeResponse() {
  if (!status.showsOnline || !status.timeStarted) {
    return 'The stream is currently offline.';
  }
  let str = 'The stream has been live for';
  const duration = moment.duration(moment() - moment(status.timeStarted));
  if (duration._data.days > 0) {
    str += ` ${duration._data.days}`;
    str += duration._data.days === 1 ? ' day' : ' days';
    if (duration._data.hours > 0) {
      str += duration._data.minutes === 0 ? ' and' : ',';
    }
  }
  if (duration._data.hours > 0) {
    str += ` ${duration._data.hours}`;
    str += duration._data.hours === 1 ? ' hour' : ' hours';
  }
  if ((duration._data.hours > 0 || duration._data.days > 0) && duration._data.minutes > 0) {
    str += ' and';
  }
  if (duration._data.minutes > 0 ||
    (duration._data.days === 0 && duration._data.hours === 0 && duration._data.minutes === 0)) {
    str += ` ${duration._data.minutes}`;
    str += duration._data.minutes === 1 ? ' minute' : ' minutes';
  }
  str += '.';
  return str;
}
