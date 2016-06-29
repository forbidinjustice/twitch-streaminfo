'use strict';
const utils = require('./utils.js')(),
    tmi = require("tmi.js"),
    request = require('request');

module.exports = function (options, app) {

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
        options.status.twitch = true;
        app.emit('status', options.status); //Update status
    });

    //Disconnected from Twitch IRC for some reason
    twitch.on("disconnected", (reason) => {
        utils.log("disconnected from Twitch: " + JSON.stringify(reason));
        options.status.twitch = false;
        options.status.nightbot = false;
        app.emit('status', options.status); //Update status
    });

    //Roomstate changed for our connected Twitch channel
    twitch.on("roomstate", (channel, roomstate) => {
        utils.log("roomstate change for " + channel);
        if (roomstate['emote-only'] != null) options.status['emote-only'] = roomstate['emote-only'];
        if (roomstate['subs-only'] != null) options.status['subs-only'] = roomstate['subs-only'];
        if (roomstate.slow != null) options.status.slow = roomstate.slow;
        app.emit('status', options.status); //Update status
    });

    //A resub event occurred in Twitch chat
    twitch.on("resub", function (channel, username, months, message) {
        utils.log(username + " has resubbed for " + months + " months [" + message + "]");
        subEvent(username, months, message);
    });

    //A new subscription event occurred in Twitch chat
    twitch.on("subscription", function (channel, username) {
        utils.log(username + " just subscribed");
        subEvent(username);
    });

    //A cheer event occurred in Twitch chat
    twitch.on("cheer", function (channel, userstate, message) {
        //TODO: Store Cheer events
        let username = userstate.display_name ? userstate.display_name : userstate.username; //Use display_name if available
        utils.log(username + " has cheered with " + userstate.bits + " bit(s) [" + message + "]");
        app.emit("cheer", {
            bits: userstate.bits,
            name: username,
            message: message
        });
    });

    //Our mod bot was modded in our channel
    twitch.on("mod", (channel, username) => {
        if (username.toLowerCase() != options.mod_bot_name.toLowerCase()) return;
        utils.log(username + " joined the channel (modded)");
        options.status.bot = true;
        app.emit('status', options.status); //Update status
    });

    //Our mod bot was unmodded in our channel
    twitch.on("unmod", (channel, username) => {
        if (username.toLowerCase() != options.mod_bot_name.toLowerCase()) return;
        utils.log(username + " parted the channel (unmodded)");
        options.status.bot = false;
        app.emit('status', options.status); //Update status
    });

    //Someone hosted our channel
    twitch.on("hosted", function (channel, username, viewers) {
        utils.log(username + " hosted the channel: +" + viewers + " viewer(s)");
        getDisplayName(username, (name) => {
            app.emit('host', {
                username: name,
                viewers: viewers
            });
        });
    });

    //Handle new sub and resub events
    function subEvent(username, months, message) {
        //TODO: Store Sub events
        app.emit('subscription', {
            username: username,
            months: months,
            message: message
        });
    }
    
    //Get display_name from Twitch API or return username
    function getDisplayName(username, callback) {
        request.get({
            url: "https://api.twitch.tv/kraken/channels/" + username.toLowerCase(),
            json: true
        }, (err, res, body) => {
            if (!err && res.statusCode == 200) {
                callback(body.display_name ? body.display_name : username);
            } else {
                callback(username);
            }
        });
    }

    //Connect to Twitch IRC
    twitch.connect();
};
