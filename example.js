'use strict';
var app = require('./lib');

var options = {
    port: 3000, //The port this script will bind to
    page_title: "Stream Info", //This sets the browser page's Title (Tab Title)
    twitch: {
        nick: "", //Your Twitch Username
        oauth: "", //Your oauth token. Generate at: http://www.twitchapps.com/tmi/
        channel: "" //The twitch channel to monitor
    },
    //This sets the bot name in the page's status bar and is what we monitor for mod/unmod messages to see if it's in-channel
    mod_bot_name: "NightBot"
};

app = new app(options);
