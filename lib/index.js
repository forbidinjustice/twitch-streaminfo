'use strict';
var app = require('./server.js'),
    twitch =  require('./twitch.js');

module.exports = function (options) {
    app = app(options);
    twitch = twitch(options, app);
};
