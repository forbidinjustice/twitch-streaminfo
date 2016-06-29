'use strict';
var app = require('./lib');

var options = {
    port: 3000, //The port this script will bind to
    page_title: "Stream Info", //Browser page's Title (Tab Title)
    twitch: {
        nick: "", //Your Twitch Username
        oauth: "", //Your oauth token. Generate at: http://www.twitchapps.com/tmi/
        channel: "" //The twitch channel to monitor
    },
    mod_bot_name: "NightBot" //This sets the name in the page's status bar and is what we monitor for mod/unmod messages to see if it's in-channel
};

app = new app(options);
