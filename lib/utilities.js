'use strict';
const request = require('request');

module.exports = {
  fetchJSON: (uri) => new Promise((resolve, reject) => {
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
  }),

  displayName: (username, display_name) => {
    if (username.toLowerCase() !== display_name.toLowerCase()) {
      return username;
    } else {
      return display_name || username;
    }
  },
};
