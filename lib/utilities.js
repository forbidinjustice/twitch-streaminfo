'use strict';
const request = require('request');

module.exports = {
  fetchTwitch: (uri) => new Promise((resolve, reject) => {
    request.get({
      headers: {
        Accept: 'application/vnd.twitchtv.v5+json',
      },
      url: encodeURI(uri),
      json: true,
    }, (err, res, body) => {
      if (err || res.statusCode !== 200) {
        reject(err || res.statusCode);
      } else {
        resolve(body);
      }
    });
  }),
};
