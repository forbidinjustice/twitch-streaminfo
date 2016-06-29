'use strict';
var app = require('./server.js'),
    twitch =  require('./twitch.js');

module.exports = function (options) {

    //Create Status object
    options.status = {
        bot: false,
        'emote-only': false,
        slow: false,
        'subs-only': false,
        twitch: false,
        twitchalerts: false
    };

    app = app(options);
    twitch = twitch(options, app);
};
