'use strict';
const utils = require('./utils.js')(),
    tmi = require("tmi.js");

module.exports = function (options, app) {

    //Create Twitch Status object
    options.twitch.status = {
        twitch: false,
        nightbot: false,
        'subs-only': false,
        slowmode: false,
        'emote-only': false
    };

    //Correctly format connection credentials
    options.twitch.nick = options.twitch.nick.toLowerCase();
    options.twitch.channel = (options.twitch.channel.indexOf('#') != 0 ? "#" + options.twitch.channel : options.twitch.channel).toLowerCase();
    options.twitch.oauth = options.twitch.oauth.replace("oauth:", "");

    //Set Twitch tmi options
    var tmiOptions = {
        options: {
            debug: false
        },
        connection: {
            reconnect: true,
            secure: true
        },
        identity: {
            username: options.twitch.nick,
            password: options.twitch.oauth
        },
        channels: [options.twitch.channel]
    };

    //Instantiate new Twitch IRC client
    var twitch = new tmi.client(tmiOptions);

    //Successful connection to Twitch IRC
    twitch.on('connected', (server, port) => {
        utils.log("connected to: " + server + ":" + port);
        utils.log("connected to Twitch channel " + options.twitch.channel + " as '" + options.twitch.nick + "'");
        options.twitch.status.twitch = true;
        app.emit('status', options.twitch.status); //Update status
    });

    //Disconnected from Twitch IRC for some reason
    twitch.on("disconnected", (reason) => {
        utils.log("disconnected from Twitch: " + JSON.stringify(reason));
        options.twitch.status.twitch = false;
        options.twitch.status.nightbot = false;
        app.emit('status', options.twitch.status); //Update status
    });

    twitch.on("roomstate", (channel, roomstate) => {
        utils.log("roomstate change for " + channel);
        console.log(roomstate);
        if (roomstate['emote-only'] != null) options.twitch.status['emote-only'] = roomstate['emote-only'];
        if (roomstate['subs-only'] != null) options.twitch.status['subs-only'] = roomstate['subs-only'];
        if (roomstate['slow'] != null) options.twitch.status['slow'] = roomstate['slow'];
        app.emit('status', options.twitch.status); //Update status
    });

    //Connect to Twitch IRC
    twitch.connect();
};
