'use strict';
const GoogleSpreadsheet = require('google-spreadsheet');
const logger = require('winston');
const config = require('../config');
const moment = require('moment-timezone');
const myEvents = require('./events');
const utils = require('./utilities');
const util = require('util');
const uptime = require('./uptime')();
const qs = require('querystring');

let my_sheet;
let my_sheet_creds;

module.exports = function Save(app) {
  my_sheet_creds = require(config.highlights.googleCredsFilePath);
  my_sheet = new GoogleSpreadsheet(config.highlights.googleSheetID);

  app.app.get('/highlight', (req, res) => {
    logger.info(`Request: ${req.url}`);
    const query = req.query.q ? req.query.q : '';
    const user = req.query.u ? req.query.u : '';
    recordHighlight(query, user, response => {
      res.send(response ? response : 'There was an error saving that moment. BibleThump');
    });
  });
};

function recordHighlight(query, user, callback) {
  const status = uptime.getStatus();
  const body = status.isHosting ? status.targetBody : status.body;
  if (!body) {
    callback(false);
    return;
  }
  if ((!status.isOnline && !status.isHosting) || body.stream === null) {
    callback('The stream is offline. Unable to save.');
    return;
  }
  const id = status.isHosting ? status.targetId : config.twitch.id;
  const game = body.stream.game;
  const title = body.stream.channel.status;
  const streamStart = moment(body.stream.created_at).tz('America/Los_Angeles').format('YYYY-MM-DD h:mma z');
  const d = moment.duration(moment() - moment(body.stream.created_at)
      .add(config.highlights.alterTimeStampSeconds, 's'))._data;
  const clipStart = `${(d.days * 24) + d.hours}h${`0${d.minutes}`.slice(-2)}m${`0${d.seconds}`.slice(-2)}s`;
  const uri = `https://api.twitch.tv/kraken/channels/${id}/videos?${qs.stringify({
    broadcast_type: 'archive',
    client_id: config.twitch.client_id,
    api_version: 5,
  })}}`;
  logger.debug(uri);
  utils.fetchJSON(uri)
    .then(videoBody => {
      logger.debug(util.inspect(videoBody, {}, 1));
      const recording = videoBody.videos.filter(x => x.status === 'recording');
      logger.debug(util.inspect(recording, {}, 1));
      if (recording[0]) {
        addToSheet(`${recording[0].url}?t=${clipStart}`);
      } else {
        addToSheet('Unable to locate past broadcast URL');
      }
    })
    .catch(vErr => {
      logger.error(vErr);
      addToSheet('Unable to locate past broadcast URL');
    });

  function addToSheet(pbURL) {
    my_sheet.useServiceAccountAuth(my_sheet_creds, error => {
      if (error) {
        logger.error(error);
        callback(false);
        return;
      }
      my_sheet.addRow(1, {
        'Date Added': moment().tz('America/Los_Angeles').format('YYYY-MM-DD h:mma z'),
        Game: game,
        'Stream Start Time': streamStart,
        Link: pbURL,
        'Clip Start Time': clipStart,
        Notes: `${user}: ${query}`,
        'Stream Title': title,
      }, err => {
        if (err) {
          logger.error(err);
          callback(false);
          return;
        }
        const hosted = status.isHosting ? 'hosted ' : '';
        callback(`That ${hosted}'${game}' moment was saved. PogChamp${pbURL ? ` ${pbURL}` : ''}`);
      });
    });
  }
}

myEvents.on('clip', data => {
  const status = uptime.getStatus();
  if (!status.isOnline && !status.isHosting) return;
  const name = utils.displayName(data.userstate.username, data.userstate['display-name']);
  const body = status.isHosting ? status.targetBody : status.body;
  if (!body || body.stream === null) return;
  const game = body.stream.game;
  const title = body.stream.channel.status;
  const streamStart = moment(body.stream.created_at).tz('America/Los_Angeles').format('YYYY-MM-DD h:mma z');
  const d = moment.duration(moment() - moment(body.stream.created_at)
      .add(config.highlights.alterTimeStampSeconds, 's'))._data;
  const clipStart = `${d.hours}h${`0${d.minutes}`.slice(-2)}m${`0${d.seconds}`.slice(-2)}s`;
  my_sheet.useServiceAccountAuth(my_sheet_creds, error => {
    if (error) {
      logger.error(error);
      return;
    }
    my_sheet.addRow(1, {
      'Date Added': moment().tz('America/Los_Angeles').format('YYYY-MM-DD h:mma z'),
      'Stream Start Time': streamStart,
      Game: game,
      Link: data.link,
      Notes: `${name}: ${data.message.replace(data.link, '<link>')}`,
      'Stream Title': title,
      'Clip Start Time': clipStart,
    }, err => {
      if (err) logger.error(err);
    });
  });
});
