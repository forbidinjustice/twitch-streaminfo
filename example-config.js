'use strict';
module.exports = {
  // This sets the bot name in the page's status bar and is what we monitor if it's in-channel
  modBotName: 'NightBot',
  // Show RevloBot Status on page
  revloBot: true,
  // MongoDB uri
  mongo: {
    uri: '',
  },
  // This sets the browser page's Title (Tab Title)
  pageTitle: 'Stream Info',
  // The port this script will bind to
  port: 3000,
  queues: {
    // How many names to show by default when !q next is used
    defaultNextShown: 3,
  },
  streamLabs: {
    // Access token for streamlabs api with donations.read scope
    accessToken: '',
  },
  twitch: {
    // The twitch channel to monitor
    channel: '',
    // A Twitch App client_id for making Twitch API calls
    client_id: '',
    // Your Twitch Username
    nick: '',
    // Your oauth token. Generate at: http://www.twitchapps.com/tmi/
    oauth: '',
  },
  uptime: {
    minutesBeforeReset: 15,
  },
  games: {
    count: 5,
  },
};
