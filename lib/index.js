'use strict';
var app = require('./server.js'),
    twitch = require('./twitch.js'),
    mongo = require('./mongo.js'),
    tips = require('./tips.js');

module.exports = function (options) {

    //Create Status object
    options.status = {
        bot: false,
        twitchalerts: false,
        twitch: false
    };

    mongo = mongo(options);
    app = app(options, mongo);
    twitch = twitch(options, app, mongo);
    tips = tips(options, app);
};
