'use strict';
const logger = require('winston');
const config = require('../config');
const moment = require('moment');
const myEvents = require('./events');
const utils = require('./utilities');
const util = require('util');

const status = {
  isOnline: false,
  showsOnline: false,
  timeStarted: null,
  timeStopped: null,
  body: null,
  isHosting: false,
  targetId: null,
  targetBody: null,
};

module.exports = function Uptime() {
  function start(app) {
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
  }

  function getStatus() {
    return status;
  }

  return {
    start,
    getStatus,
  };
};

function uptimeCheck() {
  const hostUri = `http://tmi.twitch.tv/hosts?include_logins=1&host=${config.twitch.id}` +
    `&client_id=${config.twitch.client_id}&api_version=5`;
  logger.debug(hostUri);
  utils.fetchJSON(hostUri)
    .then(hostBody => {
      let id;
      if (hostBody.hosts[0].target_id) {
        status.isHosting = true;
        status.targetId = hostBody.hosts[0].target_id;
        id = hostBody.hosts[0].target_id;
      } else {
        status.isHosting = false;
        status.targetId = null;
        id = config.twitch.id;
      }
      const streamUri = `https://api.twitch.tv/kraken/streams/${id}?client_id=${config.twitch.client_id}` +
        `&api_version=5`;
      logger.debug(streamUri);
      utils.fetchJSON(streamUri)
        .then(body => {
          logger.debug(util.inspect(body, { depth: 1, color: true }));
          if (status.isHosting) {
            status.targetBody = body;
            status.isOnline = false;
            status.showsOnline = false;
            status.timeStarted = null;
            status.timeStopped = null;
            body = null;
          } else {
            status.targetBody = null;
            status.body = body;
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
        }).catch(logger.error);
    }).catch(logger.error);
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
