'use strict';
const utils = require('./utils.js')(),
    tmi = require("tmi.js"),
    request = require('request'),
    moment = require('moment');

module.exports = function (options, app, mongo) {

    //Correctly format connection credentials
    options.twitch.nick = options.twitch.nick.toLowerCase();
    options.twitch.channel = (options.twitch.channel.indexOf('#') != 0 ? "#" + options.twitch.channel : options.twitch.channel).toLowerCase();
    options.twitch.oauth = options.twitch.oauth.replace("oauth:", "");

    //Create Twitch status object
    options.twitch.status = {
        emoteonly: false,
        r9kbeta: false,
        slow: false,
        subscribers: false
    };

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
        app.io.emit('status', {twitch: true}); //Update status
        app.io.emit('twitch_status', options.twitch.status); //Update Twitch status
        //TODO: Yellow status if not mod
    });

    //Disconnected from Twitch IRC for some reason
    twitch.on("disconnected", (reason) => {
        utils.log("disconnected from Twitch: " + JSON.stringify(reason));
        options.status.twitch = false;
        app.io.emit('status', {twitch: false}); //Update status
    });

    //Roomstate changed for our connected Twitch channel
    twitch.on("roomstate", (channel, roomstate) => {
        if (!roomstate['broadcaster-lang']) return; //This field is only supplied on first connect (Unless streamer changes language I suppose)
        utils.log("roomstate change for " + channel);
        if (roomstate['emote-only'] != null) options.twitch.status.emoteonly = roomstate['emote-only'];
        if (roomstate.r9k != null) options.twitch.status.r9kbeta = roomstate.r9k;
        if (roomstate.slow != null) options.twitch.status.slow = roomstate.slow;
        if (roomstate['subs-only'] != null) options.twitch.status.subscribers = roomstate['subs-only'];
        app.io.emit('twitch_status', options.twitch.status); //Update Twitch status
    });

    //Channel toggled Emotes Only Mode
    twitch.on("emoteonly", function (channel, enabled) {
        utils.log("emoteonly in " + channel + ": " + enabled);
        options.twitch.status.emoteonly = enabled;
        app.io.emit('twitch_status', {emoteonly: enabled});
    });

    //Channel toggled R9K Mode
    twitch.on("r9kbeta", function (channel, enabled) {
        utils.log("r9k in " + channel + ": " + enabled);
        options.twitch.status.r9kbeta = enabled;
        app.io.emit('twitch_status', {r9kbeta: enabled});
    });

    //Channel toggled Slow Mode
    twitch.on("slowmode", function (channel, enabled, length) {
        utils.log("slowmode in " + channel + ": " + enabled + (enabled ? ": " + length + " seconds" : ""));
        options.twitch.status.slow = enabled ? length : enabled;
        app.io.emit('twitch_status', {slow: enabled ? length : enabled});
    });

    //Channel toggled Subscribers Mode
    twitch.on("subscribers", function (channel, enabled) {
        utils.log("sub-mode in " + channel + ": " + enabled);
        options.twitch.status.subscribers = enabled;
        app.io.emit('twitch_status', {subscribers: enabled});
    });

    //Our mod bot was modded in our channel
    twitch.on("mod", (channel, username) => {
        if (username.toLowerCase() != options.mod_bot_name.toLowerCase()) return;
        utils.log(username + " joined the channel (modded)");
        options.status.bot = true;
        app.io.emit('status', {bot: true}); //Update status
    });

    //Our mod bot was unmodded in our channel
    twitch.on("unmod", (channel, username) => {
        if (username.toLowerCase() != options.mod_bot_name.toLowerCase()) return;
        utils.log(username + " parted the channel (unmodded)");
        options.status.bot = false;
        app.io.emit('status', {bot: false}); //Update status
    });

    //A resub event occurred in Twitch chat
    twitch.on("resub", function (channel, username, months, message) {
        utils.log(username + " has resubbed for " + months + " months [" + message + "]");
        subEvent(username, months, message);
    });

    //A new subscription event occurred in Twitch chat
    twitch.on("subscription", function (channel, username) {
        utils.log(username + " just subscribed");
        let entry = new mongo.lastNewSub({username: username});
        entry.save();
        subEvent(username);
    });

    //A cheer event occurred in Twitch chat
    twitch.on("cheer", function (channel, userstate, message) {
        let username = userstate.display_name ? userstate.display_name : userstate.username; //Use display_name if available
        utils.log(username + " has cheered with " + userstate.bits + " bit(s) [" + message + "]");
        let data = {
            username: username,
            bits: userstate.bits,
            message: message,
            date: moment()['_d']
        };
        app.io.emit("cheer", data);
        let entry = new mongo.cheers(data);
        entry.save();
    });

    //Someone hosted our channel
    twitch.on("hosted", function (channel, username, viewers) {
        utils.log(username + " hosted the channel: +" + viewers + " viewer(s)");
        getDisplayName(username, (name) => {
            app.io.emit('host', {
                username: name,
                viewers: viewers
            });
        });
    });

    //Handle new sub and resub events
    function subEvent(username, months, message) {
        let data = {
            username: username,
            months: months,
            message: message,
            date: moment()
        };
        app.io.emit('subscription', data);
        let entry = new mongo.subscribers(data);
        entry.save();
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

    //Twitch command sent from client page
    app.io.on('connection', (socket) => {
        socket.on('command', (data) => {
            twitch.say(options.twitch.channel, data.command);
        });

        socket.on('get_bit_badges', () => {
            request.get({
                url: "https://badges.twitch.tv/v1/badges/global/display",
                json: true
            }, (err, res, body) => {
                if (!err && res.statusCode == 200) socket.emit('bit_badges', body['badge_sets'].bits.versions);
            });
        });
    });

    return {
        getDisplayName: getDisplayName
    }
};
