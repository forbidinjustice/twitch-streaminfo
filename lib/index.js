'use strict';
var app = require('./server.js'),
    twitch = require('./twitch.js'),
    mongo = require('./mongo.js'),
    tips = require('./tips.js');

module.exports = function (options) {

    //Create Status object
    options.status = {
        bot: false,
        'emote-only': false,
        r9k: false,
        slow: false,
        'subs-only': false,
        twitch: false,
        twitchalerts: false
    };

    mongo = mongo(options);
    app = app(options, mongo);
    twitch = twitch(options, app, mongo);
    tips = tips(options, app);
};
