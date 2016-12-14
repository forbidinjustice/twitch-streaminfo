'use strict';
const GoogleSpreadsheet = require('google-spreadsheet');
const logger = require('winston');
const request = require('request');
const config = require('../config');
const moment = require('moment-timezone');
const myEvents = require('./events');

let my_sheet;
let my_sheet_creds;

module.exports = function Save(app) {
  my_sheet_creds = require(config.highlights.googleCredsFilePath);
  my_sheet = new GoogleSpreadsheet(config.highlights.googleSheetID);

  app.app.get('/highlight', (req, res) => {
    logger.info(`Request: ${req.url}`);
    const query = req.query.q ? req.query.q : '';
    recordHighlight(query, response => {
      res.send(response ? response : 'There was an error saving that moment. BibleThump');
    });
  });
};

function recordHighlight(query, callback) {
  const uri = `https://api.twitch.tv/kraken/streams/${config.twitch.channel.replace('#', '')}` +
    `?client_id=${config.twitch.client_id}`;
  logger.debug(uri);
  fetch(uri)
    .then(body => {
      if (body.stream === null) {
        callback('The stream is offline. Unable to save.');
        return;
      }
      const game = body.stream.game;
      const title = body.stream.channel.status;
      const streamStart = moment(body.stream.created_at).tz('America/Los_Angeles').format('YYYY-MM-DD h:mma z');
      const d = moment.duration(moment() - moment(body.stream.created_at)
          .add(config.highlights.alterTimeStampSeconds, 's'))._data;
      const clipStart = `${d.hours}h${`0${d.minutes}`.slice(-2)}m${`0${d.seconds}`.slice(-2)}s`;
      const vUri = `https://api.twitch.tv/kraken/channels/${config.twitch.channel.replace('#', '')}` +
        `/videos?broadcasts=true&client_id=${config.twitch.client_id}`;
      logger.debug(vUri);
      fetch(vUri)
        .then(vBody => {
          logger.debug(JSON.stringify(vBody, null, 2));
          const recording = vBody.videos.filter(x => x.status === 'recording');
          logger.debug(JSON.stringify(recording, null, 2));
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
            Notes: query,
            'Stream Title': title,
          }, err => {
            if (err) {
              logger.error(err);
              callback(false);
              return;
            }
            callback(`That '${game}' moment was saved. PogChamp${pbURL ? ` ${pbURL}` : ''}`);
          });
        });
      }
    })
    .catch(err => {
      logger.error(err);
      callback(false);
    });
}

function fetch(uri) {
  return new Promise((resolve, reject) => {
    request.get({
      url: encodeURI(uri),
      json: true,
    }, (err, res, body) => {
      if (err || res.statusCode !== 200) {
        reject(err || res.statusCode);
      } else {
        resolve(body);
      }
    });
  });
}

myEvents.on('clip', data => {
  const name = data.userstate['display-name'] || data.userstate.username;
  const uri = `https://api.twitch.tv/kraken/streams/${config.twitch.channel.replace('#', '')}` +
    `?client_id=${config.twitch.client_id}`;
  logger.debug(uri);
  fetch(uri)
    .then(body => {
      if (body.stream === null) return;
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
          Notes: `${data.source} from: ${name}`,
          'Stream Title': title,
          'Clip Start Time': clipStart,
        }, err => {
          if (err) logger.error(err);
        });
      });
    }).catch(logger.error);
});
