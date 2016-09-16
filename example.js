'use strict';
var app = require('./lib');

var options = {
    port: 3000, //The port this script will bind to
    page_title: "Stream Info", //This sets the browser page's Title (Tab Title),
    //This sets the bot name in the page's status bar and is what we monitor for mod/unmod messages to see if it's in-channel
    mod_bot_name: "NightBot",
    twitch: {
        nick: "", //Your Twitch Username
        oauth: "", //Your oauth token. Generate at: http://www.twitchapps.com/tmi/
        channel: "", //The twitch channel to monitor
        client_id: "" //A Twitch App client_id for making Twitch API calls
    },
    streamlabs: {
        access_token: "" //Access token for streamlabs api with donations.read scope
    },
    mongo: {
        //MongoDB uri. mLab.com is a great 'DB as a service' site and has free tiers available for small traffic applications and testing
        uri: ""
    },
    queues: {
        default_next_shown: 3 //How many names to show by default when !q next is used
    }
};

app = new app(options);
