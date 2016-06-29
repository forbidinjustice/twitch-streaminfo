'use strict';
var app = require('./lib');

var options = {
    port: 3000, //The port this script will bind to
    page_title: "Stream Info", //Browser page's Title (Tab Title)
    twitch: {
        nick: "", //Your Twitch Username
        oauth: "", //Your oauth token. Generate at: http://www.twitchapps.com/tmi/
        channel: "", //The twitch channel to monitor
        client_id: "" //A Twitch app's client ID to avoid any rate limits - Optional
    }
};

app = new app(options);
